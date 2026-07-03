import type { TemplateResult } from "lit";
import { getExpandedRowModel, type Row as TableRow, type TableOptionsResolved } from "@tanstack/table-core";
import { defineDataGridPlugin, type DataGridContext, type DataGridPlugin, type GridColumn, type Row } from "@dojo-ng/data-grid";
import { expanderButton } from "@dojo-ng/data-grid-tree";

export interface DetailOptions {
	/** Detail content rendered full-width under an expanded row. Any template — a nested
	 *  `<dj-data-grid>` is the "subgrid" case. */
	render: (row: TableRow<Row>, ctx: DataGridContext) => TemplateResult;
}

/**
 * `detailPlugin({ render })` — master-detail rows. Injects a leading expander column
 * (id `__detail`; synthetic `__` columns are skipped by CSV export), tracks expansion via
 * TanStack's expanded state (`getRowCanExpand: () => true`, no subRows needed), and renders
 * `render(row, ctx)` full-width under each expanded row. Expanding switches the grid's
 * virtualizer to measured (variable-height) rows; collapsed grids keep the fixed-height path.
 * Reuses the tree package's `expanderButton`, so `dj-expand-change` fires on toggle.
 */
export function detailPlugin({ render }: DetailOptions): DataGridPlugin {
	return defineDataGridPlugin({
		name: "detail",
		columns(cols: GridColumn[]): GridColumn[] {
			return [{ id: "__detail", header: "", sortable: false, width: "2.5rem" }, ...cols];
		},
		tableOptions(): Partial<TableOptionsResolved<Row>> {
			// Expanded state without subRows: every row can "expand" (into its detail panel).
			return { getExpandedRowModel: getExpandedRowModel(), getRowCanExpand: () => true };
		},
		renderCell(cell, ctx) {
			return cell.column.id === "__detail" ? expanderButton(cell.row, ctx) : undefined;
		},
		renderDetail(row, ctx) {
			return row.getIsExpanded() ? render(row, ctx) : undefined;
		},
		setup(ctx) {
			// Keyboard parity with the pointer expander: ArrowRight opens the active row's detail,
			// ArrowLeft closes it. Capture on the host (composed keydown; the shadow grid element
			// does not exist at setup time — same reasoning as the tree plugin).
			const onKeydown = (e: KeyboardEvent) => {
				if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
				const row = ctx.table.getRowModel().rows[ctx.host.activeIndex];
				if (!row) return;
				const expand = e.key === "ArrowRight";
				if (row.getIsExpanded() === expand) return;
				e.preventDefault();
				row.toggleExpanded(expand);
				ctx.refresh();
				ctx.host.emit("dj-expand-change", { detail: { row: row.original as Row, expanded: expand } });
			};
			ctx.host.addEventListener("keydown", onKeydown, true);
			return () => ctx.host.removeEventListener("keydown", onKeydown, true);
		},
	});
}

export default detailPlugin;
