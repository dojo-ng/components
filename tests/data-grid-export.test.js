// data-grid-export smokes (T9). toCsv is pure over the table model, so no viewport shim is
// needed for most cases; the grid element's public `table` getter feeds toCsv directly.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { toCsv, exportPlugin } from "../packages/data-grid-export/dist/index.js";
import { filterPlugin } from "../packages/data-grid-filter/dist/index.js";
import { paginationPlugin } from "../packages/data-grid-pagination/dist/index.js";
import "../packages/data-grid/dist/index.js";

const COLUMNS = [{ id: "a", header: "A", accessorKey: "a" }, { id: "b", header: "B", accessorKey: "b" }];
const DATA = [
	{ a: "a0", b: "b0" },
	{ a: "a1", b: "b1" },
	{ a: "a2", b: "b2" },
	{ a: "plain", b: 'say "hi", ok\nnew line' },
	{ a: "a4", b: "b4" },
];

async function grid(props) {
	return mount("dj-data-grid", { columns: COLUMNS, data: DATA, plugins: [], ...props });
}

test("toCsv: header row from column headers + one CRLF line per row", async () => {
	const el = await grid();
	const lines = toCsv(el).split("\r\n");
	assert.equal(lines[0], "A,B");
	assert.equal(lines[1], "a0,b0");
	assert.equal(lines.length, 1 + DATA.length + 1, "header + rows + trailing CRLF");
	assert.equal(lines.at(-1), "");
});

test("toCsv: RFC 4180 quoting for embedded quote, comma, and newline", async () => {
	const el = await grid();
	const line = toCsv(el).split("\r\n")[4];
	assert.equal(line, 'plain,"say ""hi"", ok\nnew line"'.replace("\n", "\n"), "quoted field with doubled quotes");
	assert.ok(line.startsWith('plain,"say ""hi""'));
});

test("toCsv: filtered grid exports the filtered set; all:true exports everything", async () => {
	const el = await grid({ plugins: [filterPlugin({ quick: false })] });
	el.table.setGlobalFilter("a1");
	await settled(el);
	const filtered = toCsv(el).trimEnd().split("\r\n");
	assert.equal(filtered.length, 2, "header + the one matching row");
	assert.equal(filtered[1], "a1,b1");
	const all = toCsv(el, { all: true }).trimEnd().split("\r\n");
	assert.equal(all.length, 1 + DATA.length);
});

test("toCsv: paginated grid exports all pages, not the current one", async () => {
	const el = await grid({ plugins: [paginationPlugin({ pageSize: 2 })] });
	await settled(el);
	assert.equal(el.table.getRowModel().rows.length, 2, "page slice active");
	const lines = toCsv(el).trimEnd().split("\r\n");
	assert.equal(lines.length, 1 + DATA.length, "export ignores the page boundary");
});

test("toCsv: synthetic __ columns are skipped; exportPlugin renders a chrome button", async () => {
	const synth = { name: "synth", columns: (cols) => [{ id: "__x", header: "X" }, ...cols] };
	const el = await grid({ plugins: [synth, exportPlugin()] });
	await settled(el);
	assert.equal(toCsv(el).split("\r\n")[0], "A,B", "__x column not exported");
	const btn = el.renderRoot.querySelector('[part="chrome-top"] dj-button');
	assert.ok(btn, "Export CSV button in top chrome");
	assert.match(btn.textContent, /Export CSV/);
});
