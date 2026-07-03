// data-grid-pagination smokes (T5). Give the scroll viewport a real offset size so the
// virtualizer renders body rows. The page slice size is read from the sizer height
// (rowCount × 36) — that reflects the T1 count-sync directly and doesn't depend on how many
// rows the viewport happens to render.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { paginationPlugin } from "../packages/data-grid-pagination/dist/index.js";
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
const firstCell = (el) => el.renderRoot.querySelector('[part="cell"]')?.textContent;
const sizerHeight = (el) => el.renderRoot.querySelector('[role="rowgroup"]').getAttribute("style");
const pager = (el) => el.renderRoot.querySelector('[part="chrome-bottom"] dj-pagination');

const cols = [{ id: "a", header: "A", accessorKey: "a" }, { id: "name", header: "Name", accessorKey: "name" }];
const bigData = (n) => Array.from({ length: n }, (_, i) => ({ a: i, name: i < 30 ? "keep" : "drop" }));

test("pageSize 10 over 100 rows slices to one page of 10", async () => {
	const el = await mount("dj-data-grid", { columns: cols, data: bigData(100), plugins: [paginationPlugin({ pageSize: 10 })] });
	assert.equal(sizerHeight(el), "height:360px;position:relative", "the row model is one page of 10 (10 × 36)");
	assert.equal(firstCell(el), "0", "page 1 starts at row 0");
	assert.equal(pager(el).total, 10, "10 pages total");
});

test("navigating to page 2 shows rows 10–19", async () => {
	const el = await mount("dj-data-grid", { columns: cols, data: bigData(100), plugins: [paginationPlugin({ pageSize: 10 })] });
	pager(el).dispatchEvent(new CustomEvent("dj-page", { detail: { page: 2 }, bubbles: true, composed: true }));
	await settled(el);
	assert.equal(firstCell(el), "10", "page 2 starts at row 10");
	assert.equal(sizerHeight(el), "height:360px;position:relative", "still 10 rows on the page");
});

test("changing the page size re-slices the page", async () => {
	const el = await mount("dj-data-grid", { columns: cols, data: bigData(100), plugins: [paginationPlugin({ pageSize: 10 })] });
	const select = el.renderRoot.querySelector('[part="chrome-bottom"] select');
	assert.ok(select, "the page-size select renders");
	assert.deepEqual([...select.options].map((o) => o.value), ["10", "25", "50", "100"]);
	select.value = "25";
	select.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
	await settled(el);
	assert.equal(sizerHeight(el), "height:900px;position:relative", "page is now 25 rows (25 × 36)");
	assert.equal(pager(el).total, 4, "100 / 25 = 4 pages");
});

test("pagination composes with the quick filter: the page count follows the filtered set", async () => {
	const el = await mount("dj-data-grid", { columns: cols, data: bigData(100), plugins: [filterPlugin(), paginationPlugin({ pageSize: 10 })] });
	assert.equal(pager(el).total, 10, "10 pages before filtering");
	const quick = el.renderRoot.querySelector('[part="chrome-top"] dj-text-input');
	quick.value = "keep";
	quick.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
	await tick(200); // clear the filter's 150 ms debounce
	await settled(el);
	assert.equal(pager(el).total, 3, "30 matching rows / 10 per page = 3 pages");
	assert.equal(sizerHeight(el), "height:360px;position:relative", "first page still holds 10 filtered rows");
});
