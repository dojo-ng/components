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
 * `<dj-tree>` — a hierarchical tree from `nodes`. Each node may carry an `icon` (a registered
 * icon name) and a `count` (a trailing badge, e.g. an unread count). Selection is controlled by
 * `value` (a node id) and emits `dj-select`; expansion is controlled by `expanded` (an array of
 * node ids) and emits `dj-expand-change`. The component knows nothing about what the tree holds —
 * a file tree, a mail folder list, or a MIME structure are all just nodes.
 *
 * A row click selects; the chevron expands. Set `expand-on-row-click` when the tree has rows that
 * exist only to contain others, where selecting one means nothing and the click would be dead.
 *
 * Keyboard follows the APG tree pattern with a roving tabindex: exactly one row is tabbable (the
 * selected row if visible, else the first visible row), and the arrow keys move focus without
 * selecting. Down/Up walk the visible rows; Right expands a closed parent, steps into an open one,
 * and does nothing on a leaf; Left collapses an open parent or moves to the parent row; Home/End
 * jump to the first/last visible row; Enter or Space selects the focused row. Indentation is a
 * logical `margin-inline-start`, so it flips in RTL, and the chevron mirrors with the reading
 * direction. Deferred (not built): drag-drop, virtualization, checkboxes, lazy loading.
 *
 * Slots: none (content comes from `nodes`).
 * Parts: `row` (a node's clickable line), `chevron`, `label`, `count`.
 * Events: `dj-select` (detail `{ id }`); `dj-expand-change` (detail `{ id, expanded, expandedIds }`).
 *
 * @cssprop [--dj-tree-indent=1.1rem] - Indentation added per nesting level.
 * @cssprop [--dj-tree-count-color=var(--dj-color-text-muted)] - Color of the trailing count badge.
 */
export class DjTree extends DojoElement {
	static override version = "0.2.0";
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
			/* Forced colors: the selected row's tint collapses, so use the system selected pair. */
			@media (forced-colors: active) {
				.row--selected { background: Highlight; color: HighlightText; }
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

	/** The row that currently holds the roving tabindex. */
	@state() private activeId = "";

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
			<div class="row ${selected ? "row--selected" : ""}" part="row">
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
		return html`<ul role="tree">${this.nodes.map((n) => this.#renderNode(n, 1))}</ul>`;
	}
}
export default DjTree;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-select": CustomEvent<{ id: string }>;
		"dj-expand-change": CustomEvent<{ id: string; expanded: boolean; expandedIds: string[] }>;
	}
}
