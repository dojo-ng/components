import { html, css, nothing, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { Virtualizer, elementScroll, observeElementOffset, observeElementRect } from "@tanstack/virtual-core";
import DojoElement, { reducedMotion } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import { getHistory, whenHistory, type NavigateDetail, type NavLocation, type TrailEntry } from "@dojo-ng/history/handle";
import "@dojo-ng/icon";
import { flattenTree, isLazy, type VisRow } from "./flatten.js";
import { dropZone, dragIds, isUnder, type DropPosition } from "./move.js";
import { computeChecks, pendingParents, toggleCheck, type Checks } from "./check.js";

export interface TreeNode {
	id: string;
	label: string;
	children?: TreeNode[];
	/** A registered icon name (see `@dojo-ng/icon`), shown before the label. */
	icon?: string;
	/** A trailing count badge (e.g. an unread count). */
	count?: number;
	/**
	 * Marks a node whose children are fetched when it is first opened. A node with `hasChildren: true`
	 * and no `children` shows a chevron; opening it emits `dj-load-children`, and the app answers with
	 * `setChildren(id, nodes)`.
	 */
	hasChildren?: boolean;
	/**
	 * The app path this node stands for when the tree has `track`. Without it, the path is derived:
	 * the tree's `base-path`, then the ids from the root down to this node, joined with `/`.
	 */
	path?: string;
}

/** Where a tracked node sits: its resolved path, its label, and its parent, for trails and lookups. */
interface PathInfo {
	path: string;
	label: string;
	parentId: string | null;
}

const EN: Record<string, string> = {
	treeLoading: "Loading…",
	treeLoadFailed: "Couldn't load. Retry",
	treeDragMany: "{count} items",
};
registerDefaults("dj", EN);

/** A chip naming what moves, used as the drag image. The browser snapshots it during
 *  `dragstart`, so it can be removed on the next tick. */
function setDragImage(dt: DataTransfer, text: string) {
	if (typeof dt.setDragImage !== "function" || typeof document === "undefined") return;
	const chip = document.createElement("div");
	chip.textContent = text;
	chip.setAttribute("aria-hidden", "true");
	chip.style.cssText = [
		"position:fixed", "top:-1000px", "left:-1000px", "max-width:20rem",
		"overflow:hidden", "text-overflow:ellipsis", "white-space:nowrap",
		"padding:0.25rem 0.6rem", "border-radius:999px",
		"font:500 0.8125rem/1.4 var(--dj-font-sans, system-ui, sans-serif)",
		"background:var(--dj-color-primary-600, #2563eb)", "color:var(--dj-color-text-on-primary, #fff)",
	].join(";");
	document.body.appendChild(chip);
	dt.setDragImage(chip, 12, 12);
	setTimeout(() => chip.remove(), 0);
}

/** Row height used until the first row is measured. */
const ESTIMATED_ROW_HEIGHT = 28;
/** Rows rendered beyond each edge of the viewport while virtual. */
const OVERSCAN = 8;
/** Rows rendered before a virtual tree has been laid out (no viewport size yet). */
const UNSIZED_ROWS = 20;

/** TanStack Virtual reads `process.env.NODE_ENV` when a virtualizer is built. A bundler defines it;
 *  a page loading the packages straight from a CDN does not, so give it the production value. */
function ensureProcessEnv() {
	const g = globalThis as { process?: { env?: Record<string, string | undefined> } };
	if (!g.process) g.process = { env: { NODE_ENV: "production" } };
	else if (!g.process.env) g.process.env = { NODE_ENV: "production" };
}

/**
 * `<dj-tree>` — a hierarchical tree built from `nodes`.
 *
 * The tree knows nothing about what it shows: a file tree, a mail folder list, and a MIME
 * structure are all just nodes. Each node can carry an `icon` (a name registered with
 * `registerIcon` or `registerIcons` from `@dojo-ng/icon`) and a `count`, shown as a trailing
 * badge such as an unread count.
 *
 * #### Selection and expansion
 * - Both are controlled. `value` is the selected node id, and the tree emits `dj-select`.
 * - `expanded` is the array of open node ids, and the tree emits `dj-expand-change`.
 * - Clicking a row selects it; clicking the chevron expands or collapses it.
 * - Set `expand-on-row-click` to make a click on a parent row also expand or collapse it. Use it
 *   when some rows exist only to hold others, so a click on them does something visible.
 *
 * #### Keyboard
 * The tree follows the APG tree pattern. Only one row is a tab stop: the selected row if it is
 * visible, otherwise the first visible row. The arrow keys move focus without selecting.
 * - Down and Up move through the visible rows.
 * - Right expands a closed parent, moves into an open one, and does nothing on a leaf.
 * - Left collapses an open parent, or moves to the parent row.
 * - Home and End jump to the first and last visible row.
 * - Enter or Space selects the focused row.
 *
 * #### Right-to-left
 * - Indentation uses `margin-inline-start`, so it flips in a right-to-left page, and the chevron
 *   points in the reading direction.
 *
 * #### Dropping onto rows
 * - Set `canDrop` to make the tree a target for native HTML5 drag and drop. It is called during a
 *   drag with a row id and the drag's `dataTransfer.types` (the only part of a payload the browser
 *   shows before the drop), and returns whether that row accepts it. Unset, the tree ignores drags.
 * - The row under the pointer that accepts the drag is marked: the `row--drop-target` part and a
 *   built-in outline. A refused row is not marked and the cursor shows the drop is not allowed.
 * - Resting on a collapsed parent for `spring-delay` ms (default 800; 0 turns it off) during a drag
 *   expands it, through the same path as a chevron click, so `dj-expand-change` fires. It stays
 *   open after the drop.
 * - A drop emits `dj-drop` with `{ id, dataTransfer }`. The tree does not select the row; the
 *   consumer reads its payload from `dataTransfer` and applies the change.
 * - Dragging has no keyboard form. A consumer that offers drop must offer another way to do the
 *   same thing (WCAG 2.5.7), such as a Move command with a picker.
 *
 * #### Tracking navigation
 * Set `track` and the tree and `@dojo-ng/history` follow each other, with no route table to write.
 * - Each node has a path: its own `path` if it sets one, otherwise `base-path` plus the ids from the
 *   root down to the node, joined with `/` (each id URI-encoded). A tree with `base-path="/explore"`
 *   gives the node `hr` > `comp` > `pay` the path `/explore/hr/comp/pay`.
 * - Selecting a row (click, Enter, or Space) emits `dj-navigate` with `{ path, label, trail }`
 *   alongside `dj-select`. `trail` is the nodes from the root to this one, each as `{ path, label }`,
 *   and ends up in the history entry, so it survives Back, Forward, and a reload in the same tab.
 * - When the location changes, the tree selects the node whose path matches it (an exact match, else
 *   the node with the longest path that is a prefix of the location) and expands that node's
 *   ancestors, emitting `dj-expand-change` for each. This is what makes Back reselect the right row.
 *   It does not emit `dj-navigate`, because that would loop. It does not emit `dj-select` either.
 * - If the location has no `trail` (a deep link, or a pasted URL), the tree adds the matched node's
 *   trail to the history entry, so a `dj-back-button` in `up` mode can name the parent.
 * - Ctrl-click, Cmd-click, or middle-click on a row opens its path in a new tab. Rows stay
 *   `treeitem`s and not links, because a focusable link inside a treeitem would break the tree's
 *   roving focus. Two nodes with the same path: the first in tree order wins.
 * - `track` needs `@dojo-ng/history` installed. Without it nothing is tracked and nothing throws.
 *
 * #### Long trees
 * - Above `virtual-threshold` visible rows (default 200) the tree is virtual: only the rows in view
 *   (plus the focused one) are in the DOM, and the tree scrolls inside `--dj-tree-max-height`
 *   (20rem by default while virtual). Every row carries `aria-level`, `aria-setsize`, and
 *   `aria-posinset`, so assistive technology still knows its place among all of them.
 * - Rows have one height, measured from the first row. Keyboard, `track`, and Back all work on rows
 *   that are not rendered: the tree scrolls the active row into view first.
 *
 * #### Lazy children
 * - A node with `hasChildren: true` and no `children` shows a chevron. Opening it, by any route (the
 *   chevron, the keyboard, spring-open, an `expanded` the app sets, or `track`), emits
 *   `dj-load-children` with `{ id }` once, and the node shows a "Loading" row under it.
 * - The app answers with `setChildren(id, nodes)`. The tree stores `nodes` as that node's `children`
 *   and renders them. An empty array makes the node a leaf. Answers can arrive in any order and any
 *   time; one for a node that no longer exists is ignored (the method returns false).
 * - On failure the app calls `setChildren(id, null, { error })`. The row under the node becomes a
 *   retry row; Enter, Space, or a click on it emits `dj-load-children` again.
 * - With `track`, a location below an unloaded node opens that node and so asks for its children;
 *   when they arrive the tree matches again and goes one level deeper, so a deep link emits one
 *   load per level, in order, until the node is found.
 *
 * #### Checkboxes
 * - Set `checkable` to show a checkbox on every node. Checking is separate from selecting: Space
 *   toggles the check, Enter still selects, and clicking the box does not select the row.
 * - `checked` is the array of checked ids (controlled). Toggling updates it and emits
 *   `dj-check-change` with `{ id, checked, partial, pendingParents }`.
 * - Checking a parent checks every loaded node below it; unchecking clears them and the parent's
 *   own checked ancestors. A parent with loaded children shows what they show: all checked, some
 *   (`aria-checked="mixed"`), or none. An id in `checked` also checks everything loaded below it.
 * - `partial` lists the parents showing the mixed state. `pendingParents` lists checked lazy nodes
 *   whose children are not loaded; the tree cannot know what is below them, so the app resolves
 *   those on the server. Children that load later under a checked parent arrive checked.
 *
 * #### Dragging rows
 * - Set `draggable-rows` to make every row a drag source (native HTML5 drag and drop, so a row can
 *   land on this tree, another tree, a grid, or any page element that reads the drag). The drag
 *   carries a JSON array of node ids under `drag-type` (default `application/x-dojo-tree-rows`) and
 *   the labels as `text/plain`. The preview chip shows the label, or the count for several.
 * - A row that is not checked drags alone. With `checkable`, a checked row drags every checked row,
 *   top-most only (a checked parent carries what is below it); that is the multi-row drag.
 * - Within one tree the pointer picks where a drop lands: the top edge of a row is "before", the
 *   bottom edge "after", the middle "inside". The bottom edge of an open parent is "inside", since
 *   "after" would draw above its first child. A line marks before and after (parts
 *   `row--drop-before`, `row--drop-after`); "inside" uses `row--drop-target` as a drop does. A row can
 *   go "inside" a row that has children, or any row `canDrop` accepts. A drop on a dragged row or
 *   anything below it is refused.
 * - The tree emits `dj-move` with `{ ids, target, position }` and changes nothing; the app edits
 *   `nodes`. A drag from another tree or a grid is a plain drop: `canDrop` and `dj-drop` as above.
 * - Dragging has no keyboard form, as with drops. Offer a "Move…" command (WCAG 2.5.7).
 *
 * Slots: none (content comes from `nodes`).
 * Parts: `row` (a node's clickable line), `checkbox` (the box, with `checkable`), `loading` and `retry` (the line under an open lazy node, in addition to `row`), `row--drop-before` and `row--drop-after` (the row a drag within this tree would land above or below), `row--drop-target` (added to the row a drag would drop
 * on), `chevron`, `label`, `count`.
 * Events: `dj-select` (detail `{ id }`); `dj-expand-change` (detail `{ id, expanded, expandedIds }`);
 * `dj-check-change` (detail `{ id, checked, partial, pendingParents }`, only with `checkable`);
 * `dj-load-children` (detail `{ id }`);
 * `dj-move` (detail `{ ids, target, position }`, a drag within this tree); `dj-drop` (detail `{ id, dataTransfer }`); `dj-navigate` (detail `{ path, label, trail }`, only with `track`).
 *
 * @cssprop [--dj-tree-indent=1.1rem] - Indentation added per nesting level.
 * @cssprop [--dj-tree-max-height=20rem] - Height the tree scrolls at while virtual.
 * @cssprop [--dj-tree-count-color=var(--dj-color-text-muted)] - Color of the trailing count badge.
 */
export class DjTree extends DojoElement {
	static override version = "0.4.0";
	static override focusable = true;
	static override styles = [
		css`
			:host { display: block; }
			ul { list-style: none; margin: 0; padding: 0; }
			.tree--virtual { max-height: var(--dj-tree-max-height, 20rem); overflow: auto; position: relative; }
			.tree--virtual::after { content: ""; display: block; height: var(--dj-tree-total, 0); }
			.tree--virtual > .treeitem { position: absolute; top: 0; inset-inline: 0; height: var(--dj-tree-row-height, auto); box-sizing: border-box; }
			.treeitem { display: block; }
			.treeitem:focus { outline: none; }
			.row {
				display: flex;
				align-items: center;
				gap: 0.25rem;
				padding: 0.2rem 0.35rem;
				border-radius: var(--dj-input-border-radius-small, 0.1875rem);
				cursor: pointer;
				color: var(--dj-color-text, #1f2937);
				margin-inline-start: calc(var(--dj-tree-indent, 1.1rem) * var(--level, 0));
			}
			.tree--virtual .row { height: 100%; box-sizing: border-box; }
			.row:hover { background: var(--dj-color-neutral-100, #f3f4f6); }
			.row--selected {
				background: var(--dj-color-primary-100, #dbeafe);
				color: var(--dj-color-primary-700, #1d4ed8);
			}
			/* The row is the visual line; focus lives on the treeitem, so ring the row from it. */
			.treeitem:focus-visible > .row {
				outline: var(--dj-focus-ring, 2px solid currentColor);
				outline-offset: -2px;
			}
			.chev {
				display: inline-flex;
				flex: 0 0 auto;
				width: 1rem;
				transition: transform var(--dj-transition-x-fast, 100ms);
			}
			.chev--open { transform: rotate(90deg); }
			/* Closed chevron points along the reading direction; mirror it in RTL. */
			.chev--rtl { transform: rotate(180deg); }
			.row--status { cursor: default; font-style: italic; color: var(--dj-tree-count-color, var(--dj-color-text-muted, #6b7280)); }
			.row--status[part~="retry"] { cursor: pointer; font-style: normal; color: var(--dj-color-primary-700, #1d4ed8); text-decoration: underline; }
			.box {
				flex: 0 0 auto;
				box-sizing: border-box;
				width: 1rem;
				height: 1rem;
				display: inline-flex;
				align-items: center;
				justify-content: center;
				border: 1px solid var(--dj-color-neutral-500, #6b7280);
				border-radius: 0.2rem;
				background: var(--dj-color-background, #fff);
				color: var(--dj-color-background, #fff);
			}
			.box svg { width: 0.8rem; height: 0.8rem; }
			.box--on, .box--mixed {
				background: var(--dj-color-primary-600, #2563eb);
				border-color: var(--dj-color-primary-600, #2563eb);
			}
			.row--before { box-shadow: inset 0 2px 0 var(--dj-color-primary-600, #2563eb); }
			.row--after { box-shadow: inset 0 -2px 0 var(--dj-color-primary-600, #2563eb); }
			.spacer { width: 1rem; flex: 0 0 auto; display: inline-block; }
			.nicon { flex: 0 0 auto; }
			.label { flex: 1 1 auto; min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
			.count {
				flex: 0 0 auto;
				margin-inline-start: auto;
				padding-inline: 0.4em;
				font-size: 0.85em;
				color: var(--dj-tree-count-color, var(--dj-color-text-muted, #6b7280));
			}
			/* The row a drag would drop on: the selected tint plus an inset ring, so it reads even
			   when the drop target is the selected row. */
			.row--drop {
				background: var(--dj-color-primary-100, #dbeafe);
				color: var(--dj-color-primary-700, #1d4ed8);
				box-shadow: inset 0 0 0 2px var(--dj-color-primary-600, #2563eb);
			}
			/* Forced colors: the selected row's tint collapses, so use the system selected pair. */
			@media (forced-colors: active) {
				.row--selected { background: Highlight; color: HighlightText; }
				.box { border-color: CanvasText; }
				.box--on, .box--mixed { background: Highlight; color: HighlightText; border-color: Highlight; }
				.row--before, .row--after { box-shadow: none; outline: 2px solid Highlight; outline-offset: -2px; }
				.row--drop { background: Highlight; color: HighlightText; outline: 2px solid CanvasText; outline-offset: -2px; }
			}
		`,
		reducedMotion,
	];

	/** The tree data. */
	@property({ type: Array }) nodes: TreeNode[] = [];
	/** The selected node id. */
	@property() value = "";
	/** The expanded node ids (controlled). Toggling updates this and emits `dj-expand-change`. */
	@property({ type: Array }) expanded: string[] = [];
	/**
	 * Expand or collapse a parent when its row is clicked, not only its chevron. Off by default,
	 * because a row click means "select" in a tree whose rows are all selectable. Turn it on when
	 * some rows exist only to contain others — an account above its mail folders, a directory above
	 * its files — where clicking the row would otherwise do nothing at all. Selection still happens
	 * and `dj-select` still fires; this only adds the toggle. Leaf rows are unaffected.
	 */
	@property({ attribute: "expand-on-row-click", type: Boolean, reflect: true })
	expandOnRowClick = false;

	/**
	 * Makes the tree a drop target. Called during a drag with a row id and the drag's
	 * `dataTransfer.types`; return true when that row accepts the drop. Unset: the tree ignores drags.
	 */
	@property({ attribute: false }) canDrop?: (id: string, types: readonly string[]) => boolean;

	/** Milliseconds a drag must rest on a collapsed parent before it expands. 0 turns this off. */
	@property({ attribute: "spring-delay", type: Number }) springDelay = 800;

	/**
	 * Follow and drive the navigation history: selecting a row emits `dj-navigate`, and the location
	 * selects and expands the matching row. Needs `@dojo-ng/history` installed.
	 */
	@property({ type: Boolean }) track = false;

	/** Show a checkbox on every node. Checking is separate from selecting. */
	@property({ type: Boolean, reflect: true }) checkable = false;

	/** The checked node ids (controlled). Toggling updates this and emits `dj-check-change`. */
	@property({ type: Array }) checked: string[] = [];

	/** Make every row a drag source. See "Dragging rows". */
	@property({ attribute: "draggable-rows", type: Boolean, reflect: true }) draggableRows = false;

	/** The MIME type the dragged ids are written under, so a drop target can recognise them. */
	@property({ attribute: "drag-type" }) dragType = "application/x-dojo-tree-rows";

	/** Visible rows above which the tree renders only the rows in view. */
	@property({ type: Number, attribute: "virtual-threshold" }) virtualThreshold = 200;

	/** With `track`, the path every derived node path starts with, such as `/explore`. */
	@property({ attribute: "base-path" }) basePath = "";

	/** The row that currently holds the roving tabindex. */
	@state() private activeId = "";
	/** The row a drag would drop on, or "". */
	@state() private dropId = "";
	/** Where on `dropId` the drop would land. */
	@state() private dropPos: DropPosition = "inside";
	/** The drag that started in a tree, for the one it started in (the payload is unreadable until the drop). */
	static #drag?: { tree: DjTree; ids: string[] };
	#springId = "";
	#springTimer: ReturnType<typeof setTimeout> | undefined;
	/** A drag that ends anywhere (dropped elsewhere, or Escape) must clear the mark. */
	#onDocDragEnd = () => this.#endDrag();
	#onDocDragFinish = () => { if (DjTree.#drag?.tree === this) DjTree.#drag = undefined; };

	#i18n = new LocaleController(this);
	#msg(key: string): string {
		return messages.resolve("dj", this.#i18n.locale, key) ?? EN[key] ?? key;
	}
	/** Tracked nodes by id, and node id by path. Rebuilt when `nodes`, `base-path`, or `track` change. */
	#info = new Map<string, PathInfo>();
	#byPath = new Map<string, string>();
	#location?: NavLocation;
	#unsubscribe?: () => void;
	#visible: VisRow[] = [];
	#parentOf = new Map<string, string>();
	#openSet = new Set<string>();
	#indexOf = new Map<string, number>();
	#loading = new Set<string>();
	#failed = new Map<string, string>();
	#keepIndex = false;
	#toEmit: string[] = [];
	#checks: Checks = { checked: new Set(), partial: new Set() };
	#stale = false;
	#byId?: Map<string, TreeNode>;
	#virtualizer?: Virtualizer<HTMLElement, Element>;
	#virtualCleanup?: () => void;
	#rowHeight = ESTIMATED_ROW_HEIGHT;
	#rowMeasured = false;
	#lastRevealed = "";

	/** True while the tree renders only the rows in view (more visible rows than `virtual-threshold`). */
	get virtual(): boolean { return this.#visible.length > this.virtualThreshold; }

	protected override willUpdate(changed: Map<PropertyKey, unknown>) {
		let synced = false;
		if (changed.has("nodes") || changed.has("basePath") || changed.has("track")) {
			this.#indexPaths();
			if (changed.has("track")) {
				if (this.track) this.#follow();
				else this.#stop();
			}
			synced = this.#syncLocation();
		}
		if (this.checkable && (changed.has("nodes") || changed.has("checked") || changed.has("checkable"))) {
			this.#checks = computeChecks(this.nodes, this.checked);
		}
		if (changed.has("nodes") && !this.#keepIndex) this.#byId = undefined;
		this.#keepIndex = false;
		if (synced || this.#stale || changed.has("nodes") || changed.has("expanded") || changed.has("value")) {
			this.#stale = false;
			this.#recompute();
		}
		if (this.virtual) {
			ensureProcessEnv();
			this.#virtualizer ??= this.#makeVirtualizer();
			this.#virtualizer.setOptions({ ...this.#virtualizer.options, count: this.#visible.length });
		} else {
			this.#dropVirtualizer();
		}
	}

	protected override updated() {
		this.#requestLoads();
		const v = this.#virtualizer;
		if (!v) { this.#lastRevealed = ""; return; }
		if (!this.#virtualCleanup) this.#virtualCleanup = v._didMount();
		v._willUpdate();
		this.#measureRow();
		if (this.activeId !== this.#lastRevealed) {
			this.#lastRevealed = this.activeId;
			this.#reveal(this.#indexOf.get(this.activeId) ?? -1);
		}
	}

	// ------------------------------------------------------------------ lazy children

	/** Ask the app for the children of every open lazy node not yet asked about. */
	#requestLoads() {
		const ids = this.#toEmit;
		if (!ids.length) return;
		this.#toEmit = [];
		for (const id of ids) this.emit("dj-load-children", { detail: { id } });
	}

	#nodeById(id: string): TreeNode | undefined {
		if (!this.#byId) {
			const map = new Map<string, TreeNode>();
			const walk = (list: readonly TreeNode[]) => { for (const n of list) { map.set(n.id, n); if (n.children) walk(n.children); } };
			walk(this.nodes);
			this.#byId = map;
		}
		return this.#byId.get(id);
	}

	/**
	 * Answer a `dj-load-children`: store `children` on the node `id` and render them. For a failed
	 * load pass `null` and `{ error }`; the node then shows a retry row. Returns false when no node
	 * has that id (the tree was replaced while the load ran), and then does nothing.
	 */
	setChildren(id: string, children: TreeNode[] | null, options: { error?: unknown } = {}): boolean {
		const node = this.#nodeById(id);
		if (!node) return false;
		this.#loading.delete(id);
		if (children === null) {
			const error = options.error;
			this.#failed.set(id, error instanceof Error ? error.message : typeof error === "string" ? error : "");
			this.#stale = true;
			this.requestUpdate();
			return true;
		}
		this.#failed.delete(id);
		node.children = children;
		const walk = (list: readonly TreeNode[]) => { for (const n of list) { this.#byId!.set(n.id, n); if (n.children) walk(n.children); } };
		walk(children);
		this.#keepIndex = true;
		this.nodes = [...this.nodes];
		return true;
	}

	#toggleCheck(id: string) {
		const checked = toggleCheck(this.nodes, this.checked, id);
		this.checked = checked;
		const { checked: set, partial } = computeChecks(this.nodes, checked);
		this.emit("dj-check-change", { detail: { id, checked, partial: [...partial], pendingParents: pendingParents(this.nodes, set) } });
	}

	#retry(id: string) {
		if (!this.#failed.delete(id)) return;
		this.#stale = true;
		this.requestUpdate();
	}

	// ------------------------------------------------------------------ virtual window

	get #list(): HTMLElement | null { return this.renderRoot.querySelector<HTMLElement>("ul.tree"); }

	#makeVirtualizer(): Virtualizer<HTMLElement, Element> {
		return new Virtualizer<HTMLElement, Element>({
			count: this.#visible.length,
			getScrollElement: () => this.#list,
			estimateSize: () => this.#rowHeight,
			overscan: OVERSCAN,
			scrollToFn: elementScroll,
			observeElementRect: (inst, cb) => observeElementRect(inst, () => {
				const el = inst.scrollElement;
				if (el) cb({ width: el.clientWidth, height: el.clientHeight });
			}),
			observeElementOffset,
			onChange: () => this.requestUpdate(),
		});
	}

	#dropVirtualizer() {
		this.#virtualCleanup?.();
		this.#virtualCleanup = undefined;
		this.#virtualizer = undefined;
		this.#rowMeasured = false;
	}

	/** Measure the first rendered row once and use its height for every row. */
	#measureRow() {
		if (this.#rowMeasured) return;
		const h = this.#list?.querySelector<HTMLElement>("li.treeitem")?.getBoundingClientRect().height ?? 0;
		if (h <= 0) return;
		this.#rowMeasured = true;
		if (Math.abs(h - this.#rowHeight) > 0.5) {
			this.#rowHeight = h;
			this.#virtualizer?.measure();
			this.requestUpdate();
			this.#lastRevealed = ""; // anything revealed with the estimate is now off
		}
	}

	/** The row indexes to render while virtual: the virtualizer's window plus the active row. */
	#windowRows(): number[] {
		const n = this.#visible.length;
		let rows = this.#virtualizer?.getVirtualIndexes() ?? [];
		if (!rows.length) rows = Array.from({ length: Math.min(n, UNSIZED_ROWS) }, (_, i) => i);
		const a = this.#indexOf.get(this.activeId) ?? -1;
		if (a >= 0 && !rows.includes(a)) rows = [...rows, a].sort((x, y) => x - y);
		return rows;
	}

	/** Scroll the tree (not the page) just enough to show row `i`. */
	#reveal(i: number) {
		const el = this.#list;
		if (!el || i < 0 || el.clientHeight === 0) return;
		const top = i * this.#rowHeight;
		if (top < el.scrollTop) el.scrollTop = top;
		else if (top + this.#rowHeight > el.scrollTop + el.clientHeight) el.scrollTop = top + this.#rowHeight - el.clientHeight;
	}

	/** Build the path-to-node index once per change to the nodes, not on every lookup. */
	#indexPaths() {
		this.#info = new Map();
		this.#byPath = new Map();
		if (!this.track) return;
		const base = this.basePath.replace(/\/+$/, "");
		const walk = (list: TreeNode[], parentId: string | null, ids: string[]) => {
			for (const node of list) {
				const own = [...ids, encodeURIComponent(node.id)];
				const path = this.#normalize(node.path ?? `${base}/${own.join("/")}`);
				this.#info.set(node.id, { path, label: node.label, parentId });
				if (!this.#byPath.has(path)) this.#byPath.set(path, node.id);
				if (node.children?.length) walk(node.children, node.id, own);
			}
		};
		walk(this.nodes, null, []);
	}

	#normalize(path: string): string {
		return path.replace(/\/+$/, "") || "/";
	}

	/** The node for a location path: an exact match, else the node with the longest path that is a prefix of it. */
	#match(locationPath: string): string | undefined {
		let path = this.#normalize(locationPath.split(/[?#]/)[0]);
		for (;;) {
			const id = this.#byPath.get(path);
			if (id !== undefined) return id;
			const cut = path.lastIndexOf("/");
			if (cut <= 0) return undefined;
			path = path.slice(0, cut);
		}
	}

	/** Root-to-node trail for a tracked node. */
	#trailOf(id: string): TrailEntry[] {
		const trail: TrailEntry[] = [];
		for (let at: string | null = id; at; at = this.#info.get(at)?.parentId ?? null) {
			const info = this.#info.get(at);
			if (!info) break;
			trail.unshift({ path: info.path, label: info.label });
		}
		return trail;
	}

	/**
	 * Select and reveal the node for the current location. Sets properties and emits
	 * `dj-expand-change`; never emits `dj-navigate` (that would loop). Returns whether it changed anything.
	 */
	#syncLocation(): boolean {
		const location = this.#location;
		if (!location || !this.track) return false;
		const id = this.#match(location.path);
		if (id === undefined) return false;
		let changed = false;
		if (this.value !== id) {
			this.value = id;
			changed = true;
		}
		this.activeId = id;
		const ancestors: string[] = [];
		for (let at = this.#info.get(id)?.parentId; at; at = this.#info.get(at)?.parentId) ancestors.unshift(at);
		for (const ancestor of ancestors) {
			if (this.expanded.includes(ancestor)) continue;
			const expandedIds = [...this.expanded, ancestor];
			this.expanded = expandedIds;
			this.emit("dj-expand-change", { detail: { id: ancestor, expanded: true, expandedIds } });
			changed = true;
		}
		// A location below a node whose children are not loaded: open it, which asks for them.
		const info = this.#info.get(id);
		const row = this.#nodeById(id);
		if (info && row && isLazy(row) && !this.expanded.includes(id) && this.#normalize(location.path.split(/[?#]/)[0]) !== info.path) {
			const expandedIds = [...this.expanded, id];
			this.expanded = expandedIds;
			this.emit("dj-expand-change", { detail: { id, expanded: true, expandedIds } });
			changed = true;
		}
		if (!location.trail) {
			const trail = this.#trailOf(id);
			// After the current publish has finished, and only if this is still the current location.
			queueMicrotask(() => {
				const instance = getHistory();
				if (instance && instance.current === location) instance.annotate({ trail });
			});
		}
		return changed;
	}

	/** Follow the location if history is (or later becomes) installed. */
	#follow() {
		if (!this.isConnected || !this.track || this.#unsubscribe) return;
		const instance = getHistory();
		if (instance) {
			this.#unsubscribe = instance.subscribe((location) => {
				this.#location = location;
				this.#syncLocation();
			});
		} else {
			// A WeakRef, so a tree removed before history is installed (it may never be) is not kept alive.
			const self = new WeakRef(this);
			void whenHistory().then(() => { const tree = self.deref(); if (tree) tree.#follow(); });
		}
	}

	#stop() {
		this.#unsubscribe?.();
		this.#unsubscribe = undefined;
		this.#location = undefined;
	}

	/** Open a tracked row in a new tab. Rows are treeitems, not links, so the browser cannot. */
	#openInNewTab(id: string): boolean {
		const info = this.#info.get(id);
		if (!this.track || !info) return false;
		window.open(getHistory()?.href(info.path) ?? info.path, "_blank", "noopener");
		return true;
	}

	/** Rebuild the flat visible-row list, the parent map, and validate the roving active row. */
	#recompute() {
		this.#openSet = new Set(this.expanded);
		const { rows: vis, parentOf, indexOf: index, needLoad } = flattenTree(this.nodes, this.#openSet, { loading: this.#loading, failed: this.#failed });
		this.#visible = vis;
		// Mark each as asked now, so this render shows it busy and no later pass asks again;
		// the events go out after the render.
		for (const id of needLoad) { this.#loading.add(id); this.#toEmit.push(id); }
		this.#parentOf = parentOf;
		this.#indexOf = index;
		if (!this.activeId || !index.has(this.activeId)) {
			this.activeId = this.value && index.has(this.value) ? this.value : (vis[0]?.id ?? "");
		}
	}

	override connectedCallback() {
		super.connectedCallback();
		document.addEventListener("dragend", this.#onDocDragEnd, true);
		document.addEventListener("drop", this.#onDocDragEnd, true);
		document.addEventListener("dragend", this.#onDocDragFinish);
		this.#follow();
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		this.#stop();
		document.removeEventListener("dragend", this.#onDocDragEnd, true);
		document.removeEventListener("drop", this.#onDocDragEnd, true);
		document.removeEventListener("dragend", this.#onDocDragFinish);
		this.#onDocDragFinish();
		this.#endDrag();
		this.#dropVirtualizer();
	}

	/** The treeitem a drag event is over, from its composed path (rows live in the shadow root). */
	#rowEl(e: Event): HTMLElement | null {
		for (const n of e.composedPath()) {
			if (n === this) break;
			const el = n as HTMLElement;
			if (el.classList?.contains("treeitem")) return el;
		}
		return null;
	}

	#accepts(id: string | null, e: DragEvent): id is string {
		if (id == null || !this.canDrop) return false;
		const types = e.dataTransfer ? Array.from(e.dataTransfer.types) : [];
		return this.canDrop(id, types);
	}

	/** True while a drag that started in this tree is under way. */
	get #ownDrag(): boolean { return DjTree.#drag?.tree === this; }

	/** Where a drag from this tree would land at the pointer, or null when it may not. */
	#landing(e: DragEvent, el: HTMLElement | null): { id: string; position: DropPosition } | null {
		const drag = DjTree.#drag;
		const id = el?.dataset.id;
		if (!drag || !el || id === undefined) return null;
		const row = this.#visible[this.#indexOf.get(id) ?? -1];
		if (!row || row.kind !== "node") return null;
		if (isUnder(id, new Set(drag.ids), this.#parentOf)) return null;
		const box = (el.querySelector(".row") ?? el).getBoundingClientRect();
		const fraction = box.height > 0 ? (e.clientY - box.top) / box.height : 0.5;
		const types = e.dataTransfer ? Array.from(e.dataTransfer.types) : [];
		const canInside = this.canDrop ? this.canDrop(id, types) : row.hasChildren;
		const position = dropZone(fraction, canInside, row.open);
		return position ? { id, position } : null;
	}

	/** dragenter and dragover: mark the accepting row, refuse the rest, and arm spring-loading. */
	#onDragOver(e: DragEvent) {
		const own = this.#ownDrag;
		if (!own && !this.canDrop) return;
		const el = this.#rowEl(e);
		const id = el?.dataset.id ?? null;
		if (own) {
			const land = this.#landing(e, el);
			if (land) e.preventDefault();
			if (e.dataTransfer) e.dataTransfer.dropEffect = land ? "move" : "none";
			if (this.dropId !== (land?.id ?? "")) this.dropId = land?.id ?? "";
			if (land && this.dropPos !== land.position) this.dropPos = land.position;
			this.#spring(id ?? "");
			return;
		}
		const ok = this.#accepts(id, e);
		if (ok) e.preventDefault();  // what makes a native drop legal here
		if (e.dataTransfer) e.dataTransfer.dropEffect = ok ? "move" : "none";
		if (this.dropId !== (ok ? id : "")) this.dropId = ok ? id : "";
		if (ok && this.dropPos !== "inside") this.dropPos = "inside";
		this.#spring(id ?? "");
	}

	#onDragLeave(e: DragEvent) {
		if (!this.canDrop && !this.#ownDrag) return;
		const to = e.relatedTarget as Node | null;
		if (to && (this.renderRoot.contains(to) || this.contains(to))) return;
		this.#endDrag();
	}

	#onDrop(e: DragEvent) {
		if (this.#ownDrag) {
			const land = this.#landing(e, this.#rowEl(e));
			const ids = DjTree.#drag!.ids;
			this.#endDrag();
			if (!land) return;
			e.preventDefault();
			this.emit("dj-move", { detail: { ids, target: land.id, position: land.position } });
			return;
		}
		if (!this.canDrop) return;
		const id = this.#rowEl(e)?.dataset.id ?? null;
		const ok = this.#accepts(id, e);
		this.#endDrag();
		if (!ok) return;
		e.preventDefault();
		this.emit("dj-drop", { detail: { id, dataTransfer: e.dataTransfer } });
	}

	#onDragStart(e: DragEvent, id: string) {
		const dt = e.dataTransfer;
		if (!this.draggableRows || !dt) return;
		const ids = dragIds(this.nodes, this.checkable ? this.#checks.checked : new Set(), id);
		const labels = ids.map((x) => this.#nodeById(x)?.label ?? x);
		const text = ids.length === 1 ? labels[0] : this.#msg("treeDragMany").replace("{count}", String(ids.length));
		dt.setData(this.dragType, JSON.stringify(ids));
		dt.setData("text/plain", labels.join("\n"));
		dt.effectAllowed = "move";
		setDragImage(dt, text);
		DjTree.#drag = { tree: this, ids };
		// The dragged row must stay rendered while a virtual tree scrolls under the drag, or the
		// browser never sends dragend.
		this.activeId = id;
	}

	#spring(id: string) {
		if (id === this.#springId) return;
		clearTimeout(this.#springTimer);
		this.#springTimer = undefined;
		this.#springId = id;
		const row = this.#visible[this.#indexOf.get(id) ?? -1];
		if (!this.springDelay || !row || !row.hasChildren || row.open) return;
		this.#springTimer = setTimeout(() => {
			this.#springTimer = undefined;
			if (this.#springId === id && !this.#openSet.has(id)) this.#toggle(id);
		}, this.springDelay);
	}

	#endDrag() {
		clearTimeout(this.#springTimer);
		this.#springTimer = undefined;
		this.#springId = "";
		if (this.dropId) this.dropId = "";
	}

	#toggle(id: string) {
		const open = this.#openSet.has(id);
		const expandedIds = open ? this.expanded.filter((x) => x !== id) : [...this.expanded, id];
		this.expanded = expandedIds;
		this.emit("dj-expand-change", { detail: { id, expanded: !open, expandedIds } });
	}

	#select(id: string) {
		this.activeId = id;
		this.value = id;
		this.emit("dj-select", { detail: { id } });
		const info = this.#info.get(id);
		if (this.track && info) {
			const detail: NavigateDetail = { path: info.path, label: info.label, trail: this.#trailOf(id) };
			this.emit("dj-navigate", { detail });
		}
	}

	/** Move the roving focus to `id` and focus its row once rendered. */
	#activate(id: string) {
		this.activeId = id;
		this.updateComplete.then(() => {
			if (this.virtual) this.#reveal(this.#indexOf.get(id) ?? -1);
			const rows = [...this.renderRoot.querySelectorAll<HTMLElement>("li.treeitem")];
			rows.find((r) => r.dataset.id === id)?.focus();
		});
	}

	#onKeydown(e: KeyboardEvent, id: string) {
		const vis = this.#visible;
		const idx = this.#indexOf.get(id) ?? -1;
		if (idx < 0) return;
		const cur = vis[idx];
		if (cur.kind !== "node") {
			// A loading or retry line: it only answers Enter and Space (retry) and the movement keys.
			if ((e.key === "Enter" || e.key === " ") && cur.kind === "error") { e.preventDefault(); this.#retry(cur.node.id); return; }
			if (e.key === "Enter" || e.key === " ") { e.preventDefault(); return; }
		}
		switch (e.key) {
			case "ArrowDown":
				if (idx < vis.length - 1) { e.preventDefault(); this.#activate(vis[idx + 1].id); }
				break;
			case "ArrowUp":
				if (idx > 0) { e.preventDefault(); this.#activate(vis[idx - 1].id); }
				break;
			case "Home":
				if (vis.length) { e.preventDefault(); this.#activate(vis[0].id); }
				break;
			case "End":
				if (vis.length) { e.preventDefault(); this.#activate(vis[vis.length - 1].id); }
				break;
			case "ArrowRight":
				if (cur.hasChildren) {
					e.preventDefault();
					if (!cur.open) this.#toggle(id);
					else if (vis[idx + 1]) this.#activate(vis[idx + 1].id); // first child is next visible
				}
				break;
			case "ArrowLeft":
				if (cur.hasChildren && cur.open) { e.preventDefault(); this.#toggle(id); }
				else {
					const p = this.#parentOf.get(id);
					if (p) { e.preventDefault(); this.#activate(p); }
				}
				break;
			case " ":
				e.preventDefault();
				if (this.checkable) this.#toggleCheck(id);
				else this.#select(id);
				break;
			case "Enter":
				e.preventDefault();
				this.#select(id);
				break;
		}
	}

	/** The line under an open lazy node: "Loading", or a retry button after a failed load. */
	#renderStatus(r: VisRow, top?: number): TemplateResult {
		const failed = r.kind === "error";
		const text = this.#msg(failed ? "treeLoadFailed" : "treeLoading");
		return html`<li
			role="treeitem"
			class="treeitem"
			data-id=${r.id}
			aria-level=${r.level}
			aria-setsize="1"
			aria-posinset="1"
			aria-disabled=${failed ? nothing : "true"}
			tabindex=${r.id === this.activeId ? "0" : "-1"}
			style=${top === undefined ? nothing : `transform:translateY(${top}px)`}
			@keydown=${(e: KeyboardEvent) => this.#onKeydown(e, r.id)}
			@click=${(e: MouseEvent) => { e.stopPropagation(); this.activeId = r.id; if (failed) this.#retry(r.node.id); }}
		>
			<div class="row row--status" part=${failed ? "row retry" : "row loading"} title=${(failed && this.#failed.get(r.node.id)) || nothing} style=${`--level:${r.level - 1}`}>
				<span class="spacer"></span>
				<span class="label">${text}</span>
			</div>
		</li>`;
	}

	/** The check box. Presentational: the treeitem holds focus and carries `aria-checked`. */
	#renderBox(id: string): TemplateResult {
		const on = this.#checks.checked.has(id);
		const mixed = this.#checks.partial.has(id);
		return html`<span
			class="box ${on ? "box--on" : mixed ? "box--mixed" : ""}"
			part="checkbox"
			aria-hidden="true"
			@click=${(e: Event) => { e.stopPropagation(); this.activeId = id; this.#toggleCheck(id); }}
		>${on
			? html`<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" /></svg>`
			: mixed ? html`<svg viewBox="0 0 24 24"><path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="3" /></svg>` : nothing}</span>`;
	}

	#renderRow(r: VisRow, top?: number): TemplateResult {
		if (r.kind !== "node") return this.#renderStatus(r, top);
		const node = r.node;
		const { hasChildren, open } = r;
		const selected = node.id === this.value;
		const rtl = this.#i18n.dir === "rtl";
		const chevClass = `chev ${open ? "chev--open" : rtl ? "chev--rtl" : ""}`;
		const here = node.id === this.dropId;
		const dropClass = !here ? "" : this.dropPos === "inside" ? "row--drop" : `row--${this.dropPos}`;
		const dropPart = !here ? "row" : this.dropPos === "inside" ? "row row--drop-target" : `row row--drop-${this.dropPos}`;
		return html`<li
			role="treeitem"
			class="treeitem"
			data-id=${node.id}
			draggable=${this.draggableRows ? "true" : nothing}
			@dragstart=${(e: DragEvent) => this.#onDragStart(e, node.id)}
			aria-level=${r.level}
			aria-setsize=${r.setSize}
			aria-posinset=${r.posInSet}
			aria-expanded=${hasChildren ? (open ? "true" : "false") : nothing}
			aria-selected=${selected ? "true" : nothing}
			aria-busy=${this.#loading.has(node.id) ? "true" : nothing}
			aria-checked=${this.checkable ? (this.#checks.checked.has(node.id) ? "true" : this.#checks.partial.has(node.id) ? "mixed" : "false") : nothing}
			tabindex=${node.id === this.activeId ? "0" : "-1"}
			style=${top === undefined ? nothing : `transform:translateY(${top}px)`}
			@keydown=${(e: KeyboardEvent) => this.#onKeydown(e, node.id)}
			@click=${(e: MouseEvent) => {
				e.stopPropagation();
				if ((e.ctrlKey || e.metaKey) && this.#openInNewTab(node.id)) {
					e.preventDefault();
					return;
				}
				this.#select(node.id);
				if (this.expandOnRowClick && hasChildren) this.#toggle(node.id);
			}}
			@auxclick=${(e: MouseEvent) => {
				e.stopPropagation();
				if (e.button === 1 && this.#openInNewTab(node.id)) e.preventDefault();
			}}
		>
			<div
				class="row ${selected ? "row--selected" : ""} ${dropClass}"
				part=${dropPart}
				style=${`--level:${r.level - 1}`}
			>
				${hasChildren
					? html`<span
							class=${chevClass}
							part="chevron"
							@click=${(e: Event) => { e.stopPropagation(); this.#toggle(node.id); }}
						><dj-icon size="small"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" /></svg></dj-icon></span>`
					: html`<span class="spacer"></span>`}
				${this.checkable ? this.#renderBox(node.id) : nothing}
				${node.icon ? html`<dj-icon class="nicon" type=${node.icon} size="small"></dj-icon>` : nothing}
				<span class="label" part="label">${node.label}</span>
				${node.count != null ? html`<span class="count" part="count">${node.count}</span>` : nothing}
			</div>
		</li>`;
	}

	/** The rows to render: all of them, or while virtual the window, each placed at its offset. */
	#renderRows(): unknown {
		if (!this.virtual) return repeat(this.#visible, (r) => r.id, (r) => this.#renderRow(r));
		const rows = this.#windowRows().map((i) => this.#visible[i]);
		return repeat(rows, (r) => r.id, (r) => this.#renderRow(r, this.#indexOf.get(r.id)! * this.#rowHeight));
	}

	override render() {
		const virtual = this.virtual;
		return html`<ul
			role="tree"
			class="tree ${virtual ? "tree--virtual" : ""}"
			style=${virtual ? `--dj-tree-total:${this.#visible.length * this.#rowHeight}px;--dj-tree-row-height:${this.#rowHeight}px` : nothing}
			@dragenter=${this.#onDragOver}
			@dragover=${this.#onDragOver}
			@dragleave=${this.#onDragLeave}
			@drop=${this.#onDrop}
		>${this.#renderRows()}</ul>`;
	}
}
export default DjTree;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-select": CustomEvent<{ id: string }>;
		"dj-expand-change": CustomEvent<{ id: string; expanded: boolean; expandedIds: string[] }>;
		"dj-load-children": CustomEvent<{ id: string }>;
		"dj-move": CustomEvent<{ ids: string[]; target: string; position: "before" | "after" | "inside" }>;
		"dj-check-change": CustomEvent<{ id: string; checked: string[]; partial: string[]; pendingParents: string[] }>;
		"dj-drop": CustomEvent<{ id: string; dataTransfer: DataTransfer | null }>;
		"dj-navigate": CustomEvent<NavigateDetail>;
	}
}
