// data-grid columns spec GC3/GC4: the plugin's pure state edits (moves stay inside a pinned
// group, pin and unpin placement, the last visible column cannot be hidden), plus a happy-dom
// check that the plugin draws its header controls only on the app's own columns.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/data-grid/dist/index.js";
import { columnsPlugin, moveGroup, moveWithin, stepMove, pinColumn, setVisible, canHide } from "../packages/data-grid-columns/dist/index.js";
import { selectColumnPlugin } from "../packages/data-grid-select/dist/index.js";

const st = (over = {}) => ({ sizing: {}, order: ["a", "b", "c", "d", "e"], pinning: { start: [], end: [] }, visibility: {}, ...over });
const all = () => true;

test("moveWithin refills only the group's slots", () => {
	assert.deepEqual(moveWithin(["a", "x", "b", "c"], ["a", "b", "c"], "c", 0), ["c", "x", "a", "b"]);
	assert.deepEqual(moveWithin(["a", "b", "c"], ["a", "b", "c"], "a", 2), ["b", "c", "a"]);
	assert.deepEqual(moveWithin(["a", "b", "c"], ["a", "b", "c"], "a", 99), ["b", "c", "a"], "clamped");
	assert.deepEqual(moveWithin(["a", "b"], ["a"], "zz", 0), ["a", "b"], "not in the group: unchanged");
});

test("moveGroup: same pinned group, visible, movable", () => {
	const s = st({ order: ["a", "b", "c", "d", "e"], pinning: { start: ["a", "b"], end: ["e"] }, visibility: { c: false } });
	assert.deepEqual(moveGroup(s, "a", all), ["a", "b"]);
	assert.deepEqual(moveGroup(s, "d", all), ["d"], "c is hidden");
	assert.deepEqual(moveGroup(s, "e", all), ["e"]);
	assert.deepEqual(moveGroup(st(), "a", (id) => id !== "b"), ["a", "c", "d", "e"]);
});

test("stepMove: one step, never out of the pinned group", () => {
	const s = st({ pinning: { start: ["a", "b"], end: [] } });
	assert.deepEqual(stepMove(s, "b", -1, all), ["b", "a", "c", "d", "e"]);
	assert.equal(stepMove(s, "b", 1, all), null, "b is the last of the start group");
	assert.equal(stepMove(s, "c", -1, all), null, "c is the first unpinned column");
	assert.deepEqual(stepMove(s, "c", 1, all), ["a", "b", "d", "c", "e"]);
	assert.equal(stepMove(s, "c", 1, (id) => id !== "c"), null, "not reorderable");
});

test("stepMove skips columns that cannot move", () => {
	const s = st();
	assert.deepEqual(stepMove(s, "a", 1, (id) => id !== "b"), ["c", "b", "a", "d", "e"]);
});

test("pinColumn: newly pinned lands next to the unpinned columns; unpin returns beside its group", () => {
	const s = st({ pinning: { start: ["a"], end: ["e"] } });
	const p = pinColumn(s, "d", "start");
	assert.deepEqual(p.pinning, { start: ["a", "d"], end: ["e"] });
	assert.deepEqual(p.order, ["a", "d", "b", "c", "e"]);
	const q = pinColumn(s, "b", "end");
	assert.deepEqual(q.pinning, { start: ["a"], end: ["b", "e"] });
	assert.deepEqual(q.order, ["a", "c", "d", "b", "e"]);
	const u = pinColumn(q, "b", null);
	assert.deepEqual(u.pinning, { start: ["a"], end: ["e"] });
	assert.deepEqual(u.order, ["a", "c", "d", "b", "e"], "unpinned from the end: last of the unpinned columns");
	const v = pinColumn(p, "d", null);
	assert.deepEqual(v.order, ["a", "d", "b", "c", "e"], "unpinned from the start: first of the unpinned columns");
	const w = pinColumn(p, "d", "end");
	assert.deepEqual(w.pinning, { start: ["a"], end: ["d", "e"] });
});

test("hiding: the last visible app column stays", () => {
	const users = ["a", "b"];
	const s = st({ order: ["a", "b", "x"], visibility: { b: false } });
	assert.equal(canHide(s, "a", users, all), false);
	assert.equal(setVisible(s, "a", false, users), s, "refused");
	assert.equal(canHide(st({ order: ["a", "b"] }), "a", users, all), true);
	assert.equal(canHide(st({ order: ["a", "b"] }), "a", users, (id) => id !== "a"), false, "not hideable");
	assert.deepEqual(setVisible(s, "b", true, users).visibility, {});
});

// ---- happy-dom: controls only on app columns ----

const COLUMNS = [{ id: "a", header: "A" }, { id: "b", header: "B", resizable: false }, { id: "c", header: "C", reorderable: false }];

test("header controls: app columns only; resizable false has no handle", async () => {
	const el = await mount("dj-data-grid", { columns: COLUMNS, data: [{ a: 1, b: 2, c: 3 }], selectionMode: "multiple" });
	el.plugins = [selectColumnPlugin(), columnsPlugin()];
	await settled(el);
	const head = (id) => el.renderRoot.querySelector(`.head [data-column="${id}"]`);
	assert.equal(head("dj-select").querySelector(".djc-controls"), null, "no controls on the checkbox column");
	assert.ok(head("a").querySelector('[part="resize-handle"]'));
	assert.ok(head("a").querySelector('[part="column-menu-button"]'));
	assert.equal(head("b").querySelector('[part="resize-handle"]'), null);
	assert.ok(head("c").querySelector(".djc-controls:not(.djc-movable)"), "c is not movable");
	assert.equal(el.renderRoot.querySelector(".head").style.gridTemplateColumns.includes("minmax(48px, 1fr)"), true, "the plugin gives flexible columns a floor");
});

test("header controls: a click on them does not sort", async () => {
	const el = await mount("dj-data-grid", { columns: COLUMNS, data: [{ a: 1 }] });
	el.plugins = [columnsPlugin()];
	await settled(el);
	el.renderRoot.querySelector('.head [data-column="a"] .djc-menu-btn').dispatchEvent(new globalThis.window.MouseEvent("click", { bubbles: true, composed: true }));
	await settled(el);
	assert.deepEqual(el.sorting, []);
});
