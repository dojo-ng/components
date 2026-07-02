// data-grid ARIA smokes (review task 2.5). happy-dom does no layout and its
// ResizeObserver never reports a size, so the TanStack virtualizer renders ZERO
// body rows here — we assert the layout-INDEPENDENT repairs (rowcount, header
// rowindex, the rowgroup on the sizer, and the aria-activedescendant stale-id
// guard). The body-row rowindex offset (index + 2) needs real layout and is
// confirmed in the browser (playground/data-grid-demo.html).
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/data-grid/dist/index.js";

const COLUMNS = [{ id: "a", header: "A", accessorKey: "a" }, { id: "b", header: "B", accessorKey: "b" }];
const data = (n) => Array.from({ length: n }, (_, i) => ({ a: "a" + i, b: "b" + i }));

async function grid(n) {
	return mount("dj-data-grid", { columns: COLUMNS, data: data(n) });
}

test("aria-rowcount counts the header row (n + 1)", async () => {
	const el = await grid(20);
	assert.equal(el.renderRoot.querySelector('[role="grid"]').getAttribute("aria-rowcount"), "21");
});

test("the header row is aria-rowindex 1", async () => {
	const el = await grid(20);
	assert.equal(el.renderRoot.querySelector(".head").getAttribute("aria-rowindex"), "1");
});

test("the sizer is a rowgroup and the scroller stays presentational", async () => {
	const el = await grid(20);
	assert.ok(el.renderRoot.querySelector('[role="rowgroup"]'), "sizer div carries role=rowgroup");
	// The scroller is presentational AND not focusable, so its role is not voided —
	// it stays transparent in the a11y tree, keeping the rowgroup a child of the grid.
	// (A focusable presentation element would be exposed as generic and break the chain.)
	const scroll = el.renderRoot.querySelector(".scroll");
	assert.equal(scroll.getAttribute("role"), "presentation");
	assert.equal(scroll.getAttribute("tabindex"), null, "scroller is not focusable");
	assert.equal(scroll.getAttribute("aria-activedescendant"), null, "activedescendant lives on the grid, not the scroller");
});

test("grid is the focusable active-descendant manager; keydown moves the active row", async () => {
	const el = await grid(50);
	const gridEl = el.renderRoot.querySelector('[role="grid"]');
	assert.equal(gridEl.getAttribute("tabindex"), "0", "the grid element is the focus target");
	assert.equal(el.activeIndex, 0);
	gridEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
	await settled(el);
	assert.equal(el.activeIndex, 1, "ArrowDown on the grid advances the active row");
});

test("aria-activedescendant is omitted when the active row is not rendered", async () => {
	const el = await grid(50);
	// No rows are in the rendered virtual window here, so pointing at r-<activeIndex>
	// would be a dangling id. The old code emitted it whenever n>0; the fix omits it.
	el.activeIndex = 45;
	await settled(el);
	const gridEl = el.renderRoot.querySelector('[role="grid"]');
	assert.equal(gridEl.getAttribute("aria-activedescendant"), null);
});
