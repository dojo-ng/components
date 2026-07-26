import { html } from "lit";
import { ref } from "lit/directives/ref.js";
import { defineDataGridPlugin, type DataGridContext, type DataGridPlugin, type GridColumn, type Row } from "@dojo-ng/data-grid";
import type { Cell, Header as TableHeader, Row as TableRow } from "@tanstack/table-core";

/** The column id the plugin owns. Exported so a consumer can spot it in a `columns()` chain. */
export const SELECT_COLUMN_ID = "dj-select";

export interface SelectColumnOptions {
	/** Track width for the checkbox column. Any grid track value. Default `"2.5rem"`. */
	width?: string;
	/** Which end of the column list the checkbox sits at. Default `"start"`. */
	position?: "start" | "end";
	/**
	 * Accessible name for a row's checkbox, from that row's data. A column of forty identically
	 * named "Select row" controls is useless with a screen reader, so name the thing being
	 * selected: ``label: m => `Select ${m.subject}` ``. Defaults to "Select row".
	 */
	label?: (data: Row) => string;
	/** Accessible name for the select-all checkbox. Default "Select all rows". */
	selectAllLabel?: string;
}

/**
 * `selectColumnPlugin(options?)` — a checkbox column for `<dj-data-grid>`.
 *
 * It owns a COLUMN, not the selection: checkboxes read and write TanStack's existing row
 * selection through `row.getIsSelected()` / `toggleSelected()`, so `selectionMode`,
 * `rowSelection`, and `dj-selection-change` keep working as the single source of truth.
 *
 * Pair it with `activation="click"` on the grid: clicking a row then OPENS it (`dj-activate`)
 * while the checkboxes build the set that bulk actions operate on — the master/detail idiom.
 *
 * Behavior by `selectionMode`:
 *  - `"multiple"`: checkboxes, plus a header select-all with a real indeterminate state.
 *  - `"single"`: radios, and NO header control (select-all is meaningless).
 *  - `"none"`: renders nothing and adds no column at all.
 *
 * Shift-click a checkbox to select the range from the last one you clicked (the anchor).
 */
export function selectColumnPlugin(options: SelectColumnOptions = {}): DataGridPlugin {
	const width = options.width ?? "2.5rem";
	const position = options.position ?? "start";
	const nameFor = (data: Row) => options.label?.(data) ?? "Select row";
	const selectAllLabel = options.selectAllLabel ?? "Select all rows";

	// Anchor for shift-click ranges: the row-model index of the last plainly-clicked checkbox.
	// Reset whenever the row model changes underneath us (see `setup`), so a stale anchor from
	// a previous data set can never select a range the user never saw.
	let anchor: number | null = null;
	// A shift-click is fully handled on `click`. Whether the following `change` still fires is
	// engine-dependent (preventDefault suppresses it in browsers, not in every headless DOM), so
	// the range sets this flag and the change handler consumes it instead of toggling the row
	// back off. Deterministic either way.
	let rangeHandled = false;

	const modeOf = (ctx: DataGridContext | undefined) => ctx?.host?.selectionMode ?? "none";

	return defineDataGridPlugin({
		name: "select",

		columns(cols: GridColumn[], ctx: DataGridContext): GridColumn[] {
			// No selection, no column. `ctx` is live at first build, so this decision is made
			// before the column defs exist and the grid template can never disagree with it.
			if (modeOf(ctx) === "none") return cols;
			const col: GridColumn = { id: SELECT_COLUMN_ID, header: "", width, sortable: false };
			return position === "end" ? [...cols, col] : [col, ...cols];
		},

		setup(ctx: DataGridContext) {
			// A data replacement invalidates the anchor: row indices no longer mean the same rows.
			const host = ctx.host;
			const reset = () => { anchor = null; };
			host.addEventListener("dj-sort", reset);
			return () => { host.removeEventListener("dj-sort", reset); anchor = null; };
		},

		renderHeader(header: TableHeader<Row, unknown>, ctx: DataGridContext) {
			if (header.column.id !== SELECT_COLUMN_ID) return undefined;
			// Single-select has nothing to "select all" of; render an empty header cell.
			if (modeOf(ctx) !== "multiple") return html`<span class="dj-select-head"></span>`;
			const table = ctx.table;
			const all = table.getIsAllRowsSelected();
			const some = table.getIsSomeRowsSelected();
			// `indeterminate` is a DOM PROPERTY with no matching attribute, so it cannot be
			// templated — `ref` sets it on the element itself after each render.
			return html`<input
				type="checkbox"
				class="dj-select-all"
				part="select-all"
				aria-label=${selectAllLabel}
				.checked=${all}
				${ref((el) => { if (el) (el as HTMLInputElement).indeterminate = !all && some; })}
				@keydown=${(e: KeyboardEvent) => { if (e.key === " ") e.stopPropagation(); }}
				@click=${(e: Event) => e.stopPropagation()}
				@change=${() => table.toggleAllRowsSelected(!all)}
			/>`;
		},

		renderCell(cell: Cell<Row, unknown>, ctx: DataGridContext) {
			if (cell.column.id !== SELECT_COLUMN_ID) return undefined;
			const mode = modeOf(ctx);
			if (mode === "none") return undefined;
			const row = cell.row as TableRow<Row>;
			const single = mode === "single";
			// stopPropagation on click: the row's own handler would otherwise activate or toggle
			// the row underneath the checkbox. The control owns this gesture.
			return html`<input
				type=${single ? "radio" : "checkbox"}
				class="dj-select-row"
				part="select-row"
				aria-label=${nameFor(row.original as Row)}
				.checked=${row.getIsSelected()}
				?disabled=${!row.getCanSelect()}
				@click=${(e: MouseEvent) => {
					e.stopPropagation();
					if (!single && e.shiftKey && anchor !== null) {
						e.preventDefault();
						rangeHandled = true;
						selectRange(ctx, anchor, row.index);
						return;
					}
					anchor = row.index;
				}}
				@keydown=${(e: KeyboardEvent) => {
					// Space belongs to the focused control. The grid's own keydown handler sits on
					// [part="grid"], so without this the event bubbles there and it toggles
					// `activeIndex` — a DIFFERENT row than the one whose checkbox has focus — while
					// its preventDefault also cancels this checkbox's native activation. Arrows,
					// Home and End are deliberately left to bubble so row navigation still works
					// with focus inside the cell.
					if (e.key === " ") e.stopPropagation();
				}}
				@change=${() => {
					if (rangeHandled) { rangeHandled = false; return; }
					if (single) row.toggleSelected(true);
					else row.toggleSelected();
				}}
			/>`;
		},
	});
}

/** Select every row between two row-model indices inclusive. Operates on the ROW MODEL, not the
 *  DOM, so a range spanning rows the virtualizer has never rendered still selects all of them. */
function selectRange(ctx: DataGridContext, from: number, to: number): void {
	const rows = ctx.table.getRowModel().rows;
	const [lo, hi] = from <= to ? [from, to] : [to, from];
	const next: Record<string, boolean> = { ...ctx.table.getState().rowSelection };
	for (let i = lo; i <= hi; i++) {
		const r = rows[i];
		if (r?.getCanSelect()) next[r.id] = true;
	}
	ctx.table.setRowSelection(next);
}

export default selectColumnPlugin;
