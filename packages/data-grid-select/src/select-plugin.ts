import { html } from "lit";
import { ref } from "lit/directives/ref.js";
import { defineDataGridPlugin, type DataGridContext, type DataGridPlugin, type GridColumn, type Row } from "@dojo-ng/data-grid";
import type { Cell, Header as TableHeader, Row as TableRow } from "@tanstack/table-core";

/** The column id the plugin owns. Exported so a consumer can spot it in a `columns()` chain. */
export const SELECT_COLUMN_ID = "dj-select";

/**
 * Default track width. The grid's own cell rule is
 * `padding: … var(--dj-spacing-small, .75rem); overflow: hidden; text-overflow: ellipsis`,
 * so a track sized for the control ALONE leaves it overflowing its padding box — and an
 * overflowing inline child makes the cell paint an ellipsis next to the checkbox (visible in
 * WebKit). Size the track as control + the cell's own horizontal padding, reading the same
 * token the cell does so this follows a themed spacing change instead of guessing at it.
 */
const DEFAULT_WIDTH = "calc(1.5rem + var(--dj-spacing-small, 0.75rem) * 2)";

export interface SelectColumnOptions {
	/**
	 * Track width for the checkbox column. Any grid track value. Defaults to the control's
	 * width plus the grid cell's horizontal padding; a narrower value will clip the checkbox
	 * and show the cell's ellipsis, so include the padding in anything you set here.
	 */
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
 *
 * Remote mode (the grid's `rowCount`): the header checkbox selects every row on the server
 * (`grid.selectAll()`, the grid's `allSelected`), and shows indeterminate once any row is
 * unticked. A Shift range over rows that are not loaded waits for the grid to fetch them, then
 * selects; if the list changes first, it is dropped and the selection stays as it was.
 */
export function selectColumnPlugin(options: SelectColumnOptions = {}): DataGridPlugin {
	const width = options.width ?? DEFAULT_WIDTH;
	const position = options.position ?? "start";
	const nameFor = (data: Row) => options.label?.(data) ?? "Select row";
	const selectAllLabel = options.selectAllLabel ?? "Select all rows";

	// Anchor for shift-click ranges: the grid index (`ctx.indexOf`, absolute in remote mode) of
	// the last plainly-clicked checkbox. Reset when a sort reorders the rows (see `setup`), and
	// moved with its row by the grid's `insertRows`/`removeRows` (see `shiftRows`).
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

		shiftRows(at: number, delta: number) {
			if (anchor === null || anchor < at) return;
			// A removal that takes the anchor row itself leaves no anchor.
			if (delta < 0 && anchor < at - delta) anchor = null;
			else anchor += delta;
		},

		renderHeader(header: TableHeader<Row, unknown>, ctx: DataGridContext) {
			if (header.column.id !== SELECT_COLUMN_ID) return undefined;
			// Single-select has nothing to "select all" of; render an empty header cell.
			if (modeOf(ctx) !== "multiple") return html`<span class="dj-select-head"></span>`;
			const table = ctx.table;
			const host = ctx.host;
			// Remote mode counts rows on the server, not the loaded ones TanStack can see.
			const remote = typeof host.rowCount === "number";
			const sel = remote ? host.selection : undefined;
			const all = sel ? sel.all && sel.except.length === 0 : table.getIsAllRowsSelected();
			const some = sel ? sel.count > 0 : table.getIsSomeRowsSelected();
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
				@change=${() => {
					if (!remote) table.toggleAllRowsSelected(!all);
					else if (all) host.clearSelection();
					else host.selectAll();
				}}
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
			// `display:block` is load-bearing, not cosmetic: `text-overflow: ellipsis` on the grid's
			// cell only applies to overflowing INLINE content, so a block-level control can never
			// make the cell paint an ellipsis beside the checkbox however narrow the track gets.
			// `margin: 0 auto` also drops the UA's own checkbox margin and centres it in the track.
			return html`<input
				style="display:block;margin:0 auto"
				type=${single ? "radio" : "checkbox"}
				class="dj-select-row"
				part="select-row"
				aria-label=${nameFor(row.original as Row)}
				.checked=${row.getIsSelected() !== ctx.host.allSelected}
				?disabled=${!row.getCanSelect()}
				@click=${(e: MouseEvent) => {
					e.stopPropagation();
					if (!single && e.shiftKey && anchor !== null) {
						e.preventDefault();
						rangeHandled = true;
						selectRange(ctx, anchor, ctx.indexOf(row));
						return;
					}
					anchor = ctx.indexOf(row);
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

/** Select every row between two grid indices inclusive. Reads rows through `ctx.rowAt`, not the
 *  DOM, so a range spanning rows the virtualizer has never rendered still selects all of them.
 *  When some rows are not loaded (remote mode), it waits for `ctx.rowIds` and then selects by id;
 *  `undefined` from it means the list changed, and nothing is selected. */
function selectRange(ctx: DataGridContext, from: number, to: number): void {
	const [lo, hi] = from <= to ? [from, to] : [to, from];
	const ids: string[] = [];
	for (let i = lo; i <= hi; i++) {
		const r = ctx.rowAt(i);
		if (!r) {
			void ctx.rowIds(lo, hi).then((all) => { if (all) applyIds(ctx, all); });
			return;
		}
		if (r.getCanSelect()) ids.push(r.id);
	}
	applyIds(ctx, ids);
}

/** Mark ids selected. Under the grid's `allSelected` the record is inverted (it lists the
 *  deselected rows), so selecting means removing them from it. */
function applyIds(ctx: DataGridContext, ids: string[]): void {
	const inverted = ctx.host.allSelected;
	const next: Record<string, boolean> = { ...ctx.table.getState().rowSelection };
	for (const id of ids) {
		if (inverted) delete next[id];
		else next[id] = true;
	}
	ctx.table.setRowSelection(next);
}

export default selectColumnPlugin;
