// data-grid columns spec GC1 and GC5: the column state and layout math (order, hidden columns,
// pinned start and end, RTL) and merging a saved state into the columns a grid has now. Pure
// functions, so no layout is needed; the grid tests at the end check the wiring.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/data-grid/dist/index.js";
import {
	mergeOrder, resolveColumnState, layoutColumns, sumLengths, isFixedLength, defaultColumnState,
} from "../packages/data-grid/dist/column-layout.js";

const cols = [
	{ id: "a", width: "100px" },
	{ id: "b", width: "120px" },
	{ id: "c" },
	{ id: "d", width: "80px" },
];
const users = new Set(["a", "b", "c", "d"]);

test("mergeOrder: saved order wins, unknown ids drop, missing ids return at their declared place", () => {
	assert.deepEqual(mergeOrder(["a", "b", "c"], ["c", "a", "b"]), ["c", "a", "b"]);
	assert.deepEqual(mergeOrder(["a", "b", "c"], ["c", "zz", "a"]), ["c", "a", "b"], "zz dropped; b goes after a, its declared predecessor");
	assert.deepEqual(mergeOrder(["new", "a", "b"], ["b", "a"]), ["new", "b", "a"], "no placed predecessor: first");
	assert.deepEqual(mergeOrder(["a", "x", "y", "b"], ["b", "a"]), ["b", "a", "x", "y"], "consecutive new columns keep their order");
	assert.deepEqual(mergeOrder(["a", "b"], ["a", "a", "b"]), ["a", "b"], "duplicates dropped");
	assert.deepEqual(mergeOrder(["a", "b"], undefined), ["a", "b"]);
});

test("GC5: a saved state with an unknown id and a missing id merges cleanly", () => {
	const saved = {
		order: ["d", "gone", "b", "a"],
		sizing: { gone: 300, b: 200 },
		pinning: { start: ["gone", "d"], end: [] },
		visibility: { gone: false, a: false },
	};
	const s = resolveColumnState(cols, saved, users);
	assert.deepEqual(s.order, ["d", "b", "c", "a"], "unknown dropped; c (missing) goes back after b, its declared predecessor");
	assert.deepEqual(s.sizing, { b: 200 });
	assert.deepEqual(s.pinning, { start: ["d"], end: [] });
	assert.deepEqual(s.visibility, { a: false });
});

test("resolveColumnState: declared pinned seeds pinning; groups are regrouped; widths clamp", () => {
	const c2 = [{ id: "a" }, { id: "b", pinned: "end" }, { id: "c", pinned: "start", minWidth: 50, maxWidth: 200 }];
	const s = resolveColumnState(c2, { sizing: { c: 999, a: 10 } });
	assert.deepEqual(s.order, ["c", "a", "b"]);
	assert.deepEqual(s.pinning, { start: ["c"], end: ["b"] });
	assert.deepEqual(s.sizing, { c: 200, a: 10 });
	const t = resolveColumnState(c2, { sizing: { c: 5, a: -1, b: Number.NaN } });
	assert.deepEqual(t.sizing, { c: 50 }, "min clamp; non-positive and NaN dropped");
	assert.deepEqual(defaultColumnState(c2).pinning, { start: ["c"], end: ["b"] });
});

test("resolveColumnState: the last visible app column cannot be hidden", () => {
	const s = resolveColumnState(cols, { visibility: { a: false, b: false, c: false, d: false } }, users);
	assert.deepEqual(s.visibility, { b: false, c: false, d: false });
});

test("layout: order and hidden columns shape the template", () => {
	const s = resolveColumnState(cols, { order: ["c", "a", "d", "b"], visibility: { d: false }, sizing: { c: 150 } });
	const lay = layoutColumns(cols, s, users);
	assert.deepEqual(lay.columns.map((c) => c.id), ["c", "a", "b"]);
	assert.equal(lay.template, "150px 100px 120px");
	assert.equal(lay.minWidth, "370px");
	assert.deepEqual(lay.tanstack.columnOrder, ["c", "a", "d", "b"], "TanStack order keeps hidden columns");
	assert.equal(lay.tanstack.columnVisibility.d, false);
});

test("layout: flexible tracks keep the default, and minWidth sets a floor", () => {
	const lay = layoutColumns([{ id: "a" }, { id: "b", minWidth: 60 }], defaultColumnState([{ id: "a" }, { id: "b" }]), new Set(["a", "b"]));
	assert.equal(lay.template, "minmax(0, 1fr) minmax(60px, 1fr)");
	assert.equal(lay.minWidth, "60px");
	const none = layoutColumns([{ id: "a" }], defaultColumnState([{ id: "a" }]), new Set(["a"]));
	assert.equal(none.minWidth, "", "no floor at all for the plain default");
});

test("layout: pinned start offsets accumulate from the start", () => {
	const s = resolveColumnState(cols, { pinning: { start: ["b", "a"], end: [] } });
	const lay = layoutColumns(cols, s, users);
	assert.deepEqual(lay.columns.map((c) => [c.id, c.pinned, c.offset, c.edge]), [
		["a", "start", "0px", false],
		["b", "start", "100px", true],
		["c", null, null, false],
		["d", null, null, false],
	]);
	assert.deepEqual(lay.tanstack.columnPinning, { left: ["a", "b"], right: [] });
});

test("layout: pinned end offsets accumulate from the end", () => {
	const s = resolveColumnState(cols, { pinning: { start: [], end: ["a", "d"] } });
	const lay = layoutColumns(cols, s, users);
	assert.deepEqual(lay.columns.map((c) => c.id), ["b", "c", "a", "d"]);
	assert.deepEqual(lay.columns.filter((c) => c.pinned).map((c) => [c.id, c.offset, c.edge]), [["a", "80px", true], ["d", "0px", false]]);
	assert.deepEqual(lay.tanstack.columnPinning.right, ["a", "d"]);
});

test("layout: hidden pinned columns take no offset", () => {
	const s = resolveColumnState(cols, { pinning: { start: ["a", "b"], end: [] }, visibility: { a: false } });
	const lay = layoutColumns(cols, s, users);
	assert.deepEqual(lay.columns.filter((c) => c.pinned).map((c) => [c.id, c.offset]), [["b", "0px"]]);
});

test("layout: offsets are logical, so RTL needs nothing different", () => {
	// The grid draws offsets as inset-inline-start/end; the browser flips them for dir=rtl.
	// The math is therefore direction-free: the same state lays out identically.
	const s = resolveColumnState(cols, { pinning: { start: ["a"], end: ["d"] } });
	const a = layoutColumns(cols, s, users);
	const b = layoutColumns(cols, s, users);
	assert.deepEqual(a, b);
	assert.equal(a.columns[0].offset, "0px");
	assert.equal(a.columns.at(-1).offset, "0px");
});

test("layout: a pinned flexible column waits for a measured width", () => {
	const s = resolveColumnState(cols, { order: ["c", "a", "b", "d"], pinning: { start: ["c", "a"], end: [] } });
	const before = layoutColumns(cols, s, users);
	const c = before.columns.find((x) => x.id === "c");
	assert.equal(c.pinned, null);
	assert.equal(c.pending, true);
	assert.equal(before.columns.find((x) => x.id === "a").pending, true, "a column after an unplaced one waits too");
	const after = layoutColumns(cols, s, users, { c: 210.4 });
	assert.deepEqual(after.columns.slice(0, 2).map((x) => [x.id, x.track, x.offset]), [["c", "210px", "0px"], ["a", "100px", "210px"]]);
});

test("layout: leading plugin columns join a non-empty start group and stay first", () => {
	const withSel = [{ id: "dj-select", width: "40px" }, ...cols];
	const s = resolveColumnState(withSel, { pinning: { start: ["c"], end: [] }, sizing: { c: 90 } });
	const lay = layoutColumns(withSel, s, users);
	assert.deepEqual(lay.columns.slice(0, 2).map((x) => [x.id, x.offset]), [["dj-select", "0px"], ["c", "40px"]]);
	const none = layoutColumns(withSel, resolveColumnState(withSel, {}), users);
	assert.equal(none.columns[0].pinned, null, "nothing pinned: the checkbox column is not pinned either");
});

test("sumLengths and isFixedLength", () => {
	assert.equal(sumLengths(["10px", "20.5px"]), "30.5px");
	assert.equal(sumLengths(["10px", "2rem"]), "calc(10px + 2rem)");
	assert.equal(sumLengths(["2rem"]), "calc(2rem)");
	assert.ok(isFixedLength("120px"));
	assert.ok(isFixedLength("calc(1.5rem + var(--x, .75rem) * 2)"));
	assert.ok(!isFixedLength("minmax(0, 1fr)"));
	assert.ok(!isFixedLength("2fr"));
	assert.ok(!isFixedLength("25%"));
	assert.ok(!isFixedLength(undefined));
});

// ---- The grid wiring ----

// happy-dom does no layout: give .scroll a size so the virtualizer renders body rows.
const proto = globalThis.window.HTMLElement.prototype;
for (const [prop, val] of [["offsetHeight", 400], ["offsetWidth", 320]]) {
	Object.defineProperty(proto, prop, {
		configurable: true,
		get() { return this.classList?.contains("scroll") ? val : 0; },
	});
}

const COLUMNS = [{ id: "a", header: "A", width: "100px" }, { id: "b", header: "B" }, { id: "c", header: "C", width: "50px" }];
const data = [{ a: 1, b: 2, c: 3 }];
const headerIds = (el) => [...el.renderRoot.querySelectorAll('[role="columnheader"]')].map((h) => h.dataset.column);

test("grid: columnState sets order, visibility, and widths; reading it back is resolved", async () => {
	const el = await mount("dj-data-grid", { columns: COLUMNS, data });
	let events = 0;
	el.addEventListener("dj-column-state-change", () => events++);
	el.columnState = { order: ["c", "a"], visibility: { b: false }, sizing: { a: 140 } };
	await settled(el);
	assert.deepEqual(headerIds(el), ["c", "a"]);
	assert.equal(el.renderRoot.querySelector(".head").style.gridTemplateColumns, "50px 140px");
	assert.deepEqual(el.columnState.order, ["c", "a", "b"], "b returns at its declared place, hidden");
	assert.equal(events, 0, "setting the property emits nothing");
	const cells = [...el.renderRoot.querySelectorAll('[role="row"] [role="gridcell"]')].map((c) => c.dataset.column);
	assert.deepEqual(cells.slice(0, 2), ["c", "a"], "body cells follow");
	assert.equal(el.renderRoot.querySelector('[role="grid"]').getAttribute("aria-colcount"), "2");
});

test("grid: pinned columns are sticky with offsets", async () => {
	const el = await mount("dj-data-grid", { columns: COLUMNS, data });
	el.columnState = { pinning: { start: ["c"], end: ["a"] } };
	await settled(el);
	assert.deepEqual(headerIds(el), ["c", "b", "a"]);
	const head = el.renderRoot.querySelector('[data-column="c"]');
	assert.ok(head.classList.contains("pin--start"));
	assert.match(head.getAttribute("style"), /inset-inline-start:0px/);
	const end = el.renderRoot.querySelector('.head [data-column="a"]');
	assert.match(end.getAttribute("style"), /inset-inline-end:0px/);
});

test("grid: the declared pinned is the starting value", async () => {
	const el = await mount("dj-data-grid", { columns: [...COLUMNS.slice(0, 2), { ...COLUMNS[2], pinned: "start" }], data });
	assert.deepEqual(headerIds(el), ["c", "a", "b"]);
	assert.deepEqual(el.columnState.pinning, { start: ["c"], end: [] });
});

test("grid: columns added later keep a restored state", async () => {
	const el = await mount("dj-data-grid", { columns: [], data });
	el.columnState = { order: ["c", "b", "a"] };
	await settled(el);
	el.columns = COLUMNS;
	await settled(el);
	assert.deepEqual(headerIds(el), ["c", "b", "a"]);
});
