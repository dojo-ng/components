// data-grid plugin-host smokes (T1). Unlike data-grid.test.js — which asserts only
// layout-independent ARIA repairs because happy-dom renders zero virtual body rows —
// these tests give the scroll viewport a real offset size so the TanStack virtualizer
// actually renders body rows. That is the only way to exercise renderCell / decorateCell /
// compute, which run per body cell. The shim is local to this file (node's test runner
// runs each test file in its own process, so it does not leak to the ARIA smokes).
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { html } from "lit";
import "../packages/data-grid/dist/index.js";

// Give `.scroll` a non-zero offsetHeight/Width so getRect() reports a viewport and rows render.
const proto = globalThis.window.HTMLElement.prototype;
for (const [prop, val] of [["offsetHeight", 400], ["offsetWidth", 320]]) {
	Object.defineProperty(proto, prop, {
		configurable: true,
		get() { return this.classList?.contains("scroll") ? val : 0; },
	});
}

const COLUMNS = [{ id: "a", header: "A", accessorKey: "a" }, { id: "b", header: "B", accessorKey: "b" }];
const rows = (n) => Array.from({ length: n }, (_, i) => ({ a: "a" + i, b: "b" + i }));
const cellText = (el) => [...el.renderRoot.querySelectorAll('[part="cell"]')].map((c) => c.textContent);
const headerText = (el) => [...el.renderRoot.querySelectorAll('[role="columnheader"] span:first-child')].map((s) => s.textContent);

async function grid(props) {
	return mount("dj-data-grid", { columns: COLUMNS, data: rows(5), ...props });
}

test("a bare grid with plugins=[] is unchanged: headers, rowcount, default cell text", async () => {
	const el = await grid({ plugins: [] });
	assert.deepEqual(headerText(el), ["A", "B"]);
	assert.equal(el.renderRoot.querySelector('[role="grid"]').getAttribute("aria-rowcount"), "6");
	// Default cell content is String(value): first row = a0, b0.
	const cells = cellText(el);
	assert.equal(cells.length, 10, "5 rows × 2 columns render as body cells");
	assert.deepEqual(cells.slice(0, 2), ["a0", "b0"]);
});

test("columns(): a plugin can append a column and it reaches the header + table", async () => {
	const addCol = {
		name: "addcol",
		columns: (cols) => [...cols, { id: "extra", header: "Extra", accessorKey: "a" }],
	};
	const el = await grid({ plugins: [addCol] });
	assert.deepEqual(headerText(el), ["A", "B", "Extra"]);
});

test("renderCell(): first non-undefined in array order replaces content; other cells fall through", async () => {
	const first = { name: "first", renderCell: (cell) => (cell.column.id === "a" ? `X:${cell.getValue()}` : undefined) };
	const second = { name: "second", renderCell: (cell) => (cell.column.id === "a" ? "SHOULD-NOT-WIN" : undefined) };
	const el = await grid({ plugins: [first, second] });
	const cells = cellText(el);
	assert.equal(cells[0], "X:a0", "column a is replaced by the first plugin");
	assert.equal(cells[1], "b0", "column b is untouched (core default)");
});

test("decorateCell(): wraps whatever content emerged, folding in array order after renderCell", async () => {
	const rc = { name: "rc", renderCell: (cell) => (cell.column.id === "a" ? "core" : undefined) };
	const wrapA = { name: "wa", decorateCell: (_cell, content) => `[${content}]` };
	const wrapB = { name: "wb", decorateCell: (_cell, content) => `<${content}>` };
	const el = await grid({ plugins: [rc, wrapA, wrapB] });
	const cells = cellText(el);
	// column a: renderCell → "core", then [ ] then < > → "<[core]>"
	assert.equal(cells[0], "<[core]>");
	// column b: default "b0" then decorators fold over it too
	assert.equal(cells[1], "<[b0]>");
});

test("compute: a calculated column renders a value derived from the whole row", async () => {
	const el = await mount("dj-data-grid", {
		columns: [
			{ id: "a", header: "A", accessorKey: "a" },
			{ id: "total", header: "Total", compute: (r) => r.x + r.y },
		],
		data: [{ a: "r0", x: 2, y: 3 }, { a: "r1", x: 10, y: 4 }],
	});
	const cells = cellText(el);
	// row 0: a="r0", total=5 ; row 1: a="r1", total=14
	assert.deepEqual(cells, ["r0", "5", "r1", "14"]);
});

test("chromeTop / chromeBottom render full-width regions outside the grid rows", async () => {
	const chrome = {
		name: "chrome",
		chromeTop: () => html`<div class="top-slot">quick filter</div>`,
		chromeBottom: () => html`<div class="bot-slot">pager</div>`,
	};
	const el = await grid({ plugins: [chrome] });
	assert.equal(el.renderRoot.querySelector('[part="chrome-top"] .top-slot')?.textContent, "quick filter");
	assert.equal(el.renderRoot.querySelector('[part="chrome-bottom"] .bot-slot')?.textContent, "pager");
});

test("subheaderCells(): one extra header-area row laid out on the grid template; nulls are empty", async () => {
	const sub = {
		name: "sub",
		subheaderCells: () => [html`<span class="filt">f</span>`, null],
	};
	const el = await grid({ plugins: [sub] });
	const subhead = el.renderRoot.querySelector('[part="subhead"]');
	assert.ok(subhead, "a subheader row renders");
	assert.equal(subhead.getAttribute("aria-rowindex"), "2");
	const subcells = subhead.querySelectorAll(".subcell");
	assert.equal(subcells.length, 2, "one cell per column");
	assert.equal(subcells[0].querySelector(".filt")?.textContent, "f");
	assert.equal(subcells[1].textContent.trim(), "", "null entry is an empty cell");
	// data rows shift down by the extra header row; rowcount counts both header rows + data.
	assert.equal(el.renderRoot.querySelector('[role="grid"]').getAttribute("aria-rowcount"), "7");
});

test("setting plugins after mount rebuilds the table and disposes the old setups", async () => {
	let disposed = 0;
	const withSetup = {
		name: "withsetup",
		setup: () => () => { disposed++; },
		columns: (cols) => [...cols, { id: "z", header: "Z", accessorKey: "a" }],
	};
	const el = await grid({ plugins: [withSetup] });
	assert.ok(headerText(el).includes("Z"), "the plugin's column is present before the change");
	assert.equal(disposed, 0);

	el.plugins = [];
	await settled(el);
	assert.equal(disposed, 1, "the old build's setup disposer ran on rebuild");
	assert.ok(!headerText(el).includes("Z"), "the plugin's column is gone after the rebuild");
});

test("upgrade-order race: plugins assigned after connect but before the first update flush still build the table", async () => {
	// The playground pattern: the upgrading import connects the element (table builds with the
	// default plugins=[]), then the SAME script task assigns plugins. A changedProperties guard
	// mistook that for the initial cycle and never rebuilt; the reference-compare rebuild in
	// willUpdate must catch it.
	let setupRan = false;
	const marker = {
		name: "race",
		tableOptions: () => ({ getRowCanExpand: () => true }),
		setup: () => { setupRan = true; },
	};
	const el = document.createElement("dj-data-grid");
	el.columns = COLUMNS;
	el.data = rows(3);
	document.body.appendChild(el); // connectedCallback builds with plugins=[]
	el.plugins = [marker]; // same task, before the first update flush
	await settled(el);
	assert.equal(setupRan, true, "plugin setup ran after the in-cycle assignment");
	assert.equal(typeof el.table.options.getRowCanExpand, "function", "plugin tableOptions reached the table");
	el.remove();
});
