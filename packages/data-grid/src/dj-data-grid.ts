import { html, nothing, type TemplateResult } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import {
	createTable, getCoreRowModel, getSortedRowModel, functionalUpdate,
	type Table, type TableOptionsResolved, type TableState, type ColumnDef, type Cell,
	type SortingState, type RowSelectionState, type Updater,
} from "@tanstack/table-core";
import { Virtualizer, elementScroll, observeElementOffset, observeElementRect } from "@tanstack/virtual-core";
import type { DataGridPlugin, DataGridContext } from "./plugin.js";
import styles from "./dj-data-grid.styles.js";

export type Row = Record<string, unknown>;
export interface GridColumn {
	id: string;
	header?: string;
	accessorKey?: string;
	sortable?: boolean;
	width?: string;
	/** Derive the cell value from the whole row (calculated columns). Maps to a TanStack
	 *  `accessorFn`. A row total is `compute: r => r.a + r.b`; no plugin needed. */
	compute?: (row: Row) => unknown;
}
export type SelectionMode = "none" | "single" | "multiple";

/**
 * `<dj-data-grid>` — a virtualized, sortable, selectable data grid built on TanStack Table
 * (column/sort/selection model) and TanStack Virtual (row virtualization). Core scope:
 * columns, in-memory `data`, sort, virtual rows, row selection, keyboard row navigation, and
 * calculated columns (`GridColumn.compute`). Filtering, pagination, inline editing, tree rows,
 * grouping, CSV export, and master-detail arrive as PLUGINS via the `plugins` property (plain
 * objects from factory functions; see {@link DataGridPlugin}). A bare grid with `plugins=[]`
 * behaves exactly as before. ARIA role=grid. Events: `dj-sort`, `dj-selection-change`. Parts:
 * `grid`, `head`, `row`, `cell`, `chrome-top`, `chrome-bottom`, `subhead`.
 */
export class DjDataGrid extends DojoElement {
	static override styles = styles;
	static override version = "0.1.0";
	static override focusable = true;

	@property({ type: Array }) columns: GridColumn[] = [];
	@property({ type: Array }) data: Row[] = [];
	@property({ attribute: "selection-mode", reflect: true }) selectionMode: SelectionMode = "none";
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

	@query(".scroll") private scrollEl!: HTMLElement;

	#table!: Table<Row>;
	#tstate!: TableState;
	#ctx!: DataGridContext;
	#disposers: Array<() => void> = [];
	#virtualizer?: Virtualizer<HTMLElement, Element>;
	#cleanup?: () => void;

	/** Column list after every plugin's `columns()` transform, in array order. */
	#computeColumns(): GridColumn[] {
		return this.plugins.reduce((cols, p) => p.columns?.(cols) ?? cols, this.columns);
	}
	#columnDefs(): ColumnDef<Row>[] {
		return this.#computeColumns().map((c) => {
			const def: ColumnDef<Row> = { id: c.id, header: c.header ?? c.id, enableSorting: c.sortable ?? true };
			// A computed column derives its value from the whole row; otherwise key off the field.
			if (c.compute) (def as { accessorFn?: (row: Row) => unknown }).accessorFn = c.compute;
			else (def as { accessorKey?: string }).accessorKey = c.accessorKey ?? c.id;
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

		this.#ctx = { host: this, table: this.#table, refresh: () => this.requestUpdate() };
		for (const p of this.plugins) {
			const dispose = p.setup?.(this.#ctx);
			if (dispose) this.#disposers.push(dispose);
		}
		this.#virtualizer?.setOptions({ ...this.#virtualizer.options, count: this.#table.getRowModel().rows.length });
	}

	override connectedCallback() {
		super.connectedCallback();
		this.#buildTable();
	}
	override disconnectedCallback() {
		super.disconnectedCallback();
		for (const d of this.#disposers) d();
		this.#disposers = [];
		this.#cleanup?.();
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
			onChange: () => this.requestUpdate(),
		});
		this.#cleanup = this.#virtualizer._didMount();
		this.requestUpdate();
	}
	protected override updated(c: Map<PropertyKey, unknown>) {
		// A genuine post-creation plugins change rebuilds the table (row models must exist at
		// creation). Guard against the first update cycle, exactly like dj-rich-text.
		if (c.has("plugins") && c.get("plugins") !== undefined) {
			this.#buildTable();
			this.#virtualizer?.setOptions({ ...this.#virtualizer.options, count: this.#table.getRowModel().rows.length });
			this.#virtualizer?.measure();
			this.requestUpdate();
			return;
		}
		if (c.has("data") || c.has("columns") || c.has("selectionMode")) {
			this.#table.setOptions(() => this.#mergedOptions());
			this.#virtualizer?.setOptions({ ...this.#virtualizer.options, count: this.#table.getRowModel().rows.length });
			this.#virtualizer?.measure();
			this.requestUpdate();
		}
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
			case " ": case "Enter": e.preventDefault(); this.toggleAt(this.activeIndex); break;
		}
	}
	toggleAt(index: number) {
		if (this.selectionMode === "none") return;
		this.#table.getRowModel().rows[index]?.toggleSelected();
	}

	/** A cell's content: the first plugin `renderCell` that returns non-undefined wins (else the
	 *  core string default), then every `decorateCell` folds over it in array order. */
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

	override render() {
		const template = this.#computeColumns().map((c) => c.width ?? "1fr").join(" ");
		const headers = this.#table?.getHeaderGroups()[0]?.headers ?? [];
		this.#virtualizer?._willUpdate();
		const items = this.#virtualizer?.getVirtualItems() ?? [];
		const total = this.#virtualizer?.getTotalSize() ?? 0;
		const rows = this.#table?.getRowModel().rows ?? [];
		const n = rows.length;
		// Chrome regions (quick filter, pagination, totals) are full-width, outside the grid rows.
		const chromeTops = this.plugins.map((p) => p.chromeTop?.(this.#ctx)).filter((x) => x !== undefined);
		const chromeBottoms = this.plugins.map((p) => p.chromeBottom?.(this.#ctx)).filter((x) => x !== undefined);
		// Each plugin that returns subheaderCells contributes one extra header-area row.
		const subRows = this.plugins.map((p) => p.subheaderCells?.(this.#ctx)).filter((x): x is Array<TemplateResult | null> => x !== undefined);
		const headerRows = 1 + subRows.length;
		// aria-activedescendant must point at a rendered row; with virtualization the active row can
		// be scrolled out of the rendered window, so omit it then.
		const activeRendered = items.some((vi) => vi.index === this.activeIndex);
		return html`
			<div class="wrap">
				${chromeTops.map((c) => html`<div part="chrome-top" class="chrome">${c}</div>`)}
				<div part="grid" class="grid" role="grid" tabindex="0" aria-rowcount=${n + headerRows} aria-multiselectable=${this.selectionMode === "multiple" ? "true" : nothing} aria-activedescendant=${n && activeRendered ? `r-${this.activeIndex}` : nothing} @keydown=${this.onKeyDown}>
					<div part="head" class="head row" role="row" aria-rowindex="1" style=${`grid-template-columns:${template}`}>
						${headers.map((h) => {
							const sortable = h.column.getCanSort();
							const dir = h.column.getIsSorted();
							const label = typeof h.column.columnDef.header === "string" ? h.column.columnDef.header : h.column.id;
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
								return html`<div part="row" id=${`r-${vi.index}`}
									class="vrow ${vi.index === this.activeIndex ? "vrow--active" : ""} ${selected ? "vrow--selected" : ""}"
									role="row" aria-rowindex=${vi.index + headerRows + 1} aria-selected=${this.selectionMode !== "none" ? (selected ? "true" : "false") : nothing}
									style=${`transform:translateY(${vi.start}px);height:${vi.size}px;grid-template-columns:${template}`}
									@click=${() => { this.activeIndex = vi.index; this.toggleAt(vi.index); }}>
									${row.getVisibleCells().map((cell) => html`<div part="cell" class="cell" role="gridcell">${this.#cellContent(cell)}</div>`)}
								</div>`;
							})}
						</div>
					</div>
				</div>
				${chromeBottoms.map((c) => html`<div part="chrome-bottom" class="chrome">${c}</div>`)}
			</div>
		`;
	}
}
export default DjDataGrid;
declare global {
	interface GlobalEventHandlersEventMap {
		"dj-sort": CustomEvent<{ sorting: SortingState }>;
		"dj-selection-change": CustomEvent<{ rows: Row[] }>;
	}
}
