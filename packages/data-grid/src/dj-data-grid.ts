import { html, nothing, type TemplateResult } from "lit";
import { property, state, query } from "lit/decorators.js";
import { ref } from "lit/directives/ref.js";
import DojoElement from "@dojo-ng/dojo-element";
import {
	createTable, getCoreRowModel, getSortedRowModel, functionalUpdate,
	type Table, type TableOptionsResolved, type TableState, type ColumnDef, type Cell, type Header as TableHeader,
	type Row as TableRow, type SortingState, type RowSelectionState, type Updater, type AggregationFnOption,
} from "@tanstack/table-core";
import { Virtualizer, elementScroll, observeElementOffset, observeElementRect } from "@tanstack/virtual-core";
import type { DataGridPlugin, DataGridContext } from "./plugin.js";
import styles from "./dj-data-grid.styles.js";

export type Row = Record<string, unknown>;

// Reconcile a plain attribute map onto a row element across re-renders and virtualizer recycling:
// remove keys a plugin stopped returning, set the current ones. The `ref` callback runs every render.
const rowAttrKeys = new WeakMap<Element, Set<string>>();
function applyRowAttrs(el: Element, attrs: Record<string, string>) {
	const prev = rowAttrKeys.get(el);
	if (prev) for (const k of prev) if (!(k in attrs)) el.removeAttribute(k);
	for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
	rowAttrKeys.set(el, new Set(Object.keys(attrs)));
}

export interface GridColumn {
	id: string;
	header?: string;
	accessorKey?: string;
	sortable?: boolean;
	width?: string;
	/** Derive the cell value from the whole row (calculated columns). Maps to a TanStack
	 *  `accessorFn`. A row total is `compute: r => r.a + r.b`; no plugin needed. */
	compute?: (row: Row) => unknown;
	/** TanStack aggregation for this column when grouping (set by the groups plugin's columns()
	 *  hook; copied onto the ColumnDef). Core never sets it itself. */
	aggregationFn?: AggregationFnOption<Row>;
}
export type SelectionMode = "none" | "single" | "multiple";
/**
 * What a plain click / Enter on a row MEANS.
 *  - `"none"` (default): click and Space/Enter toggle selection — exactly the original behavior.
 *  - `"click"`: a single click activates the row (the mail/preview-pane idiom).
 *  - `"double"`: a double click activates it (the file-manager idiom).
 *
 * Under any non-`"none"` mode a plain click activates and does NOT toggle selection: opening a
 * row and selecting rows become separate gestures. Selection then comes from Space, from
 * modifier-clicks, and from a checkbox column (`@dojo-ng/data-grid-select`).
 */
export type ActivationMode = "none" | "click" | "double";

/**
 * `<dj-data-grid>` — a virtualized, sortable, selectable data grid built on TanStack Table
 * (column/sort/selection model) and TanStack Virtual (row virtualization). Core scope:
 * columns, in-memory `data`, sort, virtual rows, row selection, keyboard row navigation, and
 * calculated columns (`GridColumn.compute`). Filtering, pagination, inline editing, tree rows,
 * grouping, CSV export, and master-detail arrive as PLUGINS via the `plugins` property (plain
 * objects from factory functions; see {@link DataGridPlugin}). A bare grid with `plugins=[]`
 * behaves exactly as before. ARIA role=grid.
 *
 * `activation` separates opening a row from selecting rows: under `"click"` or `"double"` a plain
 * click activates and emits `dj-activate` instead of toggling selection, Enter activates while
 * Space still selects, and modifier-clicks stay reserved for selection. The default `"none"` keeps
 * the original behavior, so this is purely additive.
 *
 * `dj-range-change` reports which rows are rendered, so a consumer can window its data or load more
 * at the end of the list. The range INCLUDES the 8 overscan rows, so it is wider than what the user
 * can see — hence `rendered`, not "visible".
 *
 * Events: `dj-sort`, `dj-selection-change`, `dj-activate` (detail `{ row, index }`, where `row` is
 * the original row data), `dj-range-change` (detail `{ start, end, count, rendered }` — inclusive
 * first and last rendered row-model indices, the total row count, and the full index list; `start`
 * and `end` are -1 when nothing is rendered). Parts: `grid`, `head`, `row`, `cell`, `chrome-top`,
 * `chrome-bottom`, `subhead`.
 *
 * Printing (`window.print()` / File → Print): every row materializes into a genuine `<table>` with a
 * real `<thead>` (the plain, non-`renderDetail` row path only — see `@dojo-ng/data-grid-detail` for
 * that limitation), which browsers repeat natively across printed pages with no extra CSS. Verified
 * working, including cross-page header repeat, in Chromium. Known limitation, not yet worked around:
 * Safari (confirmed on a current 26.x release) does not repeat the `<thead>` across pages — a
 * longstanding WebKit print-engine gap with no reliable CSS-only fix.
 */
export class DjDataGrid extends DojoElement {
	static override styles = styles;
	static override version = "0.1.0";
	static override focusable = true;

	@property({ type: Array }) columns: GridColumn[] = [];
	@property({ type: Array }) data: Row[] = [];
	@property({ attribute: "selection-mode", reflect: true }) selectionMode: SelectionMode = "none";
	/** What a plain click / Enter on a row means. Default `"none"` = the original toggle behavior. */
	@property({ attribute: "activation", reflect: true }) activation: ActivationMode = "none";
	@property({ attribute: "row-height", type: Number }) rowHeight = 36;
	@property() height = "20rem";
	/** Plugin set. Set in JavaScript (rich data). Declared up front because TanStack row models
	 *  must exist at table creation; a post-mount change rebuilds the table. Default `[]`. */
	@property({ attribute: false }) plugins: DataGridPlugin[] = [];
	/** Optional stable row id accessor; defaults to row index. */
	getRowId?: (row: Row, index: number) => string;

	@state() sorting: SortingState = [];
	@state() rowSelection: RowSelectionState = {};
	@state() activeIndex = 0;
	/** True between `beforeprint` and `afterprint`. Swaps the render loop from the virtualizer's
	 *  rendered window to every row, since only the visible slice plus overscan is normally in the
	 *  DOM and printing would otherwise yield one screenful followed by blank space. */
	@state() private printing = false;

	@query(".scroll") private scrollEl!: HTMLElement;

	#table!: Table<Row>;
	/** Read-only access to the live TanStack table, so consumers outside a plugin (CSV export,
	 *  tests) can reach it. Rebuilt when `plugins` changes; do not cache across rebuilds. */
	get table(): Table<Row> { return this.#table; }
	/** The plugin array the table was last built with. Compared by reference in willUpdate so a
	 *  `plugins` assignment ALWAYS rebuilds — including one landing between upgrade-time
	 *  connectedCallback and the first update flush (script-after-import order), which a
	 *  changedProperties-based guard mistakes for the initial cycle. */
	#builtPlugins?: DataGridPlugin[];
	#tstate!: TableState;
	/**
	 * The plugin context. A CLASS FIELD, so it exists before the first table does: `columns()`
	 * runs inside `createTable` and needs host state — `selectionMode` decides whether the select
	 * plugin contributes a column at all, and a wrong answer there desyncs the grid template (which
	 * recomputes `columns()` at render) from the column defs (built during table creation).
	 * `table` is a live getter, so one stable context object spans every rebuild.
	 */
	#ctx: DataGridContext = this.#makeContext();
	#makeContext(): DataGridContext {
		const ctx = { host: this, refresh: () => this.requestUpdate() } as unknown as DataGridContext;
		Object.defineProperty(ctx, "table", { get: () => this.#table, enumerable: true });
		return ctx;
	}
	#disposers: Array<() => void> = [];
	#virtualizer?: Virtualizer<HTMLElement, Element>;
	#cleanup?: () => void;

	/**
	 * Rendered row range, captured in `render()` and emitted from `updated()`.
	 *
	 * `getVirtualItems()` is only callable during render, but dispatching there would fire an event
	 * inside Lit's render cycle — a consumer that responds by setting `data` would re-enter the
	 * render. So render only STASHES the range here; `updated()` (the safe post-render hook) does
	 * the comparing and emitting.
	 */
	#range?: { start: number; end: number; count: number; rendered: number[] };
	/** Last emitted (start, end, count). Unchanged triple = no event, so ordinary re-renders
	 *  (a selection toggle, a flags patch) stay silent and only real scrolling or a data change
	 *  produces one. `rendered` is not compared: it is derived from the same virtual items. */
	#emittedRange?: { start: number; end: number; count: number };

	/** Column list after every plugin's `columns()` transform, in array order. */
	#computeColumns(): GridColumn[] {
		return this.plugins.reduce((cols, p) => p.columns?.(cols, this.#ctx) ?? cols, this.columns);
	}
	#columnDefs(): ColumnDef<Row>[] {
		return this.#computeColumns().map((c) => {
			const def: ColumnDef<Row> = { id: c.id, header: c.header ?? c.id, enableSorting: c.sortable ?? true };
			// A computed column derives its value from the whole row; otherwise key off the field.
			if (c.compute) (def as { accessorFn?: (row: Row) => unknown }).accessorFn = c.compute;
			else (def as { accessorKey?: string }).accessorKey = c.accessorKey ?? c.id;
			// Pass a plugin-set aggregation through to TanStack (groups plugin sets this via columns()).
			if (c.aggregationFn) def.aggregationFn = c.aggregationFn;
			return def;
		});
	}
	// Full state is seeded from table.initialState; a single onStateChange drives everything.
	#onStateChange = (updater: Updater<TableState>) => {
		const prev = this.#tstate;
		this.#tstate = functionalUpdate(updater, this.#tstate);
		this.#table.setOptions((o) => ({ ...o, state: this.#tstate }));
		if (this.#tstate.sorting !== prev.sorting) { this.sorting = this.#tstate.sorting; this.emit("dj-sort", { detail: { sorting: this.sorting } }); }
		if (this.#tstate.rowSelection !== prev.rowSelection) {
			this.rowSelection = this.#tstate.rowSelection;
			this.emit("dj-selection-change", { detail: { rows: this.#table.getSelectedRowModel().rows.map((r) => r.original) } });
		}
		// Row count changes with filter/pagination/expansion plugins; keep the virtualizer in sync
		// or it renders a stale row window.
		this.#virtualizer?.setOptions({ ...this.#virtualizer.options, count: this.#table.getRowModel().rows.length });
		this.requestUpdate();
	};

	/** Core TanStack options (no state/onStateChange — those are applied last, after plugins). */
	#coreOptions(): TableOptionsResolved<Row> {
		return {
			data: this.data,
			columns: this.#columnDefs(),
			state: {},
			onStateChange: this.#onStateChange,
			enableRowSelection: this.selectionMode !== "none",
			enableMultiRowSelection: this.selectionMode === "multiple",
			getRowId: this.getRowId,
			getCoreRowModel: getCoreRowModel(),
			getSortedRowModel: getSortedRowModel(),
			renderFallbackValue: null,
		};
	}
	/** Core options spread with each plugin's tableOptions() in array order (later wins), then
	 *  core's state/onStateChange applied LAST so a plugin can never clobber them. */
	#mergedOptions(): TableOptionsResolved<Row> {
		let opts = this.#coreOptions();
		for (const p of this.plugins) {
			const extra = p.tableOptions?.();
			if (extra) opts = { ...opts, ...extra };
		}
		return { ...opts, state: this.#tstate ?? {}, onStateChange: this.#onStateChange };
	}

	/** (Re)build the table: dispose prior setups, recreate, seed state, run plugin setups.
	 *  Called at connect and whenever `plugins` genuinely changes. */
	#buildTable() {
		for (const d of this.#disposers) d();
		this.#disposers = [];

		this.#table = createTable(this.#mergedOptions());
		// The FULL initialState spread is load-bearing: a partial TanStack `state` crashes on an
		// undefined slice (row models read state.pagination/grouping/expanded/columnFilters). This
		// also picks up any initialState a plugin contributed via tableOptions().
		this.#tstate = { ...this.#table.initialState, sorting: this.sorting, rowSelection: this.rowSelection };
		this.#table.setOptions((o) => ({ ...o, state: this.#tstate }));

		for (const p of this.plugins) {
			const dispose = p.setup?.(this.#ctx);
			if (dispose) this.#disposers.push(dispose);
		}
		this.#builtPlugins = this.plugins;
		this.#virtualizer?.setOptions({ ...this.#virtualizer.options, count: this.#table.getRowModel().rows.length });
	}

	protected override willUpdate(changed: Map<PropertyKey, unknown>) {
		super.willUpdate(changed);
		// Rebuild BEFORE render whenever the plugin array is not the one the table was built with.
		// Row models and setup() only exist at table creation, so a missed rebuild silently drops
		// plugin behavior (this bit the playground: plugins assigned right after the upgrading
		// import, inside the first update cycle).
		if (this.#table && this.plugins !== this.#builtPlugins) {
			this.#buildTable();
			this.#virtualizer?.measure();
		}
	}

	#onBeforePrint = () => { this.printing = true; };
	#onAfterPrint = () => { this.printing = false; };

	override connectedCallback() {
		super.connectedCallback();
		this.#buildTable();
		window.addEventListener("beforeprint", this.#onBeforePrint);
		window.addEventListener("afterprint", this.#onAfterPrint);
	}
	override disconnectedCallback() {
		super.disconnectedCallback();
		for (const d of this.#disposers) d();
		this.#disposers = [];
		this.#cleanup?.();
		window.removeEventListener("beforeprint", this.#onBeforePrint);
		window.removeEventListener("afterprint", this.#onAfterPrint);
	}

	protected override firstUpdated() {
		this.#virtualizer = new Virtualizer({
			count: this.#table.getRowModel().rows.length,
			getScrollElement: () => this.scrollEl,
			estimateSize: () => this.rowHeight,
			overscan: 8,
			scrollToFn: elementScroll,
			observeElementRect,
			observeElementOffset,
			// Used only when a renderDetail plugin switches rows to measured wrappers. Falls back to
			// the row-height estimate when layout reports no size (headless test DOM).
			measureElement: (el) => {
				const h = (el as HTMLElement).getBoundingClientRect?.().height ?? 0;
				return h > 0 ? h : this.rowHeight;
			},
			onChange: () => this.requestUpdate(),
		});
		this.#cleanup = this.#virtualizer._didMount();
		this.requestUpdate();
	}
	protected override updated(c: Map<PropertyKey, unknown>) {
		// Plugins-change rebuilds happen in willUpdate (reference compare against #builtPlugins),
		// which is immune to the upgrade-order race a changedProperties guard has here.
		if (c.has("data") || c.has("columns") || c.has("selectionMode")) {
			this.#table.setOptions(() => this.#mergedOptions());
			this.#virtualizer?.setOptions({ ...this.#virtualizer.options, count: this.#table.getRowModel().rows.length });
			this.#virtualizer?.measure();
			this.requestUpdate();
		}
		this.#emitRangeChange();
	}

	/**
	 * Emit `dj-range-change` when the rendered window moved. Called from `updated()`, never from
	 * `render()` — see `#range`. The requestUpdate() calls above schedule another cycle whose own
	 * updated() emits the settled range, so an early return here costs nothing.
	 */
	#emitRangeChange() {
		const r = this.#range;
		if (!r) return;
		const prev = this.#emittedRange;
		if (prev && prev.start === r.start && prev.end === r.end && prev.count === r.count) return;
		this.#emittedRange = { start: r.start, end: r.end, count: r.count };
		this.emit("dj-range-change", { detail: { start: r.start, end: r.end, count: r.count, rendered: r.rendered } });
	}

	private move(delta: number) {
		const n = this.#table.getRowModel().rows.length;
		if (!n) return;
		this.activeIndex = Math.min(n - 1, Math.max(0, this.activeIndex + delta));
		this.#virtualizer?.scrollToIndex(this.activeIndex, { align: "auto" });
	}
	private onKeyDown(e: KeyboardEvent) {
		const n = this.#table.getRowModel().rows.length;
		switch (e.key) {
			case "ArrowDown": e.preventDefault(); this.move(1); break;
			case "ArrowUp": e.preventDefault(); this.move(-1); break;
			case "Home": e.preventDefault(); this.activeIndex = 0; this.#virtualizer?.scrollToIndex(0); break;
			case "End": e.preventDefault(); this.activeIndex = Math.max(0, n - 1); this.#virtualizer?.scrollToIndex(n - 1); break;
			// Platform convention (and the ARIA grid pattern): Enter activates, Space selects.
			// Under `activation="none"` both keep toggling, so nothing existing moves.
			case " ": e.preventDefault(); this.toggleAt(this.activeIndex); break;
			case "Enter":
				e.preventDefault();
				if (this.activation === "none") this.toggleAt(this.activeIndex);
				else this.activateAt(this.activeIndex);
				break;
		}
	}
	toggleAt(index: number) {
		if (this.selectionMode === "none") return;
		this.#table.getRowModel().rows[index]?.toggleSelected();
	}

	/**
	 * Emit `dj-activate` for a row-model index. Fires regardless of `selectionMode` (a read-only
	 * list with clickable rows is a real case) but never under `activation="none"`.
	 */
	activateAt(index: number) {
		if (this.activation === "none") return;
		const row = this.#table.getRowModel().rows[index];
		if (!row) return;
		this.emit("dj-activate", { detail: { row: row.original, index } });
	}

	/**
	 * A row's pointer gesture. Modified clicks are RESERVED for selection and never activate:
	 * activating a row while the user is building a selection is the surprise this design removes.
	 */
	#onRowClick(e: MouseEvent, index: number) {
		this.activeIndex = index;
		if (this.activation === "none") { this.toggleAt(index); return; }
		// Ctrl/Cmd toggles this row; Shift is the range gesture (owned by the select plugin).
		if (e.ctrlKey || e.metaKey) { this.toggleAt(index); return; }
		if (e.shiftKey) return;
		if (this.activation === "click") this.activateAt(index);
		// `"double"`: a plain click only moves the active row; `dblclick` activates.
	}

	/** `"double"` mode only. Uses the platform's own dblclick rather than a hand-rolled timer,
	 *  so the two `click` events a double click also produces can never activate. */
	#onRowDblClick(e: MouseEvent, index: number) {
		if (this.activation !== "double") return;
		if (e.ctrlKey || e.metaKey || e.shiftKey) return;
		this.activateAt(index);
	}

	/** A cell's content: the first plugin `renderCell` that returns non-undefined wins (else the
	 *  core string default), then every `decorateCell` folds over it in array order. */
	/** Merge every plugin's row attributes for a row (array order, later wins). */
	#rowAttributes(row: TableRow<Row>): Record<string, string> {
		let attrs: Record<string, string> = {};
		for (const p of this.plugins) if (p.rowAttributes) attrs = { ...attrs, ...p.rowAttributes(row, this.#ctx) };
		return attrs;
	}

	#cellContent(cell: Cell<Row, unknown>): unknown {
		let content: unknown = undefined;
		for (const p of this.plugins) {
			const r = p.renderCell?.(cell, this.#ctx);
			if (r !== undefined) { content = r; break; }
		}
		if (content === undefined) content = String(cell.getValue() ?? "");
		for (const p of this.plugins) if (p.decorateCell) content = p.decorateCell(cell, content, this.#ctx);
		return content;
	}

	/** A header cell's content: the first plugin `renderHeader` returning non-undefined wins, else
	 *  the core default (the column's `header` string, falling back to its id). Mirrors
	 *  `#cellContent` so a plugin owning a column can also own that column's header control. */
	#headerContent(header: TableHeader<Row, unknown>): unknown {
		for (const p of this.plugins) {
			const r = p.renderHeader?.(header, this.#ctx);
			if (r !== undefined) return r;
		}
		const def = header.column.columnDef.header;
		return typeof def === "string" ? def : header.column.id;
	}

	/** Detail content for a row: the first plugin `renderDetail` returning non-undefined wins. */
	#detailContent(row: TableRow<Row>): TemplateResult | undefined {
		for (const p of this.plugins) {
			const d = p.renderDetail?.(row, this.#ctx);
			if (d !== undefined) return d;
		}
		return undefined;
	}

	override render() {
		const headers = this.#table?.getHeaderGroups()[0]?.headers ?? [];
		const hasDetail = this.plugins.some((p) => p.renderDetail);
		this.#virtualizer?._willUpdate();
		const virtualItems = this.#virtualizer?.getVirtualItems() ?? [];
		const rows = this.#table?.getRowModel().rows ?? [];
		const n = rows.length;
		// Stash the rendered range for updated() to emit, from the REAL virtualizer window regardless
		// of printing — a consumer's end-reached windowing logic (dj-range-change) must not see the
		// whole list as "rendered" just because a print materialized it.
		const rendered = virtualItems.map((vi) => vi.index);
		this.#range = {
			start: rendered.length ? rendered[0] : -1,
			end: rendered.length ? rendered[rendered.length - 1] : -1,
			count: n,
			rendered,
		};
		// Printing (plain row path only) shows a real <table>/<thead>/<tbody> ALONGSIDE the normal
		// grid instead of replacing it — see the `<table part="grid" class="print-table">` near the
		// end of this template. A genuine HTML <thead> repeats across printed pages natively in every
		// major engine; an earlier version tried to fake that with CSS (`display: table-header-group`
		// on a div, relying on the "anonymous table" fix-up rules) and it did not reliably repeat in
		// practice, confirmed against a real print preview (Bill, 2026-08-18). Two more real bugs
		// shipped and got fixed the same day, both from a version that returned the print table IN
		// PLACE OF the whole template rather than alongside it:
		//  1. That unmounted `.scroll` — the element the TanStack virtualizer's ResizeObserver/scroll
		//     listeners were attached to in firstUpdated() — and the grid came back permanently empty
		//     once printing ended, because the virtualizer never recovered once its tracked element
		//     was destroyed. Hiding `.wrap` via `display:none` instead keeps `.scroll` mounted and
		//     observed the whole time; the observers just report a zero-size rect while hidden and a
		//     real one again once printing ends.
		//  2. The print table was nested inside `.wrap` (display:flex), and a flex-item table doesn't
		//     get a browser's native repeating-thead print behavior. It has to be a sibling, not a
		//     descendant — see the template below.
		// The print table is also ALWAYS in the DOM (empty + hidden off-print, not conditionally
		// added/removed) with its markup INLINED directly in this template rather than factored into
		// a helper method returning its own separate `html` call — both of those matter only for a
		// lit-html + happy-dom quirk in this workspace's unit-test harness (bisected against a minimal
		// reproduction, 2026-08-18): a nested TemplateResult returned from a separate function/method
		// call, sitting in the trailing child position of an outer template, silently fails to commit
		// — regardless of whether it's conditional. The identical markup written inline, or toggled by
		// CONTENT within an always-present element, does not trigger it. A real browser was unaffected
		// either way, but this shape costs nothing extra on screen and is what the unit tests exercise.
		const printing = this.printing && !hasDetail;

		// `minmax(0, 1fr)`, not `1fr` (= `minmax(auto, 1fr)`): the header, each subheader,
		// and each body row are separate grid containers, so an `auto` minimum would let a
		// row with wide content (e.g. a native <select> filter) grow its tracks independently
		// and drift out of alignment with the header. A 0 minimum makes every row resolve the
		// same track widths; cells ellipsize.
		const template = this.#computeColumns().map((c) => c.width ?? "minmax(0, 1fr)").join(" ");
		const total = this.#virtualizer?.getTotalSize() ?? 0;
		const items = virtualItems;
		// Chrome regions (quick filter, pagination, totals) are full-width, outside the grid rows.
		const chromeTops = this.plugins.map((p) => p.chromeTop?.(this.#ctx)).filter((x) => x !== undefined);
		const chromeBottoms = this.plugins.map((p) => p.chromeBottom?.(this.#ctx)).filter((x) => x !== undefined);
		// Each plugin that returns subheaderCells contributes one extra header-area row.
		const subRows = this.plugins.map((p) => p.subheaderCells?.(this.#ctx)).filter((x): x is Array<TemplateResult | null> => x !== undefined);
		const headerRows = 1 + subRows.length;
		// aria-activedescendant must point at a rendered row; with virtualization the active row can
		// be scrolled out of the rendered window, so omit it then.
		const activeRendered = virtualItems.some((vi) => vi.index === this.activeIndex);
		return html`
			<div class="wrap" style=${printing ? "display:none" : nothing}>
				${chromeTops.map((c) => html`<div part="chrome-top" class="chrome">${c}</div>`)}
				<div part="grid" class="grid" role="grid" tabindex="0" aria-rowcount=${n + headerRows} aria-multiselectable=${this.selectionMode === "multiple" ? "true" : nothing} aria-activedescendant=${n && activeRendered ? `r-${this.activeIndex}` : nothing} @keydown=${this.onKeyDown}>
					<div part="head" class="head row" role="row" aria-rowindex="1" style=${`grid-template-columns:${template}`}>
						${headers.map((h) => {
							const sortable = h.column.getCanSort();
							const dir = h.column.getIsSorted();
							const label = this.#headerContent(h);
							return html`<div class="hcell ${sortable ? "sortable" : ""}" role="columnheader"
								aria-sort=${dir === "asc" ? "ascending" : dir === "desc" ? "descending" : sortable ? "none" : nothing}
								@click=${sortable ? () => h.column.toggleSorting() : nothing}>
								<span>${label}</span><span class="sortind">${dir === "asc" ? "▲" : dir === "desc" ? "▼" : ""}</span>
							</div>`;
						})}
					</div>
					${subRows.map((cells, i) => html`<div part="subhead" class="subhead row" role="row" aria-rowindex=${i + 2} style=${`grid-template-columns:${template}`}>
						${cells.map((cell) => html`<div class="subcell" role="gridcell">${cell ?? nothing}</div>`)}
					</div>`)}
					<div class="scroll" role="presentation" style=${`height:${this.height}`}>
						<div role="rowgroup" style=${`height:${total}px;position:relative`}>
							${items.map((vi) => {
								const row = rows[vi.index];
								if (!row) return nothing;
								const selected = row.getIsSelected();
								// With a renderDetail plugin, rows have variable height: each virtual item
								// becomes a measured wrapper (data-index + measureElement ref, the TanStack
								// dynamic-size contract) holding the fixed-height row plus its detail panel.
								// (Printing with a detail plugin also lands here, unmaterialized — see
								// #renderPrintTable for why only the plain row path gets a print template.)
								const rowStyle = hasDetail
									? `position:static;height:${this.rowHeight}px;grid-template-columns:${template}`
									: `transform:translateY(${vi.start}px);height:${vi.size}px;grid-template-columns:${template}`;
								const rowTpl = html`<div part="row" id=${`r-${vi.index}`}
									class="vrow ${vi.index === this.activeIndex ? "vrow--active" : ""} ${selected ? "vrow--selected" : ""}"
									role="row" aria-rowindex=${vi.index + headerRows + 1} aria-selected=${this.selectionMode !== "none" ? (selected ? "true" : "false") : nothing}
									style=${rowStyle}
									${ref((el) => el && applyRowAttrs(el as Element, this.#rowAttributes(row)))}
									@click=${(e: MouseEvent) => this.#onRowClick(e, vi.index)}
									@dblclick=${(e: MouseEvent) => this.#onRowDblClick(e, vi.index)}>
									${row.getVisibleCells().map((cell) => html`<div part="cell" class="cell" role="gridcell">${this.#cellContent(cell)}</div>`)}
								</div>`;
								if (!hasDetail) return rowTpl;
								const detail = this.#detailContent(row);
								return html`<div class="vwrap" data-index=${vi.index}
									style=${`transform:translateY(${vi.start}px)`}
									${ref((el) => { if (el) this.#virtualizer?.measureElement(el as HTMLElement); })}>
									${rowTpl}
									${detail !== undefined
										? html`<div class="vdetail" role="row"><div part="detail" class="detail" role="gridcell">${detail}</div></div>`
										: nothing}
								</div>`;
							})}
						</div>
					</div>
				</div>
				${chromeBottoms.map((c) => html`<div part="chrome-bottom" class="chrome">${c}</div>`)}
			</div>
			<table part="grid" class="print-table" style=${printing ? nothing : "display:none"}>
				<thead>
					<tr part="head">${printing ? headers.map((h) => html`<th part="cell">${this.#headerContent(h)}</th>`) : ""}</tr>
				</thead>
				<tbody>
					${printing ? rows.map((row, index) => html`<tr part="row" id=${`r-${index}`}>${row.getVisibleCells().map((cell) => html`<td part="cell">${this.#cellContent(cell)}</td>`)}</tr>`) : ""}
				</tbody>
			</table>
		`;
	}
}
export default DjDataGrid;
declare global {
	interface GlobalEventHandlersEventMap {
		"dj-sort": CustomEvent<{ sorting: SortingState }>;
		"dj-selection-change": CustomEvent<{ rows: Row[] }>;
		"dj-activate": CustomEvent<{ row: Row; index: number }>;
		"dj-range-change": CustomEvent<{ start: number; end: number; count: number; rendered: number[] }>;
	}
}
