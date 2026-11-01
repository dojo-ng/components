import { defineDataGridPlugin, type DataGridContext, type DataGridPlugin, type GridSelection, type Row } from "@dojo-ng/data-grid";
import type { Row as TableRow } from "@tanstack/table-core";

export interface RowDragOptions {
	/** The MIME type the payload is written under, e.g. `"application/x-myapp-items"`. A drop
	 *  target checks for it in `dataTransfer.types`, the only part of a payload a browser shows
	 *  before the drop. */
	type: string;
	/** Build the payload from the dragged rows' data. Written under `type`. In remote mode
	 *  (`rowCount`) `rows` holds only the loaded rows, so use `selection` (the ids, or select all
	 *  with its exceptions) to name the full set. */
	data: (rows: Row[], selection: GridSelection) => string;
	/** Text for the drag image, and the `text/plain` fallback. Defaults to "1 row" / "N rows",
	 *  counted from `selection.count` and formatted for the page's locale ("100,000 rows"). */
	label?: (rows: Row[], selection: GridSelection) => string;
}

/** Detail of `dj-row-dragstart`. Cancel the event to refuse the drag. `rows` is the dragged rows
 *  that are loaded; `selection` names every dragged row (see `GridSelection`). */
export interface RowDragStartDetail { rows: Row[]; selection: GridSelection }
/** Detail of `dj-row-dragend`. `dropEffect` is `"none"` when the drag was dropped nowhere or
 *  canceled with Escape. */
export interface RowDragEndDetail { rows: Row[]; selection: GridSelection; dropEffect: string }

/** Starting a drag on one of these keeps it a click on the control instead. */
const INTERACTIVE = "input, button, a[href], select, textarea, [contenteditable]:not([contenteditable=false])";

const defaultLabel = (_rows: Row[], selection: GridSelection) =>
	(selection.count === 1 ? "1 row" : `${new Intl.NumberFormat().format(selection.count)} rows`);

/**
 * `rowDragPlugin(options)` — makes `<dj-data-grid>` rows drag sources for native HTML5 drag and
 * drop.
 *
 * Every row is `draggable`. Dragging a selected row drags every selected row; dragging an
 * unselected row drags that row alone and leaves the selection as it was. The payload is yours:
 * `data(rows)` is written under `type`, so a drop target (such as `dj-tree` with `canDrop`) can
 * accept exactly the drags it understands. The drag image is a small chip naming what moves.
 *
 * A drag only starts after the pointer moves, so clicking, double clicking, and the checkbox
 * column behave as without the plugin. A drag that starts on a control inside a cell (a checkbox,
 * button, or link) is canceled and stays a click on that control.
 *
 * Events, from the grid: `dj-row-dragstart` (cancelable; detail `{ rows, selection }`), then
 * `dj-row-dragend` (detail `{ rows, selection, dropEffect }`). Dragged rows carry the
 * `row--dragging` part until the drag ends.
 *
 * Remote mode (the grid's `rowCount`): most selected rows may not be loaded, so `rows` is the
 * loaded ones and `selection` (`{ ids, all, except, count }`, as from `grid.selection`) is the
 * full set. With select all on, `selection.all` is true and the chip reads "100,000 rows".
 *
 * Dragging has no keyboard form. Offer the same action another way (WCAG 2.5.7), such as a
 * command that opens a picker.
 */
export function rowDragPlugin(options: RowDragOptions): DataGridPlugin {
	const label = options.label ?? defaultLabel;
	/** Whether a row is being dragged, for the `row--dragging` part. */
	let dragging: (row: TableRow<Row>) => boolean = () => false;
	let draggedData: Row[] = [];
	let draggedSel: GridSelection | undefined;

	return defineDataGridPlugin({
		name: "drag",

		rowAttributes(row: TableRow<Row>): Record<string, string> {
			const attrs: Record<string, string> = { draggable: "true" };
			if (dragging(row)) attrs.part = "row--dragging";
			return attrs;
		},

		setup(ctx: DataGridContext) {
			const host = ctx.host;
			const root = host.renderRoot;

			/** The table row a drag started on, from its composed path; null when it started on a
			 *  control or outside a body row. */
			const rowOf = (e: DragEvent): TableRow<Row> | null => {
				for (const n of e.composedPath()) {
					if (n === host) break;
					const el = n as HTMLElement;
					if (!el.matches) continue;
					if (el.matches(INTERACTIVE)) return null;
					if (el.classList.contains("vrow")) {
						const index = Number((el.id || "").replace(/^r-/, ""));
						return Number.isInteger(index) ? (ctx.rowAt(index) ?? null) : null;
					}
				}
				return null;
			};

			const onStart = (e: Event) => {
				const de = e as DragEvent;
				const row = rowOf(de);
				if (!row) { de.preventDefault(); return; }
				// Under select all the selection record is inverted: it lists the deselected rows.
				const all = host.allSelected;
				const isSelected = (r: TableRow<Row>) => r.getIsSelected() !== all;
				const fromSelection = isSelected(row);
				const rows = !fromSelection ? [row]
					: all ? ctx.table.getCoreRowModel().flatRows.filter(isSelected)
					: ctx.table.getSelectedRowModel().flatRows;
				const data = rows.map((r) => r.original);
				const selection: GridSelection = fromSelection
					? host.selection
					: { ids: [row.id], all: false, except: [], count: 1 };
				const start = new CustomEvent<RowDragStartDetail>("dj-row-dragstart", {
					bubbles: true, composed: true, cancelable: true, detail: { rows: data, selection },
				});
				if (!host.dispatchEvent(start)) { de.preventDefault(); return; }
				const dt = de.dataTransfer;
				const text = label(data, selection);
				if (dt) {
					dt.setData(options.type, options.data(data, selection));
					dt.setData("text/plain", text);
					dt.effectAllowed = "move";
					setDragImage(dt, text);
				}
				const ids = new Set(rows.map((r) => r.id));
				// A select-all drag also marks selected rows that load during the drag.
				dragging = fromSelection && all ? isSelected : (r) => ids.has(r.id);
				draggedData = data;
				draggedSel = selection;
				ctx.refresh();
			};

			const onEnd = (e: Event) => {
				const selection = draggedSel;
				if (!selection) return;
				const dropEffect = (e as DragEvent).dataTransfer?.dropEffect ?? "none";
				const rows = draggedData;
				dragging = () => false;
				draggedData = [];
				draggedSel = undefined;
				ctx.refresh();
				host.dispatchEvent(new CustomEvent<RowDragEndDetail>("dj-row-dragend", {
					bubbles: true, composed: true, detail: { rows, selection, dropEffect },
				}));
			};

			root.addEventListener("dragstart", onStart);
			root.addEventListener("dragend", onEnd);
			return () => {
				root.removeEventListener("dragstart", onStart);
				root.removeEventListener("dragend", onEnd);
				dragging = () => false;
				draggedData = [];
				draggedSel = undefined;
			};
		},
	});
}

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

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-row-dragstart": CustomEvent<RowDragStartDetail>;
		"dj-row-dragend": CustomEvent<RowDragEndDetail>;
	}
}
