// data-grid focus and active-row API (spec track GF): focus() forwarding, the row--active and
// row--selected parts, and dj-active-change. Same viewport shim as data-grid-activation.test.js:
// happy-dom does no layout, so `.scroll` needs a size before the virtualizer renders rows.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/data-grid/dist/index.js";
import { rowStatePlugin } from "../packages/data-grid-rowstate/dist/index.js";

const proto = globalThis.window.HTMLElement.prototype;
for (const [prop, val] of [["offsetHeight", 400], ["offsetWidth", 320]]) {
	Object.defineProperty(proto, prop, {
		configurable: true,
		get() { return this.classList?.contains("scroll") ? val : 0; },
	});
}

const COLUMNS = [{ id: "a", header: "A", accessorKey: "a" }];
const rows = (n) => Array.from({ length: n }, (_, i) => ({ a: "a" + i, unread: i % 2 === 0 }));
const grid = (props) => mount("dj-data-grid", { columns: COLUMNS, data: rows(5), ...props });
const rowEls = (el) => [...el.renderRoot.querySelectorAll('[part~="row"]')];
const parts = (node) => (node.getAttribute("part") || "").split(/\s+/).filter(Boolean);
const withPart = (el, p) => rowEls(el).filter((r) => parts(r).includes(p));
const gridEl = (el) => el.renderRoot.querySelector(".grid");
const key = (el, k) => gridEl(el).dispatchEvent(new globalThis.window.KeyboardEvent("keydown", { key: k, bubbles: true, composed: true }));
const click = (rowEl, init = {}) => rowEl.dispatchEvent(new globalThis.window.MouseEvent("click", { bubbles: true, composed: true, ...init }));
function changes(el) {
	const seen = [];
	el.addEventListener("dj-active-change", (e) => seen.push(e.detail));
	return seen;
}

test("focus() on the host puts focus on the role=grid element", async () => {
	const el = await grid();
	el.focus();
	assert.equal(el.shadowRoot.activeElement, gridEl(el), "the inner grid holds focus");
	assert.equal(globalThis.document.activeElement, el, "the host is what the document reports");
	el.blur();
	assert.notEqual(el.shadowRoot.activeElement, gridEl(el), "blur() releases it");
});

test("focus() never lands on the print table, which also carries part=grid", async () => {
	const el = await grid();
	el.focus();
	assert.ok(!el.shadowRoot.activeElement?.classList.contains("print-table"));
	assert.equal(el.shadowRoot.activeElement?.getAttribute("role"), "grid");
});

test("the active row carries row--active, and only that row", async () => {
	const el = await grid();
	assert.deepEqual(withPart(el, "row--active").map((r) => r.id), ["r-0"]);
	key(el, "ArrowDown");
	await settled(el);
	assert.deepEqual(withPart(el, "row--active").map((r) => r.id), ["r-1"], "the part follows the cursor on reused rows");
	for (const r of rowEls(el)) assert.ok(parts(r).includes("row"), "every row keeps the base part");
});

test("selected rows carry row--selected, and lose it when deselected", async () => {
	const el = await grid({ selectionMode: "multiple" });
	click(rowEls(el)[2]);
	await settled(el);
	assert.deepEqual(withPart(el, "row--selected").map((r) => r.id), ["r-2"]);
	click(rowEls(el)[2]);
	await settled(el);
	assert.equal(withPart(el, "row--selected").length, 0);
});

test("core parts merge with a rowstate plugin's parts instead of replacing them", async () => {
	const el = await grid({ selectionMode: "multiple", plugins: [rowStatePlugin({ row: (r) => (r.unread ? "unread" : null) })] });
	click(rowEls(el)[2]);
	await settled(el);
	const r2 = rowEls(el).find((r) => r.id === "r-2");
	assert.deepEqual(new Set(parts(r2)), new Set(["row", "row--unread", "row--active", "row--selected"]));
	const r1 = rowEls(el).find((r) => r.id === "r-1");
	assert.deepEqual(parts(r1), ["row"], "an unread-free, inactive, unselected row has only the base part");
});

test("dj-active-change fires for arrow keys, Home, End, and clicks, with index and original row", async () => {
	const el = await grid({ activation: "click" });
	const seen = changes(el);
	key(el, "ArrowDown"); await settled(el);
	key(el, "End"); await settled(el);
	key(el, "Home"); await settled(el);
	click(rowEls(el)[3]); await settled(el);
	assert.deepEqual(seen.map((d) => d.index), [1, 4, 0, 3]);
	assert.equal(seen[1].row, el.data[4], "row is the original data object");
});

test("dj-active-change stays silent when the index does not move or is set from code", async () => {
	const el = await grid();
	const seen = changes(el);
	key(el, "ArrowUp"); await settled(el);   // already at 0
	key(el, "Home"); await settled(el);      // still 0
	el.activeIndex = 3; await settled(el);   // programmatic
	click(rowEls(el).find((r) => r.id === "r-3")); await settled(el);  // clicking the active row
	assert.equal(seen.length, 0);
	assert.deepEqual(withPart(el, "row--active").map((r) => r.id), ["r-3"], "a programmatic move still updates the part");
});
