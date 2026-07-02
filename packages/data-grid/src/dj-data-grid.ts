import { html, nothing } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import {
	createTable, getCoreRowModel, getSortedRowModel, functionalUpdate,
	type Table, type TableOptionsResolved, type TableState, type ColumnDef,
	type SortingState, type RowSelectionState, type Updater,
} from "@tanstack/table-core";
import { Virtualizer, elementScroll, observeElementOffset, observeElementRect } from "@tanstack/virtual-core";
import styles from "./dj-data-grid.styles.js";

type Row = Record<string, unknown>;
export interface GridColumn { id: string; header?: string; accessorKey?: string; sortable?: boolean; width?: string; }
export type SelectionMode = "none" | "single" | "multiple";

/**
 * `<dj-data-grid>` — a virtualized, sortable, selectable data grid built on TanStack Table
 * (column/sort/selection model) and TanStack Virtual (row virtualization). v1 scope:
 * columns, in-memory `data`, sort, virtual rows, row selection, keyboard row navigation.
 * Async data sources, filtering, column resize/reorder/hide, inline editing, tree rows and
 * pagination are v2. ARIA role=grid. Events: `dj-sort`, `dj-selection-change`. Parts:
 * `grid`, `head`, `row`, `cell`.
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
	/** Optional stable row id accessor; defaults to row index. */
	getRowId?: (row: Row, index: number) => string;

	@state() sorting: SortingState = [];
	@state() rowSelection: RowSelectionState = {};
	@state() activeIndex = 0;

	@query(".scroll") private scrollEl!: HTMLElement;

	#table!: Table<Row>;
	#tstate!: TableState;
	#virtualizer?: Virtualizer<HTMLElement, Element>;
	#cleanup?: () => void;

	#columnDefs(): ColumnDef<Row>[] {
		return this.columns.map((c) => ({ id: c.id, accessorKey: c.accessorKey ?? c.id, header: c.header ?? c.id, enableSorting: c.sortable ?? true }));
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
		this.requestUpdate();
	};
	#options(): TableOptionsResolved<Row> {
		return {
			data: this.data,
			columns: this.#columnDefs(),
			state: this.#tstate ?? {},
			onStateChange: this.#onStateChange,
			enableRowSelection: this.selectionMode !== "none",
			enableMultiRowSelection: this.selectionMode === "multiple",
			getRowId: this.getRowId,
			getCoreRowModel: getCoreRowModel(),
			getSortedRowModel: getSortedRowModel(),
			renderFallbackValue: null,
		};
	}

	override connectedCallback() {
		super.connectedCallback();
		this.#table = createTable(this.#options());
		this.#tstate = { ...this.#table.initialState, sorting: this.sorting, rowSelection: this.rowSelection };
		this.#table.setOptions((o) => ({ ...o, state: this.#tstate }));
	}
	override disconnectedCallback() { super.disconnectedCallback(); this.#cleanup?.(); }

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
		if (c.has("data") || c.has("columns") || c.has("selectionMode")) {
			this.#table.setOptions((o) => ({ ...o, ...this.#options(), state: this.#tstate }));
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

	override render() {
		const cols = this.columns;
		const template = cols.map((c) => c.width ?? "1fr").join(" ");
		const headers = this.#table?.getHeaderGroups()[0]?.headers ?? [];
		this.#virtualizer?._willUpdate();
		const items = this.#virtualizer?.getVirtualItems() ?? [];
		const total = this.#virtualizer?.getTotalSize() ?? 0;
		const rows = this.#table?.getRowModel().rows ?? [];
		const n = rows.length;
		// aria-activedescendant must point at a rendered row; with virtualization the
		// active row can be scrolled out of the rendered window, so omit it then.
		const activeRendered = items.some((vi) => vi.index === this.activeIndex);
		return html`
			<div part="grid" class="grid" role="grid" tabindex="0" aria-rowcount=${n + 1} aria-multiselectable=${this.selectionMode === "multiple" ? "true" : nothing} aria-activedescendant=${n && activeRendered ? `r-${this.activeIndex}` : nothing} @keydown=${this.onKeyDown}>
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
				<div class="scroll" role="presentation" style=${`height:${this.height}`}>
					<div role="rowgroup" style=${`height:${total}px;position:relative`}>
						${items.map((vi) => {
							const row = rows[vi.index];
							if (!row) return nothing;
							const selected = row.getIsSelected();
							return html`<div part="row" id=${`r-${vi.index}`}
								class="vrow ${vi.index === this.activeIndex ? "vrow--active" : ""} ${selected ? "vrow--selected" : ""}"
								role="row" aria-rowindex=${vi.index + 2} aria-selected=${this.selectionMode !== "none" ? (selected ? "true" : "false") : nothing}
								style=${`transform:translateY(${vi.start}px);height:${vi.size}px;grid-template-columns:${template}`}
								@click=${() => { this.activeIndex = vi.index; this.toggleAt(vi.index); }}>
								${row.getVisibleCells().map((cell) => html`<div part="cell" class="cell" role="gridcell">${String(cell.getValue() ?? "")}</div>`)}
							</div>`;
						})}
					</div>
				</div>
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
