import { html } from "lit";
import type { Table } from "@tanstack/table-core";
import { getLocale, messages, registerDefaults } from "@dojo-ng/i18n";
import { defineDataGridPlugin, type DataGridContext, type DataGridPlugin, type DjDataGrid, type Row } from "@dojo-ng/data-grid";
import "@dojo-ng/button";

registerDefaults("dj", { exportCsv: "Export CSV" });

export interface CsvOptions {
	/** Export ALL rows (pre-filter). Default false = the filtered (but unpaginated) set. */
	all?: boolean;
}
export interface ExportOptions extends CsvOptions {
	filename?: string;
}

/** Anything toCsv can read a table from: a plugin context, the grid element, or a raw table. */
export type CsvSource = Table<Row> | DataGridContext | DjDataGrid;

function tableOf(source: CsvSource): Table<Row> {
	return "getRowModel" in source ? (source as Table<Row>) : (source as DataGridContext | DjDataGrid).table;
}

/** RFC 4180 field quoting: quote when the value contains a quote, comma, or line break;
 *  double embedded quotes. Null/undefined render as the empty string. */
function csvField(value: unknown): string {
	const s = value == null ? "" : String(value);
	return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/**
 * Build a CSV (RFC 4180, CRLF line ends, header row from column headers) from a grid.
 * Exports RAW cell values (`row.getValue`) — formatting is presentation and stays out of the
 * data. Rows: the filtered-but-unpaginated set (`getPrePaginationRowModel`, so a paginated
 * grid exports every page), or everything with `all: true`. Synthetic plugin columns (ids
 * starting `__`, e.g. the detail expander column) are skipped.
 */
export function toCsv(source: CsvSource, { all = false }: CsvOptions = {}): string {
	const table = tableOf(source);
	const cols = table.getVisibleLeafColumns().filter((c) => !c.id.startsWith("__"));
	const rows = all ? table.getPreFilteredRowModel().rows : table.getPrePaginationRowModel().rows;
	const lines = [cols.map((c) => csvField(typeof c.columnDef.header === "string" ? c.columnDef.header : c.id)).join(",")];
	for (const r of rows) lines.push(cols.map((c) => csvField(r.getValue(c.id))).join(","));
	return lines.join("\r\n") + "\r\n";
}

/** Build the CSV and trigger a browser download. */
export function downloadCsv(source: CsvSource, { filename = "grid.csv", all = false }: ExportOptions = {}): void {
	const blob = new Blob([toCsv(source, { all })], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

/**
 * `exportPlugin({ filename, all })` — adds a localized "Export CSV" button above the grid that
 * downloads the current (filtered, unpaginated) rows. Consumers wanting their own button import
 * `toCsv`/`downloadCsv` and pass the grid element (its public `table` getter feeds them).
 */
export function exportPlugin({ filename = "grid.csv", all = false }: ExportOptions = {}): DataGridPlugin {
	return defineDataGridPlugin({
		name: "export",
		chromeTop(ctx) {
			const label = messages.resolve("dj", getLocale(ctx.host), "exportCsv") ?? "Export CSV";
			return html`<dj-button kind="outlined" @click=${() => downloadCsv(ctx, { filename, all })}>${label}</dj-button>`;
		},
	});
}

export default exportPlugin;
