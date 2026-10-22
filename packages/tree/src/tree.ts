import { html, css, nothing, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import DojoElement, { reducedMotion } from "@dojo-ng/dojo-element";
import { LocaleController } from "@dojo-ng/i18n";
import "@dojo-ng/icon";

export interface TreeNode {
	id: string;
	label: string;
	children?: TreeNode[];
	/** A registered icon name (see `@dojo-ng/icon`), shown before the label. */
	icon?: string;
	/** A trailing count badge (e.g. an unread count). */
	count?: number;
}

interface VisRow {
	id: string;
	node: TreeNode;
	level: number;
	hasChildren: boolean;
	open: boolean;
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
 * #### Not built
 * - Dragging tree rows, virtualization, checkboxes, and lazy loading.
 *
 * Slots: none (content comes from `nodes`).
 * Parts: `row` (a node's clickable line), `row--drop-target` (added to the row a drag would drop
 * on), `chevron`, `label`, `count`.
 * Events: `dj-select` (detail `{ id }`); `dj-expand-change` (detail `{ id, expanded, expandedIds }`);
 * `dj-drop` (detail `{ id, dataTransfer }`).
 *
 * @cssprop [--dj-tree-indent=1.1rem] - Indentation added per nesting level.
 * @cssprop [--dj-tree-count-color=var(--dj-color-text-muted)] - Color of the trailing count badge.
 */
export class DjTree extends DojoElement {
	static override version = "0.1.1";
	static override focusable = true;
	static override styles = [
		css`
			:host { display: block; }
			ul { list-style: none; margin: 0; padding: 0; }
			ul ul { margin-inline-start: var(--dj-tree-indent, 1.1rem); }
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
			}
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

	/** The row that currently holds the roving tabindex. */
	@state() private activeId = "";
	/** The row a drag would drop on, or "". */
	@state() private dropId = "";
	#springId = "";
	#springTimer: ReturnType<typeof setTimeout> | undefined;
	/** A drag that ends anywhere (dropped elsewhere, or Escape) must clear the mark. */
	#onDocDragEnd = () => this.#endDrag();

	#i18n = new LocaleController(this);
	#visible: VisRow[] = [];
	#parentOf = new Map<string, string>();
	#openSet = new Set<string>();

	protected override willUpdate(changed: Map<PropertyKey, unknown>) {
		if (changed.has("nodes") || changed.has("expanded") || changed.has("value")) {
			this.#recompute();
		}
	}

	/** Rebuild the flat visible-row list, the parent map, and validate the roving active row. */
	#recompute() {
		this.#openSet = new Set(this.expanded);
		const vis: VisRow[] = [];
		const parent = new Map<string, string>();
		const walk = (list: TreeNode[], level: number, parentId: string | null) => {
			for (const n of list) {
				const hasChildren = !!n.children?.length;
				const open = hasChildren && this.#openSet.has(n.id);
				vis.push({ id: n.id, node: n, level, hasChildren, open });
				if (parentId != null) parent.set(n.id, parentId);
				if (open) walk(n.children!, level + 1, n.id);
			}
		};
		walk(this.nodes, 1, null);
		this.#visible = vis;
		this.#parentOf = parent;
		const ids = new Set(vis.map((v) => v.id));
		if (!this.activeId || !ids.has(this.activeId)) {
			this.activeId = this.value && ids.has(this.value) ? this.value : (vis[0]?.id ?? "");
		}
	}

	override connectedCallback() {
		super.connectedCallback();
		document.addEventListener("dragend", this.#onDocDragEnd, true);
		document.addEventListener("drop", this.#onDocDragEnd, true);
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		document.removeEventListener("dragend", this.#onDocDragEnd, true);
		document.removeEventListener("drop", this.#onDocDragEnd, true);
		this.#endDrag();
	}

	/** The row id a drag event is over, from its composed path (rows live in the shadow root). */
	#rowOf(e: Event): string | null {
		for (const n of e.composedPath()) {
			if (n === this) break;
			const el = n as HTMLElement;
			if (el.classList?.contains("treeitem")) return el.dataset.id ?? null;
		}
		return null;
	}

	#accepts(id: string | null, e: DragEvent): id is string {
		if (id == null || !this.canDrop) return false;
		const types = e.dataTransfer ? Array.from(e.dataTransfer.types) : [];
		return this.canDrop(id, types);
	}

	/** dragenter and dragover: mark the accepting row, refuse the rest, and arm spring-loading. */
	#onDragOver(e: DragEvent) {
		if (!this.canDrop) return;
		const id = this.#rowOf(e);
		const ok = this.#accepts(id, e);
		if (ok) e.preventDefault();  // what makes a native drop legal here
		if (e.dataTransfer) e.dataTransfer.dropEffect = ok ? "move" : "none";
		if (this.dropId !== (ok ? id : "")) this.dropId = ok ? id : "";
		this.#spring(id ?? "");
	}

	#onDragLeave(e: DragEvent) {
		if (!this.canDrop) return;
		const to = e.relatedTarget as Node | null;
		if (to && (this.renderRoot.contains(to) || this.contains(to))) return;
		this.#endDrag();
	}

	#onDrop(e: DragEvent) {
		if (!this.canDrop) return;
		const id = this.#rowOf(e);
		const ok = this.#accepts(id, e);
		this.#endDrag();
		if (!ok) return;
		e.preventDefault();
		this.emit("dj-drop", { detail: { id, dataTransfer: e.dataTransfer } });
	}

	#spring(id: string) {
		if (id === this.#springId) return;
		clearTimeout(this.#springTimer);
		this.#springTimer = undefined;
		this.#springId = id;
		const row = this.#visible.find((v) => v.id === id);
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
	}

	/** Move the roving focus to `id` and focus its row once rendered. */
	#activate(id: string) {
		this.activeId = id;
		this.updateComplete.then(() => {
			const rows = [...this.renderRoot.querySelectorAll<HTMLElement>("li.treeitem")];
			rows.find((r) => r.dataset.id === id)?.focus();
		});
	}

	#onKeydown(e: KeyboardEvent, id: string) {
		const vis = this.#visible;
		const idx = vis.findIndex((v) => v.id === id);
		if (idx < 0) return;
		const cur = vis[idx];
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
			case "Enter":
			case " ":
				e.preventDefault();
				this.#select(id);
				break;
		}
	}

	#renderNode(node: TreeNode, level: number): TemplateResult {
		const hasChildren = !!node.children?.length;
		const open = hasChildren && this.#openSet.has(node.id);
		const selected = node.id === this.value;
		const rtl = this.#i18n.dir === "rtl";
		const chevClass = `chev ${open ? "chev--open" : rtl ? "chev--rtl" : ""}`;
		return html`<li
			role="treeitem"
			class="treeitem"
			data-id=${node.id}
			aria-level=${level}
			aria-expanded=${hasChildren ? (open ? "true" : "false") : nothing}
			aria-selected=${selected ? "true" : nothing}
			tabindex=${node.id === this.activeId ? "0" : "-1"}
			@keydown=${(e: KeyboardEvent) => this.#onKeydown(e, node.id)}
			@click=${(e: Event) => {
				e.stopPropagation();
				this.#select(node.id);
				if (this.expandOnRowClick && hasChildren) this.#toggle(node.id);
			}}
		>
			<div
				class="row ${selected ? "row--selected" : ""} ${node.id === this.dropId ? "row--drop" : ""}"
				part=${node.id === this.dropId ? "row row--drop-target" : "row"}
			>
				${hasChildren
					? html`<span
							class=${chevClass}
							part="chevron"
							@click=${(e: Event) => { e.stopPropagation(); this.#toggle(node.id); }}
						><dj-icon size="small"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" /></svg></dj-icon></span>`
					: html`<span class="spacer"></span>`}
				${node.icon ? html`<dj-icon class="nicon" type=${node.icon} size="small"></dj-icon>` : nothing}
				<span class="label" part="label">${node.label}</span>
				${node.count != null ? html`<span class="count" part="count">${node.count}</span>` : nothing}
			</div>
			${hasChildren && open
				? html`<ul role="group">${node.children!.map((c) => this.#renderNode(c, level + 1))}</ul>`
				: nothing}
		</li>`;
	}

	override render() {
		return html`<ul
			role="tree"
			@dragenter=${this.#onDragOver}
			@dragover=${this.#onDragOver}
			@dragleave=${this.#onDragLeave}
			@drop=${this.#onDrop}
		>${this.nodes.map((n) => this.#renderNode(n, 1))}</ul>`;
	}
}
export default DjTree;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-select": CustomEvent<{ id: string }>;
		"dj-expand-change": CustomEvent<{ id: string; expanded: boolean; expandedIds: string[] }>;
		"dj-drop": CustomEvent<{ id: string; dataTransfer: DataTransfer | null }>;
	}
}
