import { html } from "lit";
import "@dojo-ng/pagination";
import { getPaginationRowModel, type TableOptionsResolved } from "@tanstack/table-core";
import { defineDataGridPlugin, type DataGridPlugin, type Row } from "@dojo-ng/data-grid";

export interface PaginationOptions {
	/** Rows per page (default 25). Seeds `initialState.pagination`. */
	pageSize?: number;
	/** Choices offered in the page-size dropdown (default [10, 25, 50, 100]). */
	pageSizes?: number[];
}

/**
 * `paginationPlugin({ pageSize, pageSizes })` — page navigation below the scroller, reusing the
 * existing `<dj-pagination>` plus a page-size dropdown. Both drive TanStack through the table API
 * (`setPageIndex` / `setPageSize`), so the core `onStateChange` runs and the virtualizer row count
 * follows the current page (T1's count-sync). Composes with the quick filter: TanStack filters
 * first, then paginates, so the page count shrinks to the filtered set automatically.
 */
export function paginationPlugin({ pageSize = 25, pageSizes = [10, 25, 50, 100] }: PaginationOptions = {}): DataGridPlugin {
	return defineDataGridPlugin({
		name: "pagination",
		tableOptions(): Partial<TableOptionsResolved<Row>> {
			// initialState flows into the T1 seed via table.initialState.
			return { getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageIndex: 0, pageSize } } };
		},
		chromeBottom(ctx) {
			const { pageIndex, pageSize: current } = ctx.table.getState().pagination;
			const pageCount = ctx.table.getPageCount();
			return html`
				<dj-pagination
					.total=${Math.max(1, pageCount)}
					.page=${pageIndex + 1}
					@dj-page=${(e: CustomEvent<{ page: number }>) => ctx.table.setPageIndex(e.detail.page - 1)}
				></dj-pagination>
				<label class="dj-dg-pagesize">
					Rows per page:
					<select
						aria-label="Rows per page"
						@change=${(e: Event) => ctx.table.setPageSize(Number((e.currentTarget as HTMLSelectElement).value))}
					>
						${pageSizes.map((s) => html`<option value=${s} ?selected=${s === current}>${s}</option>`)}
					</select>
				</label>
			`;
		},
	});
}

export default paginationPlugin;
