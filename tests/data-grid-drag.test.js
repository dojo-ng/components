// data-grid-drag (row-drag-tree-drop-spec RD2): rows as native drag sources. happy-dom has no
// DataTransfer, so a stub records what the plugin writes. Same `.scroll` offset shim as the other
// grid plugin tests: without layout the virtualizer would render no body rows.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/data-grid/dist/index.js";
import { selectColumnPlugin } from "../packages/data-grid-select/dist/index.js";
import { rowDragPlugin } from "../packages/data-grid-drag/dist/index.js";

const proto = globalThis.window.HTMLElement.prototype;
for (const [prop, val] of [["offsetHeight", 400], ["offsetWidth", 320]]) {
	Object.defineProperty(proto, prop, {
		configurable: true,
		get() { return this.classList?.contains("scroll") ? val : 0; },
	});
}

const COLUMNS = [{ id: "a", header: "A", accessorKey: "a" }];
// Ids differ from row indexes on purpose, so a test cannot pass by confusing the two.
const data = (n) => Array.from({ length: n }, (_, i) => ({ id: i * 10, a: "a" + i }));
const TYPE = "application/x-test-rows";
const plugin = (extra = {}) => rowDragPlugin({ type: TYPE, data: (rs) => JSON.stringify(rs.map((r) => r.id)), ...extra });
const grid = (props = {}) => mount("dj-data-grid", {
	columns: COLUMNS, data: data(5), selectionMode: "multiple", activation: "click",
	getRowId: (r) => String(r.id), ...props,
});
const bodyRows = (el) => [...el.renderRoot.querySelectorAll(".vrow")];

function stubTransfer() {
	const store = {};
	return {
		store, effectAllowed: "", dropEffect: "none", image: null,
		get types() { return Object.keys(store); },
		setData(t, v) { store[t] = v; },
		getData(t) { return store[t] ?? ""; },
		setDragImage(el) { this.image = el.textContent; },
	};
}
function drag(target, type, dt = stubTransfer()) {
	const e = new Event(type, { bubbles: true, composed: true, cancelable: true });
	Object.defineProperty(e, "dataTransfer", { value: dt });
	target.dispatchEvent(e);
	return e;
}

test("every row is draggable", async () => {
	const el = await grid({ plugins: [plugin()] });
	const r = bodyRows(el);
	assert.equal(r.length, 5);
	assert.ok(r.every((x) => x.getAttribute("draggable") === "true"));
});

test("dragging an unselected row drags it alone and leaves the selection alone", async () => {
	const el = await grid({ plugins: [selectColumnPlugin(), plugin()], rowSelection: { "10": true, "20": true } });
	await settled(el);
	const dt = stubTransfer();
	const e = drag(bodyRows(el)[4].querySelector(".cell:last-child"), "dragstart", dt);
	assert.equal(e.defaultPrevented, false);
	assert.deepEqual(JSON.parse(dt.store[TYPE]), [40]);
	assert.equal(dt.store["text/plain"], "1 row");
	assert.equal(dt.effectAllowed, "move");
	assert.deepEqual(Object.keys(el.rowSelection).sort(), ["10", "20"]);
});

test("dragging a selected row drags the whole selection", async () => {
	const el = await grid({ plugins: [selectColumnPlugin(), plugin()], rowSelection: { "10": true, "30": true } });
	await settled(el);
	const dt = stubTransfer();
	drag(bodyRows(el)[3], "dragstart", dt);
	assert.deepEqual(JSON.parse(dt.store[TYPE]).sort((a, b) => a - b), [10, 30]);
	assert.equal(dt.store["text/plain"], "2 rows");
	assert.equal(dt.image, "2 rows");
});

test("a custom label names the drag", async () => {
	const el = await grid({ plugins: [plugin({ label: (rs) => (rs.length === 1 ? rs[0].a : `${rs.length} items`) })] });
	const dt = stubTransfer();
	drag(bodyRows(el)[2], "dragstart", dt);
	assert.equal(dt.store["text/plain"], "a2");
});

test("a drag that starts on the row checkbox is canceled", async () => {
	const el = await grid({ plugins: [selectColumnPlugin(), plugin()] });
	const box = bodyRows(el)[0].querySelector("input");
	assert.ok(box, "the select column renders a checkbox");
	const dt = stubTransfer();
	const e = drag(box, "dragstart", dt);
	assert.equal(e.defaultPrevented, true);
	assert.deepEqual(dt.types, []);
});

test("dj-row-dragstart can refuse the drag", async () => {
	const el = await grid({ plugins: [plugin()] });
	el.addEventListener("dj-row-dragstart", (ev) => ev.preventDefault());
	const dt = stubTransfer();
	const e = drag(bodyRows(el)[0], "dragstart", dt);
	assert.equal(e.defaultPrevented, true);
	assert.deepEqual(dt.types, []);
});

test("dragged rows carry row--dragging until dj-row-dragend, which reports the dropEffect", async () => {
	const el = await grid({ plugins: [selectColumnPlugin(), plugin()], rowSelection: { "0": true, "10": true } });
	await settled(el);
	const starts = [];
	const ends = [];
	el.addEventListener("dj-row-dragstart", (ev) => starts.push(ev.detail.rows.map((r) => r.id)));
	el.addEventListener("dj-row-dragend", (ev) => ends.push(ev.detail));
	const dt = stubTransfer();
	drag(bodyRows(el)[0], "dragstart", dt);
	await settled(el);
	const dragging = () => bodyRows(el).filter((r) => (r.getAttribute("part") || "").includes("row--dragging")).length;
	assert.equal(dragging(), 2);
	assert.deepEqual(starts, [[0, 10]]);
	dt.dropEffect = "move";
	drag(bodyRows(el)[0], "dragend", dt);
	await settled(el);
	assert.equal(dragging(), 0);
	assert.equal(ends.length, 1);
	assert.deepEqual(ends[0].rows.map((r) => r.id), [0, 10]);
	assert.equal(ends[0].dropEffect, "move");
});

test("a plain click still activates without selecting", async () => {
	const el = await grid({ plugins: [selectColumnPlugin(), plugin()] });
	let opened = null;
	el.addEventListener("dj-activate", (ev) => { opened = ev.detail.row.id; });
	bodyRows(el)[2].dispatchEvent(new globalThis.window.MouseEvent("click", { bubbles: true, composed: true }));
	await settled(el);
	assert.equal(opened, 20);
	assert.deepEqual(Object.keys(el.rowSelection), []);
});
