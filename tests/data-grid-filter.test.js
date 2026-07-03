// data-grid-filter smokes (T4). Rows must render to observe narrowing, so give the scroll
// viewport a real offset size (the TanStack virtualizer then renders body rows). Text filters
// are debounced 150 ms, so tests wait past that before asserting.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { filterPlugin } from "../packages/data-grid-filter/dist/index.js";
import "../packages/data-grid/dist/index.js";

const proto = globalThis.window.HTMLElement.prototype;
for (const [prop, val] of [["offsetHeight", 400], ["offsetWidth", 320]]) {
	Object.defineProperty(proto, prop, {
		configurable: true,
		get() { return this.classList?.contains("scroll") ? val : 0; },
	});
}

const tick = (ms) => new Promise((r) => setTimeout(r, ms));
const rowCount = (el) => el.renderRoot.querySelectorAll('[part="row"]').length;
const sizerHeight = (el) => el.renderRoot.querySelector('[role="rowgroup"]').getAttribute("style");

const DATA = [
	{ name: "foo", cat: "x" }, { name: "bar", cat: "y" }, { name: "baz", cat: "x" },
	{ name: "foods", cat: "y" }, { name: "barn", cat: "x" }, { name: "qux", cat: "y" },
];

async function type(input, value) {
	input.value = value;
	input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
	await tick(200); // clear the 150 ms debounce
}

test("the quick filter narrows the rows and the virtualizer count follows", async () => {
	const el = await mount("dj-data-grid", {
		columns: [{ id: "name", header: "Name", accessorKey: "name" }],
		data: DATA,
		plugins: [filterPlugin()],
	});
	assert.equal(rowCount(el), 6, "all rows render initially");
	const quick = el.renderRoot.querySelector('[part="chrome-top"] dj-text-input');
	assert.ok(quick, "the quick filter renders");
	await type(quick, "foo");
	await settled(el);
	assert.equal(rowCount(el), 2, "quick filter 'foo' narrows to foo + foods");
	// The T1 count-sync: the sizer height reflects the filtered row count (2 × 36).
	assert.equal(sizerHeight(el), "height:72px;position:relative");
});

test("clearing the quick filter restores every row", async () => {
	const el = await mount("dj-data-grid", {
		columns: [{ id: "name", header: "Name", accessorKey: "name" }],
		data: DATA,
		plugins: [filterPlugin()],
	});
	const quick = el.renderRoot.querySelector('[part="chrome-top"] dj-text-input');
	await type(quick, "foo");
	await settled(el);
	assert.equal(rowCount(el), 2);
	await type(quick, "");
	await settled(el);
	assert.equal(rowCount(el), 6, "cleared filter restores all rows");
});

test("a per-column text filter narrows only on that column", async () => {
	const el = await mount("dj-data-grid", {
		columns: [{ id: "name", header: "Name", accessorKey: "name", filter: "text" }],
		data: DATA,
		plugins: [filterPlugin({ quick: false })],
	});
	// quick:false → no chrome-top quick filter.
	assert.equal(el.renderRoot.querySelector('[part="chrome-top"]'), null);
	const colInput = el.renderRoot.querySelector('[part="subhead"] dj-text-input');
	assert.ok(colInput, "the column filter input renders in the subheader");
	await type(colInput, "bar");
	await settled(el);
	assert.equal(rowCount(el), 2, "'bar' matches bar + barn");
});

test("a per-column select filter narrows to the chosen value; blank restores", async () => {
	const el = await mount("dj-data-grid", {
		columns: [
			{ id: "name", header: "Name", accessorKey: "name" },
			{ id: "cat", header: "Cat", accessorKey: "cat", filter: "select" },
		],
		data: DATA,
		plugins: [filterPlugin({ quick: false })],
	});
	const select = el.renderRoot.querySelector('[part="subhead"] select');
	assert.ok(select, "the select filter renders");
	// Options: "All" + the distinct cat values (x, y).
	assert.deepEqual([...select.options].map((o) => o.value), ["", "x", "y"]);
	select.value = "x";
	select.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
	await settled(el);
	assert.equal(rowCount(el), 3, "cat=x → foo, baz, barn");
	select.value = "";
	select.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
	await settled(el);
	assert.equal(rowCount(el), 6, "blank option clears the filter");
});

test("no subheader row renders when no column declares a filter", async () => {
	const el = await mount("dj-data-grid", {
		columns: [{ id: "name", header: "Name", accessorKey: "name" }],
		data: DATA,
		plugins: [filterPlugin({ quick: false })],
	});
	assert.equal(el.renderRoot.querySelector('[part="subhead"]'), null);
});
