import { html, type TemplateResult } from "lit";
import { getExpandedRowModel, type Row as TableRow, type TableOptionsResolved } from "@tanstack/table-core";
import { getLocale, messages, registerDefaults } from "@dojo-ng/i18n";
import { defineDataGridPlugin, type DataGridContext, type DataGridPlugin, type Row } from "@dojo-ng/data-grid";

registerDefaults("dj", { expand: "Expand row", collapse: "Collapse row" });

const EXPANDER_STYLE =
	"min-width:24px;min-height:24px;display:inline-flex;align-items:center;justify-content:center;border:0;background:none;cursor:pointer;padding:0;font:inherit;color:inherit;line-height:1";

/**
 * A real `<button>` that toggles a row's expansion. 24px minimum target, `aria-expanded`, and an
 * `aria-label` from the shared "dj" i18n namespace (expand/collapse). Clicking toggles the row,
 * refreshes the grid, and emits `dj-expand-change`. Exported so the groups and detail plugins can
 * reuse it instead of re-implementing an expander.
 */
export function expanderButton(row: TableRow<Row>, ctx: DataGridContext): TemplateResult {
	const expanded = row.getIsExpanded();
	const label = messages.resolve("dj", getLocale(ctx.host), expanded ? "collapse" : "expand") ?? (expanded ? "Collapse row" : "Expand row");
	return html`<button
		type="button"
		part="expander"
		class="dj-dg-expander"
		style=${EXPANDER_STYLE}
		aria-expanded=${expanded}
		aria-label=${label}
		@click=${(e: Event) => {
			e.stopPropagation();
			row.toggleExpanded();
			ctx.refresh();
			ctx.host.emit("dj-expand-change", { detail: { row: row.original as Row, expanded: row.getIsExpanded() } });
		}}
	>${expanded ? "▾" : "▸"}</button>`;
}

export interface TreeOptions {
	/** Row property holding the child rows (default "children"). */
	childrenKey?: string;
}

/**
 * `treePlugin({ childrenKey })` — hierarchical rows from a nested `children` array. Adds an
 * expander and depth indent to each row's first cell, marks the grid a `treegrid` with per-row
 * `aria-level`/`aria-expanded`, and drives expansion with ArrowRight/ArrowLeft on the active row.
 * Emits `dj-expand-change`. Use `treePlugin` OR `groupsPlugin` per grid, never both.
 */
export function treePlugin({ childrenKey = "children" }: TreeOptions = {}): DataGridPlugin {
	const setExpanded = (row: TableRow<Row>, ctx: DataGridContext, expanded: boolean) => {
		row.toggleExpanded(expanded);
		ctx.refresh();
		ctx.host.emit("dj-expand-change", { detail: { row: row.original as Row, expanded } });
	};

	return defineDataGridPlugin({
		name: "tree",
		tableOptions(): Partial<TableOptionsResolved<Row>> {
			// NOTE: paginateExpandedRows is left at its default (true). The spec asked for `false`, but
			// that value only flattens expanded children inside a pagination row model — with no
			// pagination present it returns the UNexpanded model, so a standalone tree would never show
			// children (verified against @tanstack/table-core). Default `true` flattens correctly here;
			// tree + pagination still works (expanded rows just page with the rest).
			return {
				getExpandedRowModel: getExpandedRowModel(),
				getSubRows: (row) => (row as Record<string, unknown>)[childrenKey] as Row[] | undefined,
			};
		},
		rowAttributes(row) {
			const attrs: Record<string, string> = { "aria-level": String(row.depth + 1) };
			if (row.getCanExpand()) attrs["aria-expanded"] = String(row.getIsExpanded());
			return attrs;
		},
		decorateCell(cell, content, ctx) {
			const first = ctx.table.getVisibleLeafColumns()[0];
			if (!first || cell.column.id !== first.id) return content;
			const row = cell.row;
			const control = row.getCanExpand()
				? expanderButton(row, ctx)
				: html`<span style="display:inline-block;min-width:24px"></span>`;
			return html`<span style="display:inline-flex;align-items:center;gap:.25rem;padding-inline-start:${row.depth}rem">${control}${content}</span>`;
		},
		setup(ctx) {
			// role=treegrid on the grid container. `role="grid"` is a static template attribute (set once
			// at creation, never re-applied), so overriding it after the first render persists.
			let grid: HTMLElement | null = null;
			ctx.host.updateComplete.then(() => {
				grid = ctx.host.renderRoot?.querySelector('[part="grid"]') as HTMLElement | null;
				grid?.setAttribute("role", "treegrid");
			});
			// ArrowRight/ArrowLeft aren't handled by the core grid, so drive expansion here. Listen on the
			// host in capture (keydown is composed; the grid element doesn't exist at setup — review-fix 2.5).
			const onKeydown = (e: KeyboardEvent) => {
				if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
				const row = ctx.table.getRowModel().rows[ctx.host.activeIndex];
				if (!row) return;
				if (e.key === "ArrowRight") {
					if (row.getCanExpand() && !row.getIsExpanded()) { e.preventDefault(); setExpanded(row, ctx, true); }
				} else if (row.getIsExpanded()) {
					e.preventDefault();
					setExpanded(row, ctx, false);
				} else {
					// Collapsed (or a leaf): ARIA treegrid moves focus to the parent row.
					const parent = row.getParentRow();
					if (parent) {
						const idx = ctx.table.getRowModel().rows.findIndex((r) => r.id === parent.id);
						if (idx >= 0) { e.preventDefault(); ctx.host.activeIndex = idx; }
					}
				}
			};
			ctx.host.addEventListener("keydown", onKeydown, true);
			return () => {
				ctx.host.removeEventListener("keydown", onKeydown, true);
				grid?.setAttribute("role", "grid");
			};
		},
	});
}

export default treePlugin;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-expand-change": CustomEvent<{ row: Row; expanded: boolean }>;
	}
}
