import { html, type TemplateResult } from "lit";
import { ref } from "lit/directives/ref.js";
import "@dojo-ng/text-input";
import "@dojo-ng/number-input";
import "@dojo-ng/native-select";
import type { Cell } from "@tanstack/table-core";
import { defineDataGridPlugin, type DataGridContext, type DataGridPlugin, type Row } from "@dojo-ng/data-grid";

/** How a column is edited. `true` = a text box; an object picks the control (and select options). */
export type ColumnEditable = true | { control: "text" | "number" | "select"; options?: { value: string; label: string }[] };

// Per-column config rides on GridColumn (plain objects). Core never reads it.
declare module "@dojo-ng/data-grid" {
	interface GridColumn {
		/** Make this column editable inline. See {@link ColumnEditable}. */
		editable?: ColumnEditable;
	}
}

type Editing = { rowId: string; columnId: string } | null;

/**
 * `editPlugin()` — CONTROLLED inline editing. Start editing with Enter or F2 on the active row
 * (its first editable column) or by double-clicking an editable cell. Commit with Enter or by
 * blurring the editor; cancel with Escape. On commit the plugin emits `dj-cell-commit`
 * `{ row, columnId, value, oldValue }` and NEVER mutates `data` — the consumer updates its store
 * and reassigns `grid.data`:
 *
 * ```js
 * grid.addEventListener("dj-cell-commit", (e) => {
 *   const { row, columnId, value } = e.detail;
 *   const next = data.map((r) => (r === row ? { ...r, [columnId]: value } : r));
 *   grid.data = next;
 * });
 * ```
 *
 * Columns opt in via `GridColumn.editable`; place this plugin FIRST in the array so its editor
 * wins the cell over formatting/component plugins while a cell is being edited.
 */
export function editPlugin(): DataGridPlugin {
	let editing: Editing = null;

	const editableOf = (ctx: DataGridContext, id: string): ColumnEditable | undefined =>
		ctx.host.columns.find((c) => c.id === id)?.editable;

	const isEditing = (cell: Cell<Row, unknown>) =>
		!!editing && editing.rowId === cell.row.id && editing.columnId === cell.column.id;

	const start = (ctx: DataGridContext, rowId: string, columnId: string) => {
		editing = { rowId, columnId };
		ctx.refresh();
	};
	const cancel = (ctx: DataGridContext) => {
		if (!editing) return;
		editing = null;
		ctx.refresh();
	};
	const commit = (ctx: DataGridContext, cell: Cell<Row, unknown>, raw: string) => {
		if (!isEditing(cell)) return; // already committed/cancelled (e.g. a trailing blur)
		const ed = editableOf(ctx, cell.column.id);
		const value = typeof ed === "object" && ed.control === "number" ? (raw === "" ? null : Number(raw)) : raw;
		const oldValue = cell.getValue();
		editing = null;
		ctx.host.emit("dj-cell-commit", { detail: { row: cell.row.original as Row, columnId: cell.column.id, value, oldValue } });
		ctx.refresh();
	};

	const editor = (ctx: DataGridContext, cell: Cell<Row, unknown>): TemplateResult => {
		const ed = editableOf(ctx, cell.column.id)!;
		const control = ed === true ? "text" : ed.control;
		const seed = String(cell.getValue() ?? "");
		const focusOnMount = ref((el) => {
			const c = el as (HTMLElement & { updateComplete?: Promise<unknown>; focus(): void }) | undefined;
			if (c) c.updateComplete?.then(() => c.focus());
		});
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); commit(ctx, cell, (e.currentTarget as unknown as { value: string }).value); }
			else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancel(ctx); }
		};
		const onBlur = (e: FocusEvent) => commit(ctx, cell, (e.currentTarget as unknown as { value: string }).value);

		if (control === "select") {
			const options = ed !== true && ed.options ? ed.options : [];
			return html`<dj-native-select label=${cell.column.id} label-hidden .options=${options} .value=${seed} @keydown=${onKey} @focusout=${onBlur} ${focusOnMount}></dj-native-select>`;
		}
		if (control === "number") {
			return html`<dj-number-input label=${cell.column.id} label-hidden .value=${seed} @keydown=${onKey} @focusout=${onBlur} ${focusOnMount}></dj-number-input>`;
		}
		return html`<dj-text-input label=${cell.column.id} label-hidden .value=${seed} @keydown=${onKey} @focusout=${onBlur} ${focusOnMount}></dj-text-input>`;
	};

	return defineDataGridPlugin({
		name: "edit",
		setup(ctx) {
			// The grid's tabindex/keydown live on the [role=grid] element (review-fix 2.5), which does
			// not exist yet in setup (renderRoot is created on first update). Listen on the host in the
			// CAPTURE phase: keydown events are composed, so they pass through the host on the way down,
			// and capturing lets us pre-empt the grid's own Enter→select before it runs.
			const onKeydown = (e: KeyboardEvent) => {
				if (editing) return; // the editor handles its own keys
				if (e.key !== "Enter" && e.key !== "F2") return;
				const row = ctx.table.getRowModel().rows[ctx.host.activeIndex];
				if (!row) return;
				const firstEditable = ctx.table.getVisibleLeafColumns().find((l) => editableOf(ctx, l.id));
				if (!firstEditable) return;
				e.preventDefault();
				e.stopPropagation();
				start(ctx, row.id, firstEditable.id);
			};
			ctx.host.addEventListener("keydown", onKeydown, true);
			return () => {
				ctx.host.removeEventListener("keydown", onKeydown, true);
				editing = null;
			};
		},
		renderCell(cell, ctx) {
			return isEditing(cell) ? editor(ctx, cell) : undefined;
		},
		decorateCell(cell, content, ctx) {
			if (!editableOf(ctx, cell.column.id) || isEditing(cell)) return content;
			// Editable, not currently editing: let the value render normally but make a double-click
			// start editing this column.
			return html`<span class="dj-dg-editable" style="display:block;cursor:text" @dblclick=${() => start(ctx, cell.row.id, cell.column.id)}>${content}</span>`;
		},
	});
}

export default editPlugin;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-cell-commit": CustomEvent<{ row: Row; columnId: string; value: unknown; oldValue: unknown }>;
	}
}
