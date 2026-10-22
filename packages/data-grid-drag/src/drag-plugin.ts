import { defineDataGridPlugin, type DataGridContext, type DataGridPlugin, type Row } from "@dojo-ng/data-grid";
import type { Row as TableRow } from "@tanstack/table-core";

export interface RowDragOptions {
	/** The MIME type the payload is written under, e.g. `"application/x-myapp-items"`. A drop
	 *  target checks for it in `dataTransfer.types`, the only part of a payload a browser shows
	 *  before the drop. */
	type: string;
	/** Build the payload from the dragged rows' data. Written under `type`. */
	data: (rows: Row[]) => string;
	/** Text for the drag image, and the `text/plain` fallback. Defaults to "1 row" / "N rows". */
	label?: (rows: Row[]) => string;
}

/** Detail of `dj-row-dragstart`. Cancel the event to refuse the drag. */
export interface RowDragStartDetail { rows: Row[] }
/** Detail of `dj-row-dragend`. `dropEffect` is `"none"` when the drag was dropped nowhere or
 *  canceled with Escape. */
export interface RowDragEndDetail { rows: Row[]; dropEffect: string }

/** Starting a drag on one of these keeps it a click on the control instead. */
const INTERACTIVE = "input, button, a[href], select, textarea, [contenteditable]:not([contenteditable=false])";

const defaultLabel = (rows: Row[]) => (rows.length === 1 ? "1 row" : `${rows.length} rows`);

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
 * Events, from the grid: `dj-row-dragstart` (cancelable; detail `{ rows }`), then
 * `dj-row-dragend` (detail `{ rows, dropEffect }`). Dragged rows carry the `row--dragging` part
 * until the drag ends.
 *
 * Dragging has no keyboard form. Offer the same action another way (WCAG 2.5.7), such as a
 * command that opens a picker.
 */
export function rowDragPlugin(options: RowDragOptions): DataGridPlugin {
	const label = options.label ?? defaultLabel;
	/** Row ids being dragged, for the `row--dragging` part. */
	let dragging = new Set<string>();
	let draggedData: Row[] = [];

	return defineDataGridPlugin({
		name: "drag",

		rowAttributes(row: TableRow<Row>): Record<string, string> {
			const attrs: Record<string, string> = { draggable: "true" };
			if (dragging.has(row.id)) attrs.part = "row--dragging";
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
						return Number.isInteger(index) ? (ctx.table.getRowModel().rows[index] ?? null) : null;
					}
				}
				return null;
			};

			const onStart = (e: Event) => {
				const de = e as DragEvent;
				const row = rowOf(de);
				if (!row) { de.preventDefault(); return; }
				const rows = row.getIsSelected() ? ctx.table.getSelectedRowModel().flatRows : [row];
				const data = rows.map((r) => r.original);
				const start = new CustomEvent<RowDragStartDetail>("dj-row-dragstart", {
					bubbles: true, composed: true, cancelable: true, detail: { rows: data },
				});
				if (!host.dispatchEvent(start)) { de.preventDefault(); return; }
				const dt = de.dataTransfer;
				const text = label(data);
				if (dt) {
					dt.setData(options.type, options.data(data));
					dt.setData("text/plain", text);
					dt.effectAllowed = "move";
					setDragImage(dt, text);
				}
				dragging = new Set(rows.map((r) => r.id));
				draggedData = data;
				ctx.refresh();
			};

			const onEnd = (e: Event) => {
				if (!dragging.size) return;
				const dropEffect = (e as DragEvent).dataTransfer?.dropEffect ?? "none";
				const rows = draggedData;
				dragging = new Set();
				draggedData = [];
				ctx.refresh();
				host.dispatchEvent(new CustomEvent<RowDragEndDetail>("dj-row-dragend", {
					bubbles: true, composed: true, detail: { rows, dropEffect },
				}));
			};

			root.addEventListener("dragstart", onStart);
			root.addEventListener("dragend", onEnd);
			return () => {
				root.removeEventListener("dragstart", onStart);
				root.removeEventListener("dragend", onEnd);
				dragging = new Set();
				draggedData = [];
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
