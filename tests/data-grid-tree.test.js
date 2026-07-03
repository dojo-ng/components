// data-grid-tree smokes (T7). Give the scroll viewport a real offset size so the virtualizer
// renders body rows; row count and the sizer height (rowCount × 36) reflect expansion.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { treePlugin } from "../packages/data-grid-tree/dist/index.js";
import "../packages/data-grid/dist/index.js";

const proto = globalThis.window.HTMLElement.prototype;
for (const [prop, val] of [["offsetHeight", 400], ["offsetWidth", 320]]) {
	Object.defineProperty(proto, prop, {
		configurable: true,
		get() { return this.classList?.contains("scroll") ? val : 0; },
	});
}

const rows = (el) => el.renderRoot.querySelectorAll('[part="row"]').length;
const sizer = (el) => el.renderRoot.querySelector('[role="rowgroup"]').getAttribute("style");
const firstExpander = (el) => el.renderRoot.querySelector('[part="row"] [part="expander"]');
const gridEl = (el) => el.renderRoot.querySelector('[part="grid"]');
const key = (t, k) => t.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, composed: true }));

const DATA = [
	{ name: "A", children: [{ name: "A1" }, { name: "A2" }] },
	{ name: "B", children: [{ name: "B1" }, { name: "B2" }] },
];
const treeGrid = () => mount("dj-data-grid", { columns: [{ id: "name", header: "Name", accessorKey: "name" }], data: DATA, plugins: [treePlugin()] });

test("only top-level rows show until expanded; the grid is a treegrid", async () => {
	const el = await treeGrid();
	assert.equal(rows(el), 2, "two roots, collapsed");
	assert.equal(sizer(el), "height:72px;position:relative", "virtualizer count = 2");
	assert.equal(gridEl(el).getAttribute("role"), "treegrid", "container is a treegrid");
});

test("clicking an expander flattens the children in and emits dj-expand-change", async () => {
	const el = await treeGrid();
	let evt;
	el.addEventListener("dj-expand-change", (e) => { evt = e; });
	firstExpander(el).click();
	await settled(el);
	assert.equal(rows(el), 4, "A + A1 + A2 + B");
	assert.equal(sizer(el), "height:144px;position:relative", "virtualizer count follows to 4");
	assert.ok(evt && evt.detail.expanded === true, "dj-expand-change fired with expanded:true");
	assert.equal(evt.detail.row.name, "A");
});

test("toggling the expander again collapses", async () => {
	const el = await treeGrid();
	firstExpander(el).click();
	await settled(el);
	assert.equal(rows(el), 4);
	firstExpander(el).click();
	await settled(el);
	assert.equal(rows(el), 2, "collapsed back to the two roots");
});

test("ArrowRight expands and ArrowLeft collapses the active row", async () => {
	const el = await treeGrid();
	assert.equal(el.activeIndex, 0, "row A is active");
	key(gridEl(el), "ArrowRight");
	await settled(el);
	assert.equal(rows(el), 4, "ArrowRight expanded A");
	key(gridEl(el), "ArrowLeft");
	await settled(el);
	assert.equal(rows(el), 2, "ArrowLeft collapsed A");
});

test("child rows are indented by depth in the first cell", async () => {
	const el = await treeGrid();
	firstExpander(el).click();
	await settled(el);
	// Rows: A (depth 0), A1 (depth 1), A2 (depth 1), B (depth 0). Check A1's first cell indent.
	const a1Cell = el.renderRoot.querySelectorAll('[part="cell"]')[1];
	const wrapper = a1Cell.querySelector("span");
	assert.ok(wrapper.getAttribute("style").includes("padding-inline-start:1rem"), "depth-1 row indented 1rem");
});

test("aria-level and aria-expanded are set on the rows", async () => {
	const el = await treeGrid();
	firstExpander(el).click();
	await settled(el);
	const rowEls = el.renderRoot.querySelectorAll('[part="row"]');
	assert.equal(rowEls[0].getAttribute("aria-level"), "1", "root is level 1");
	assert.equal(rowEls[0].getAttribute("aria-expanded"), "true", "expanded root");
	assert.equal(rowEls[1].getAttribute("aria-level"), "2", "child is level 2");
	assert.equal(rowEls[1].getAttribute("aria-expanded"), null, "leaf child has no aria-expanded");
});
