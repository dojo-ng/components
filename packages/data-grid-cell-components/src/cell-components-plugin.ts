import { html, type TemplateResult } from "lit";
import "@dojo-ng/button";
import { defineDataGridPlugin, type DataGridContext, type DataGridPlugin, type Row } from "@dojo-ng/data-grid";

/** Arbitrary Lit content for a column's cells. `ctx` is the live grid context (host, table). */
export type CellRender = (value: unknown, row: Row, ctx: DataGridContext) => TemplateResult;

// Per-column config rides on GridColumn (plain objects). Core never reads it.
declare module "@dojo-ng/data-grid" {
	interface GridColumn {
		/** Render arbitrary Lit content for this column's cells (dj-button, dj-icon, a chart…). */
		render?: CellRender;
	}
}

/**
 * `cellComponentsPlugin()` — lets a column render arbitrary Lit content via `GridColumn.render`,
 * so consumers can drop a `dj-button`, `dj-icon`, `dj-chip`, a checkmark, or a sparkline into a
 * cell. Columns without `render` fall through (returns undefined) to other plugins and the core
 * default. Two prebuilt helpers ({@link actionButton}, {@link checkmarkCell}) cover the common
 * cases without authoring a template.
 *
 * Interactivity note: buttons inside cells are reachable by mouse and touch today. Cell-level
 * keyboard navigation is a later core feature and is not provided here.
 */
export function cellComponentsPlugin(): DataGridPlugin {
	return defineDataGridPlugin({
		name: "cell-components",
		renderCell(cell, ctx) {
			const render = ctx.host.columns.find((c) => c.id === cell.column.id)?.render;
			if (!render) return undefined;
			return render(cell.getValue(), cell.row.original as Row, ctx);
		},
	});
}

export interface ActionButtonOptions {
	/** dj-button kind (default `"text"`). */
	kind?: "contained" | "outlined" | "text";
	/** Content in place of the label (an icon template/string); `label` stays the accessible name. */
	icon?: TemplateResult | string;
	/** Disable the button per-row. */
	disabled?: (value: unknown, row: Row) => boolean;
}

/**
 * A cell renderer that shows a small `dj-button`. Clicking it emits `dj-cell-action`
 * `{ action, row }` from the host (and stops the click from also selecting the row). Use as a
 * column's `render`: `{ id: "edit", render: actionButton("Edit", "edit") }`.
 */
export function actionButton(label: string, action: string, opts: ActionButtonOptions = {}): CellRender {
	return (value, row, ctx) => html`<dj-button
		kind=${opts.kind ?? "text"}
		aria-label=${label}
		?disabled=${opts.disabled?.(value, row) ?? false}
		@click=${(e: Event) => { e.stopPropagation(); ctx.host.emit("dj-cell-action", { detail: { action, row } }); }}
	>${opts.icon ?? label}</dj-button>`;
}

export interface CheckmarkOptions {
	/** Accessible text alternative when truthy (default `"Yes"`). */
	yes?: string;
	/** Accessible text alternative when falsy (default `"No"`). */
	no?: string;
}

// Self-contained visually-hidden style so the text alternative works without relying on the grid's
// stylesheet (the cell renders inside the grid's shadow root).
const VISUALLY_HIDDEN = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";

/**
 * A cell renderer that shows a checkmark (✓) when the value is truthy and nothing when falsy. The
 * glyph is `aria-hidden`; a visually-hidden text alternative ("Yes"/"No") carries the meaning to
 * assistive tech.
 */
export function checkmarkCell(opts: CheckmarkOptions = {}): CellRender {
	const yes = opts.yes ?? "Yes";
	const no = opts.no ?? "No";
	return (value) =>
		value
			? html`<span aria-hidden="true">✓</span><span style=${VISUALLY_HIDDEN}>${yes}</span>`
			: html`<span style=${VISUALLY_HIDDEN}>${no}</span>`;
}

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-cell-action": CustomEvent<{ action: string; row: Row }>;
	}
}
