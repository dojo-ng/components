// data-grid-edit smokes (T6). Editing renders an editor into a body cell, so give the scroll
// viewport a real offset size to make the virtualizer render rows. Editing is CONTROLLED: the
// plugin emits dj-cell-commit and never mutates data.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { editPlugin } from "../packages/data-grid-edit/dist/index.js";
import "../packages/data-grid/dist/index.js";

const proto = globalThis.window.HTMLElement.prototype;
for (const [prop, val] of [["offsetHeight", 400], ["offsetWidth", 320]]) {
	Object.defineProperty(proto, prop, {
		configurable: true,
		get() { return this.classList?.contains("scroll") ? val : 0; },
	});
}

const cells = (el) => [...el.renderRoot.querySelectorAll('[part="cell"]')];
const gridEl = (el) => el.renderRoot.querySelector('[role="grid"]');
const key = (target, k) => target.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, composed: true }));

async function editGrid(columns) {
	return mount("dj-data-grid", {
		columns,
		data: [{ name: "Ann", age: 30 }, { name: "Bo", age: 25 }],
		plugins: [editPlugin()],
	});
}
const EDITABLE = [{ id: "name", header: "Name", accessorKey: "name", editable: true }, { id: "age", header: "Age", accessorKey: "age" }];

test("F2 on the active row starts editing its first editable column", async () => {
	const el = await editGrid(EDITABLE);
	assert.equal(cells(el)[0].querySelector("dj-text-input"), null, "not editing initially");
	key(gridEl(el), "F2");
	await settled(el);
	assert.ok(cells(el)[0].querySelector("dj-text-input"), "an editor control renders in the first editable cell");
});

test("typing + Enter emits dj-cell-commit with old and new values and leaves edit mode", async () => {
	const el = await editGrid(EDITABLE);
	let evt;
	el.addEventListener("dj-cell-commit", (e) => { evt = e; });
	key(gridEl(el), "F2");
	await settled(el);
	const input = cells(el)[0].querySelector("dj-text-input");
	input.value = "Annette";
	key(input, "Enter");
	await settled(el);
	assert.ok(evt, "dj-cell-commit fired");
	assert.equal(evt.detail.columnId, "name");
	assert.equal(evt.detail.oldValue, "Ann");
	assert.equal(evt.detail.value, "Annette");
	assert.equal(evt.detail.row.name, "Ann", "detail.row is the original row object (unmutated — controlled)");
	assert.equal(cells(el)[0].querySelector("dj-text-input"), null, "edit mode exited");
});

test("Escape cancels without emitting", async () => {
	const el = await editGrid(EDITABLE);
	let fired = 0;
	el.addEventListener("dj-cell-commit", () => { fired++; });
	key(gridEl(el), "F2");
	await settled(el);
	const input = cells(el)[0].querySelector("dj-text-input");
	input.value = "changed";
	key(input, "Escape");
	await settled(el);
	assert.equal(fired, 0, "no commit event on cancel");
	assert.equal(cells(el)[0].querySelector("dj-text-input"), null, "edit mode exited");
});

test("double-click on an editable cell starts editing that column", async () => {
	const el = await editGrid(EDITABLE);
	const wrapper = cells(el)[0].querySelector(".dj-dg-editable");
	assert.ok(wrapper, "editable cell content is wrapped for double-click");
	wrapper.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }));
	await settled(el);
	assert.ok(cells(el)[0].querySelector("dj-text-input"), "double-click opened the editor");
});

test("a non-editable column ignores double-click", async () => {
	const el = await editGrid(EDITABLE);
	const ageCell = cells(el)[1];
	assert.equal(ageCell.querySelector(".dj-dg-editable"), null, "non-editable cell is not wrapped");
	ageCell.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }));
	await settled(el);
	assert.equal(ageCell.querySelector("dj-text-input"), null, "no editor opened on the non-editable column");
});
