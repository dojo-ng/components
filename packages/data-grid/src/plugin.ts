import type { TemplateResult } from "lit";
import type { Cell, Header as TableHeader, Row as TableRow, Table, TableOptionsResolved } from "@tanstack/table-core";
import type { DjDataGrid, GridColumn, Row } from "./dj-data-grid.js";
import type { GridColumnState } from "./column-layout.js";

/** What a plugin can see and do. Created once per table build, BEFORE the table itself, so the
 *  `columns()` hook can read host state while the column list is still being decided. */
export interface DataGridContext {
	/** The host element (emit events, query renderRoot, requestUpdate via refresh). */
	readonly host: DjDataGrid;
	/** The live TanStack table. A getter, because the context outlives any single table instance
	 *  and exists before the first one is created — never destructure it. */
	readonly table: Table<Row>;
	/** Re-render the grid. */
	refresh(): void;
	/** The row at a grid index, or undefined when there is none. In remote mode (`rowCount`) the
	 *  index is absolute and an unloaded row is undefined; otherwise it is a row-model index. Use
	 *  this, not `table.getRowModel().rows[i]`, so a plugin works in both modes. */
	rowAt(index: number): TableRow<Row> | undefined;
	/** The grid index of a row (absolute in remote mode), or -1. The inverse of `rowAt`. */
	indexOf(row: TableRow<Row>): number;
	/** The ids of rows `first..last` (inclusive). In remote mode rows that are not loaded are
	 *  requested (`dj-rows-request` with `reason: "selection"`), and the promise resolves once all
	 *  have arrived, or with `undefined` if the list changes first (a new epoch) or another call
	 *  replaces this one. Outside remote mode it resolves at once with the row-model ids. */
	rowIds(first: number, last: number): Promise<string[] | undefined>;
	/** Replace the column state on the user's behalf: like setting `host.columnState`, but it
	 *  emits `dj-column-state-change` when the state changed. Pass `{ emit: false }` for a live
	 *  preview (a resize drag) and emit once at the end. */
	setColumnState(state: Partial<GridColumnState>, options?: { emit?: boolean }): void;
	/** The column state the grid starts with: declared order, declared `pinned`, nothing sized
	 *  or hidden. What a "Reset" restores. */
	defaultColumnState(): GridColumnState;
}

export interface DataGridPlugin {
	name: string;
	/** Transform the plain GridColumn list (insert/remove/annotate columns). Array order.
	 *  `ctx` is optional in the signature only for backward compatibility — it is always passed,
	 *  and it is live at first build (the context is created before the table so this hook can
	 *  read host state such as `selectionMode`, which decides whether a column exists at all). */
	columns?(cols: GridColumn[], ctx: DataGridContext): GridColumn[];
	/** TanStack options merged at table creation (row models, filterFns…). Array order; later wins.
	 *  Never return `state`/`onStateChange` — core owns those. */
	tableOptions?(): Partial<TableOptionsResolved<Row>>;
	/** Wire listeners/controllers after the table exists. Return a disposer. */
	setup?(ctx: DataGridContext): (() => void) | void;
	/** REPLACE a cell's content. First non-undefined in array order wins; else core default. */
	renderCell?(cell: Cell<Row, unknown>, ctx: DataGridContext): TemplateResult | string | undefined;
	/** REPLACE a column header's content. First non-undefined in array order wins; else the core
	 *  default (the column's `header` string, falling back to its id). The mirror of `renderCell`
	 *  for the header row, so a plugin that owns a column can also draw its header control (a
	 *  select-all checkbox, a column menu). Sorting still belongs to the core header cell: the
	 *  returned content renders inside it, so make a column `sortable: false` if a control in its
	 *  header would fight the sort click. */
	renderHeader?(header: TableHeader<Row, unknown>, ctx: DataGridContext): TemplateResult | string | undefined;
	/** Extra controls at the inline end of a column header, outside its sort button (a column
	 *  menu button, a resize handle). Every plugin's result renders, in array order. A click
	 *  inside them never sorts the column. */
	headerControls?(header: TableHeader<Row, unknown>, ctx: DataGridContext): TemplateResult | undefined;
	/** A key on the header row, before the core acts. `header` is the header holding the
	 *  keyboard position. Return `true` to claim the key; the core then ignores it. */
	headerKey?(e: KeyboardEvent, header: TableHeader<Row, unknown>, ctx: DataGridContext): boolean | void;
	/** WRAP a cell's content (indent, expander, badges). Applied in array order after renderCell. */
	decorateCell?(cell: Cell<Row, unknown>, content: unknown, ctx: DataGridContext): unknown;
	/** Merge attributes onto each rendered row element (aria-level, aria-expanded…). Array order;
	 *  later wins. Core reconciles them per render, removing keys a plugin stops returning. */
	rowAttributes?(row: TableRow<Row>, ctx: DataGridContext): Record<string, string>;
	/** A second header row (filters): one entry per visible leaf column, or undefined for none.
	 *  Core lays the row out with the grid's column template; entries may be null (empty cell). */
	subheaderCells?(ctx: DataGridContext): Array<TemplateResult | null> | undefined;
	/** Full-width regions above the header / below the scroller (quick filter, pagination, totals). */
	chromeTop?(ctx: DataGridContext): TemplateResult | undefined;
	chromeBottom?(ctx: DataGridContext): TemplateResult | undefined;
	/** Full-width detail content under an expanded row (master-detail). First non-undefined wins. */
	renderDetail?(row: TableRow<Row>, ctx: DataGridContext): TemplateResult | undefined;
	/** Remote mode: rows moved. `delta > 0` inserted `delta` rows at `at`; `delta < 0` removed rows
	 *  `at..at - delta - 1`. Called by `insertRows`/`removeRows` so a plugin holding an index (the
	 *  select plugin's Shift anchor) can follow its row. */
	shiftRows?(at: number, delta: number, ctx: DataGridContext): void;
	/** A pointer click on a body row, before the core acts on it. Return `true` to claim the
	 *  gesture: the core still moves the active row to `index` but does not toggle or activate.
	 *  Asked before the active row moves, so `ctx.host.activeIndex` is still where the cursor was.
	 *  The select plugin uses this for Shift-click ranges, which the core leaves to it. */
	rowClick?(e: MouseEvent, index: number, ctx: DataGridContext): boolean | void;
}

/** Identity helper for typing and authoring a plugin. */
export const defineDataGridPlugin = (p: DataGridPlugin): DataGridPlugin => p;
