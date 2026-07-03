import { html, type TemplateResult } from "lit";
import "@dojo-ng/text-input";
import { getFilteredRowModel, type TableOptionsResolved } from "@tanstack/table-core";
import { defineDataGridPlugin, type DataGridContext, type DataGridPlugin, type Row } from "@dojo-ng/data-grid";

// Per-column config rides on GridColumn (plain objects). Core never reads it.
declare module "@dojo-ng/data-grid" {
	interface GridColumn {
		/** Show a per-column filter control in the subheader row: a text box or a value dropdown. */
		filter?: "text" | "select";
	}
}

export interface FilterOptions {
	/** Show the full-width quick (global) filter above the header. Default `true`. */
	quick?: boolean;
}

const DEBOUNCE_MS = 150;

/**
 * `filterPlugin({ quick })` — a quick (global) filter above the header plus optional per-column
 * filters in a subheader row. Both drive TanStack through the table API (`setGlobalFilter` /
 * `column.setFilterValue`), never by poking core state, so the core `onStateChange` runs and the
 * virtualizer row count follows the narrowed set. Column filters are declared per column via
 * `GridColumn.filter` ("text" or "select"). Text inputs are debounced 150 ms.
 */
export function filterPlugin({ quick = true }: FilterOptions = {}): DataGridPlugin {
	const timers = new Map<string, ReturnType<typeof setTimeout>>();
	const debounce = (key: string, fn: () => void) => {
		const prev = timers.get(key);
		if (prev) clearTimeout(prev);
		timers.set(key, setTimeout(() => { timers.delete(key); fn(); }, DEBOUNCE_MS));
	};
	const valueOf = (e: Event) => (e.currentTarget as unknown as { value: string }).value;

	return defineDataGridPlugin({
		name: "filter",
		tableOptions(): Partial<TableOptionsResolved<Row>> {
			return { getFilteredRowModel: getFilteredRowModel(), globalFilterFn: "includesString" };
		},
		setup() {
			// Clear pending debounced writes on rebuild/disconnect.
			return () => { for (const t of timers.values()) clearTimeout(t); timers.clear(); };
		},
		chromeTop(ctx) {
			if (!quick) return undefined;
			return html`<dj-text-input
				label="Filter"
				label-hidden
				placeholder="Filter"
				@input=${(e: Event) => { const v = valueOf(e); debounce("__global", () => ctx.table.setGlobalFilter(v)); }}
			></dj-text-input>`;
		},
		subheaderCells(ctx) {
			const cols = ctx.table.getVisibleLeafColumns();
			// Only render the subheader row when at least one column declares a filter.
			const anyFilter = cols.some((leaf) => ctx.host.columns.find((c) => c.id === leaf.id)?.filter);
			if (!anyFilter) return undefined;

			return cols.map((leaf): TemplateResult | null => {
				const kind = ctx.host.columns.find((c) => c.id === leaf.id)?.filter;
				if (kind === "text") {
					return html`<dj-text-input
						label=${`Filter ${leaf.id}`}
						label-hidden
						@input=${(e: Event) => { const v = valueOf(e); debounce(leaf.id, () => leaf.setFilterValue(v || undefined)); }}
					></dj-text-input>`;
				}
				if (kind === "select") {
					const uniques = [...new Set(ctx.table.getPreFilteredRowModel().rows.map((r) => r.getValue(leaf.id)))]
						.filter((v) => v !== null && v !== undefined)
						.map(String)
						.sort();
					return html`<select
						aria-label=${`Filter ${leaf.id}`}
						@change=${(e: Event) => { const v = valueOf(e); leaf.setFilterValue(v || undefined); }}
					>
						<option value="">All</option>
						${uniques.map((u) => html`<option value=${u}>${u}</option>`)}
					</select>`;
				}
				return null;
			});
		},
	});
}

export default filterPlugin;
