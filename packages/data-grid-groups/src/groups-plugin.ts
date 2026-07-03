import { html, type TemplateResult } from "lit";
import { getGroupedRowModel, getExpandedRowModel, type Row as TableRow, type TableOptionsResolved, type AggregationFnOption } from "@tanstack/table-core";
import { getLocale, formatNumber } from "@dojo-ng/i18n";
import { expanderButton } from "@dojo-ng/data-grid-tree";
import { defineDataGridPlugin, type DataGridContext, type DataGridPlugin, type Row } from "@dojo-ng/data-grid";

/** A per-column aggregate: a built-in reducer name, or a function over the group's leaf rows. */
export type Aggregate = "sum" | "mean" | "min" | "max" | "count" | ((rows: TableRow<Row>[]) => unknown);

export interface GroupsOptions {
	/** Column id (or ids) to group by. */
	by: string | string[];
	/** Aggregates keyed by column id. */
	aggregates?: Record<string, Aggregate>;
}

function computeAggregate(agg: Aggregate, leaves: TableRow<Row>[], columnId: string): unknown {
	if (typeof agg === "function") return agg(leaves);
	if (agg === "count") return leaves.length;
	const nums = leaves.map((r) => Number(r.getValue(columnId))).filter((n) => !Number.isNaN(n));
	switch (agg) {
		case "sum": return nums.reduce((a, b) => a + b, 0);
		case "mean": return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
		case "min": return nums.length ? Math.min(...nums) : 0;
		case "max": return nums.length ? Math.max(...nums) : 0;
	}
}

/**
 * `groupsPlugin({ by, aggregates })` — group rows by one or more columns with per-column
 * aggregates (sum/mean/min/max/count or a custom function). Grouped cells show an expander, the
 * group value, and the leaf count; aggregated cells show the aggregate (numeric ones formatted via
 * `@dojo-ng/i18n`); other group cells are blank. When `aggregates` is non-empty a grand-totals row
 * renders below the scroller. v1 rule: use `treePlugin` OR `groupsPlugin` per grid, never both.
 */
export function groupsPlugin({ by, aggregates = {} }: GroupsOptions): DataGridPlugin {
	const grouping = Array.isArray(by) ? by : [by];

	return defineDataGridPlugin({
		name: "groups",
		columns(cols) {
			return cols.map((c) => {
				const agg = aggregates[c.id];
				if (!agg) return c;
				const aggregationFn: AggregationFnOption<Row> =
					typeof agg === "function"
						? (((_columnId: string, leafRows: TableRow<Row>[]) => agg(leafRows)) as AggregationFnOption<Row>)
						: agg; // "sum" | "mean" | "min" | "max" | "count" are built-in TanStack aggregation fns
				return { ...c, aggregationFn };
			});
		},
		tableOptions(): Partial<TableOptionsResolved<Row>> {
			return {
				getGroupedRowModel: getGroupedRowModel(),
				getExpandedRowModel: getExpandedRowModel(),
				initialState: { grouping },
			};
		},
		setup(ctx) {
			// v1: tree XOR groups. Fail fast with a clear message if both are present.
			if (ctx.host.plugins.some((p) => p.name === "tree")) {
				throw new Error("[data-grid-groups] Use treePlugin OR groupsPlugin on a grid, not both (v1).");
			}
		},
		renderCell(cell, ctx) {
			if (cell.getIsGrouped()) {
				const n = cell.row.getLeafRows().length;
				return html`<span style="display:inline-flex;align-items:center;gap:.25rem">${expanderButton(cell.row, ctx)}<span>${cell.getValue()} (${n})</span></span>`;
			}
			if (cell.getIsAggregated()) {
				const v = cell.getValue();
				return typeof v === "number" ? formatNumber(v, getLocale(ctx.host)) : String(v ?? "");
			}
			if (cell.getIsPlaceholder()) return "";
			return undefined;
		},
		chromeBottom(ctx) {
			const entries = Object.entries(aggregates);
			if (!entries.length) return undefined;
			const leaves = ctx.table.getFilteredRowModel().rows;
			const locale = getLocale(ctx.host);
			return html`<div class="dj-dg-totals" part="totals" style="display:flex;gap:1.5rem;font-weight:600">
				${entries.map(([columnId, agg]): TemplateResult => {
					const header = ctx.host.columns.find((c) => c.id === columnId)?.header ?? columnId;
					const value = computeAggregate(agg, leaves, columnId);
					const display = typeof value === "number" ? formatNumber(value, locale) : String(value ?? "");
					return html`<span>${header}: ${display}</span>`;
				})}
			</div>`;
		},
	});
}

export default groupsPlugin;
