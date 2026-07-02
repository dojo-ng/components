import type { TemplateResult } from "lit";
import type { Cell, Row as TableRow, Table, TableOptionsResolved } from "@tanstack/table-core";
import type { DjDataGrid, GridColumn, Row } from "./dj-data-grid.js";

/** What a plugin can see and do. Created once per table build. */
export interface DataGridContext {
	/** The host element (emit events, query renderRoot, requestUpdate via refresh). */
	readonly host: DjDataGrid;
	/** The live TanStack table. */
	readonly table: Table<Row>;
	/** Re-render the grid. */
	refresh(): void;
}

export interface DataGridPlugin {
	name: string;
	/** Transform the plain GridColumn list (insert/remove/annotate columns). Array order. */
	columns?(cols: GridColumn[]): GridColumn[];
	/** TanStack options merged at table creation (row models, filterFns…). Array order; later wins.
	 *  Never return `state`/`onStateChange` — core owns those. */
	tableOptions?(): Partial<TableOptionsResolved<Row>>;
	/** Wire listeners/controllers after the table exists. Return a disposer. */
	setup?(ctx: DataGridContext): (() => void) | void;
	/** REPLACE a cell's content. First non-undefined in array order wins; else core default. */
	renderCell?(cell: Cell<Row, unknown>, ctx: DataGridContext): TemplateResult | string | undefined;
	/** WRAP a cell's content (indent, expander, badges). Applied in array order after renderCell. */
	decorateCell?(cell: Cell<Row, unknown>, content: unknown, ctx: DataGridContext): unknown;
	/** A second header row (filters): one entry per visible leaf column, or undefined for none.
	 *  Core lays the row out with the grid's column template; entries may be null (empty cell). */
	subheaderCells?(ctx: DataGridContext): Array<TemplateResult | null> | undefined;
	/** Full-width regions above the header / below the scroller (quick filter, pagination, totals). */
	chromeTop?(ctx: DataGridContext): TemplateResult | undefined;
	chromeBottom?(ctx: DataGridContext): TemplateResult | undefined;
	/** Full-width detail content under an expanded row (master-detail). First non-undefined wins. */
	renderDetail?(row: TableRow<Row>, ctx: DataGridContext): TemplateResult | undefined;
}

/** Identity helper for typing and authoring a plugin. */
export const defineDataGridPlugin = (p: DataGridPlugin): DataGridPlugin => p;
