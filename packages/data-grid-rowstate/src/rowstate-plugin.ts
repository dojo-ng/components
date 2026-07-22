import { html } from "lit";
import { defineDataGridPlugin, type DataGridPlugin, type Row } from "@dojo-ng/data-grid";
import type { Cell, Row as TableRow } from "@tanstack/table-core";

export interface RowStateOptions {
	/**
	 * Classify a row into state tokens from its data (`row.original`). Each token
	 * `T` is exposed as an extra shadow part `row--T` on the row element, so a
	 * consumer styles whole-row treatment from its own CSS:
	 * `dj-data-grid::part(row--unread) { font-weight: 500 }`. Return a token, a
	 * list of tokens, or null/undefined for none. Tokens must match
	 * `/^[a-z0-9-]+$/` (a part name can't contain spaces); an invalid one is
	 * dropped with a single `console.warn`.
	 */
	row?: (data: Row) => string | string[] | null | undefined;
	/**
	 * An inline CSS style string for a given cell (by column id + row data), or
	 * undefined to leave it unstyled. The plugin wraps that cell's content in a
	 * `<span style="…">` via `decorateCell`, so it composes with other plugins'
	 * cell decoration instead of replacing content. The string may reference
	 * `--dj-*` tokens and custom properties, so it stays themeable.
	 */
	cell?: (columnId: string, data: Row) => string | undefined;
}

const TOKEN = /^[a-z0-9-]+$/;

/**
 * `rowStatePlugin({ row, cell })` — data-driven styling of rows and cells from
 * outside the grid's shadow DOM. `row()` classifies a row into state tokens,
 * each surfaced as a `row--T` shadow part for `::part()` styling; `cell()`
 * returns an inline style for a column's content. Both are optional and pure
 * functions of row data, so the grid core never learns a consumer's states.
 *
 * Row parts ride the core `rowAttributes` hook. Core reconciles plugin-returned
 * attributes each render and removes any key a plugin stops returning, and it
 * overwrites the row template's static `part="row"` once a plugin sets `part` —
 * so this plugin ALWAYS emits the base `row` token (an unstated row returns
 * `{ part: "row" }`), otherwise the base part would be stripped off the reused
 * virtual-scroll rows. Only one plugin may own `part`; combining with
 * tree/groups (which set `aria-*`, different keys) composes fine.
 */
export function rowStatePlugin(options: RowStateOptions = {}): DataGridPlugin {
	const warned = new Set<string>();
	const tokensFor = (data: Row): string[] => {
		const raw = options.row?.(data);
		const list = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
		const out: string[] = [];
		for (const token of list) {
			if (TOKEN.test(token)) {
				out.push(token);
			} else if (!warned.has(token)) {
				warned.add(token);
				console.warn(`data-grid-rowstate: ignoring invalid state token ${JSON.stringify(token)} (allowed: a-z, 0-9, hyphen)`);
			}
		}
		return out;
	};

	return defineDataGridPlugin({
		name: "rowstate",
		rowAttributes(row: TableRow<Row>): Record<string, string> {
			// Never touch `part` unless a classifier is provided, so a plugin with
			// only `cell` leaves the template's static part alone.
			if (!options.row) return {};
			const tokens = tokensFor(row.original as Row);
			return { part: ["row", ...tokens.map((t) => `row--${t}`)].join(" ") };
		},
		decorateCell(cell: Cell<Row, unknown>, content: unknown): unknown {
			if (!options.cell) return content;
			const style = options.cell(cell.column.id, cell.row.original as Row);
			return style ? html`<span style=${style}>${content}</span>` : content;
		},
	});
}

export default rowStatePlugin;
