// data-grid-select (spec track SC): a checkbox column that OWNS a column, not the selection.
// Checkboxes read/write TanStack's existing row selection, so `selectionMode`, `rowSelection`
// and `dj-selection-change` stay the single source of truth.
//
// Same `.scroll` offset shim as the other grid plugin tests: happy-dom does no layout, so the
// virtualizer renders zero body rows without it and there'd be no checkbox to click.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/data-grid/dist/index.js";
import { selectColumnPlugin, SELECT_COLUMN_ID } from "../packages/data-grid-select/dist/index.js";

const proto = globalThis.window.HTMLElement.prototype;
for (const [prop, val] of [["offsetHeight", 400], ["offsetWidth", 320]]) {
	Object.defineProperty(proto, prop, {
		configurable: true,
		get() { return this.classList?.contains("scroll") ? val : 0; },
	});
}

const COLUMNS = [{ id: "a", header: "A", accessorKey: "a" }, { id: "b", header: "B", accessorKey: "b" }];
const rows = (n) => Array.from({ length: n }, (_, i) => ({ a: "a" + i, b: "b" + i }));
const grid = (props) => mount("dj-data-grid", { columns: COLUMNS, data: rows(5), ...props });

const boxes = (el) => [...el.renderRoot.querySelectorAll(".dj-select-row")];
const selectAll = (el) => el.renderRoot.querySelector(".dj-select-all");
const headers = (el) => [...el.renderRoot.querySelectorAll('[role="columnheader"]')];
// A click on a native checkbox performs the platform's activation behavior — flipping
// `.checked` and firing `change` — and happy-dom emulates that faithfully. So a click is the
// WHOLE gesture: dispatching an extra `change` afterwards double-toggles and hides real bugs.
const clickBox = (box, init = {}) =>
	box.dispatchEvent(new globalThis.window.MouseEvent("click", { bubbles: true, composed: true, ...init }));
const shiftClickBox = (box) => clickBox(box, { shiftKey: true });

test('selectionMode="none": no column is added at all', async () => {
	const el = await grid({ selectionMode: "none", plugins: [selectColumnPlugin()] });
	assert.equal(headers(el).length, 2, "only the consumer's own columns");
	assert.equal(boxes(el).length, 0, "and no checkboxes");
	assert.ok(!el.table.getAllColumns().some((c) => c.id === SELECT_COLUMN_ID), "no select column in the model");
});

test("multiple: a checkbox column is prepended and toggling updates rowSelection + emits", async () => {
	const el = await grid({ selectionMode: "multiple", plugins: [selectColumnPlugin()] });
	assert.equal(headers(el).length, 3, "select column plus the two data columns");
	assert.equal(el.table.getAllColumns()[0].id, SELECT_COLUMN_ID, "prepended by default");

	const emitted = [];
	el.addEventListener("dj-selection-change", (e) => emitted.push(e.detail.rows.length));

	const b = boxes(el);
	assert.equal(b.length, 5, "one checkbox per rendered row");
	clickBox(b[1]);
	await settled(el);
	assert.deepEqual(Object.keys(el.rowSelection), ["1"], "checkbox writes the shared selection state");
	assert.deepEqual(emitted, [1], "and the grid's own event fires once");
});

test('position: "end" appends the column instead', async () => {
	const el = await grid({ selectionMode: "multiple", plugins: [selectColumnPlugin({ position: "end" })] });
	const cols = el.table.getAllColumns();
	assert.equal(cols[cols.length - 1].id, SELECT_COLUMN_ID);
});

test("select-all toggles every row, and clears them all again", async () => {
	const el = await grid({ selectionMode: "multiple", plugins: [selectColumnPlugin()] });
	const all = selectAll(el);
	assert.ok(all, "header renders a select-all control");
	assert.equal(all.getAttribute("aria-label"), "Select all rows");

	clickBox(all);
	await settled(el);
	assert.equal(Object.keys(el.rowSelection).length, 5, "select all");

	clickBox(selectAll(el));
	await settled(el);
	assert.equal(Object.keys(el.rowSelection).length, 0, "clear all");
});

test("indeterminate is set as a DOM property on partial selection, and clears at both extremes", async () => {
	const el = await grid({ selectionMode: "multiple", plugins: [selectColumnPlugin()] });
	assert.equal(selectAll(el).indeterminate, false, "empty selection is not indeterminate");

	const b = boxes(el);
	clickBox(b[0]);
	await settled(el);
	assert.equal(selectAll(el).indeterminate, true, "partial selection is indeterminate");
	assert.equal(selectAll(el).checked, false);

	// Select the rest -> all selected, no longer indeterminate.
	clickBox(selectAll(el));
	await settled(el);
	assert.equal(selectAll(el).indeterminate, false, "full selection is not indeterminate");
	assert.equal(selectAll(el).checked, true);
});

test('single mode renders radios and no header control', async () => {
	const el = await grid({ selectionMode: "single", plugins: [selectColumnPlugin()] });
	const b = boxes(el);
	assert.equal(b.length, 5);
	assert.equal(b[0].type, "radio", "radios, not checkboxes");
	assert.equal(selectAll(el), null, "select-all is meaningless in single mode");

	clickBox(b[2]);
	await settled(el);
	assert.deepEqual(Object.keys(el.rowSelection), ["2"]);
	clickBox(b[3]);
	await settled(el);
	assert.deepEqual(Object.keys(el.rowSelection), ["3"], "single mode replaces rather than accumulates");
});

test("label() names each checkbox for a screen reader", async () => {
	const el = await grid({
		selectionMode: "multiple",
		plugins: [selectColumnPlugin({ label: (r) => `Select ${r.a}` })],
	});
	assert.equal(boxes(el)[2].getAttribute("aria-label"), "Select a2");
});

test("a checkbox click does not activate or toggle the row through the row handler", async () => {
	const el = await grid({
		selectionMode: "multiple",
		activation: "click",
		plugins: [selectColumnPlugin()],
	});
	const seen = [];
	el.addEventListener("dj-activate", (e) => seen.push(e.detail.index));

	const b = boxes(el);
	clickBox(b[1]);
	await settled(el);
	assert.deepEqual(seen, [], "the control owns the gesture; the row must not activate");
	assert.deepEqual(Object.keys(el.rowSelection), ["1"], "only the checkbox's own selection happened");
});

// ---------------------------------------------------------------- SC3 range selection

test("shift-click selects the contiguous range between the anchor and the clicked row", async () => {
	const el = await grid({ selectionMode: "multiple", plugins: [selectColumnPlugin()] });
	const b = boxes(el);
	clickBox(b[1]); // anchor = row 1
	await settled(el);
	shiftClickBox(boxes(el)[4]);
	await settled(el);
	assert.deepEqual(Object.keys(el.rowSelection).sort(), ["1", "2", "3", "4"], "range 1..4 inclusive");
});

test("a shift-range keys off the ROW MODEL, so it covers rows the DOM never rendered", async () => {
	// 500 rows in the model, a couple of dozen in the DOM. The range is built by indexing
	// table.getRowModel().rows, so the selected ids must be the model's ids for EVERY index in
	// between — including the ones with no element. A DOM-walking implementation cannot produce
	// this set, because most of those rows do not exist as elements.
	const el = await mount("dj-data-grid", {
		columns: COLUMNS, data: rows(500), selectionMode: "multiple",
		plugins: [selectColumnPlugin()],
	});
	const rendered = boxes(el).length;
	assert.ok(rendered < 500, `only ${rendered} of 500 rows are in the DOM`);

	clickBox(boxes(el)[0]); // anchor = row 0
	await settled(el);
	const last = rendered - 1;
	shiftClickBox(boxes(el)[last]);
	await settled(el);

	const model = el.table.getRowModel().rows;
	const expected = Array.from({ length: last + 1 }, (_, i) => model[i].id).sort();
	assert.deepEqual(Object.keys(el.rowSelection).sort(), expected, "every model row in the range");
});

test("shift-click with no anchor just sets the anchor and selects that row alone", async () => {
	const el = await grid({ selectionMode: "multiple", plugins: [selectColumnPlugin()] });
	const b = boxes(el);
	shiftClickBox(b[2]);
	await settled(el);
	assert.deepEqual(Object.keys(el.rowSelection), ["2"], "no anchor yet: behaves like a plain click");
});

test("a plain click after a shift-click resets the anchor", async () => {
	const el = await grid({ selectionMode: "multiple", plugins: [selectColumnPlugin()] });
	let b = boxes(el);
	clickBox(b[0]);                 // anchor = 0
	await settled(el);
	b = boxes(el);
	shiftClickBox(b[3]);
	await settled(el);
	assert.deepEqual(Object.keys(el.rowSelection).sort(), ["0", "1", "2", "3"], "range 0..3");

	// Plain click on row 2 re-anchors there; a following shift-click to 4 covers 2..4 only.
	b = boxes(el);
	clickBox(b[2]);
	await settled(el);
	b = boxes(el);
	shiftClickBox(b[4]);
	await settled(el);
	assert.ok(Object.keys(el.rowSelection).includes("4"), "the new range reached row 4");
});

test("no dj-activate fires for a shift-click on a checkbox", async () => {
	const el = await grid({ selectionMode: "multiple", activation: "click", plugins: [selectColumnPlugin()] });
	const seen = [];
	el.addEventListener("dj-activate", () => seen.push(1));
	const b = boxes(el);
	clickBox(b[0]);
	await settled(el);
	shiftClickBox(boxes(el)[3]);
	await settled(el);
	assert.deepEqual(seen, []);
});

// ---------------------------------------------------------------- keyboard (SC2 groundwork)

test("Space on a focused checkbox toggles that row once, not the active row", async () => {
	// The grid's keydown handler lives on [part="grid"], so a bubbled Space would call
	// toggleAt(activeIndex) — a DIFFERENT row than the focused checkbox — and its preventDefault
	// would also cancel the checkbox's own native activation. The plugin stops Space at the
	// control. Here the native activation is simulated by the `change` the browser would fire.
	const el = await grid({ selectionMode: "multiple", plugins: [selectColumnPlugin()] });
	const box = boxes(el)[2];

	box.dispatchEvent(new globalThis.window.Event("change", { bubbles: true }));
	box.dispatchEvent(new globalThis.window.KeyboardEvent("keydown", { key: " ", bubbles: true, composed: true }));
	await settled(el);

	assert.deepEqual(Object.keys(el.rowSelection), ["2"], "exactly the focused row, exactly once");
});

test("arrow keys still bubble from a checkbox so row navigation is not trapped", async () => {
	const el = await grid({ selectionMode: "multiple", plugins: [selectColumnPlugin()] });
	assert.equal(el.activeIndex, 0);
	boxes(el)[0].dispatchEvent(
		new globalThis.window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, composed: true }),
	);
	await settled(el);
	assert.equal(el.activeIndex, 1, "ArrowDown from inside the cell still moves the active row");
});

test("the control is block-level and its track allows for the cell's padding (no ellipsis)", async () => {
	// The grid's cell rule is `overflow:hidden; text-overflow:ellipsis; white-space:nowrap` with
	// horizontal padding of --dj-spacing-small. Two things stop a checkbox making that cell paint
	// an ellipsis beside it (Bill hit this in Perry): the control is display:block, because
	// text-overflow only applies to overflowing INLINE content; and the default track is sized for
	// the control PLUS that padding rather than for the control alone.
	const el = await grid({ selectionMode: "multiple", plugins: [selectColumnPlugin()] });

	assert.match(boxes(el)[0].getAttribute("style") || "", /display:\s*block/, "control is block-level");

	const rowStyle = el.renderRoot.querySelector('[part="row"]').getAttribute("style");
	const firstTrack = rowStyle.split("grid-template-columns:")[1].trim();
	assert.ok(
		firstTrack.startsWith("calc(1.5rem + var(--dj-spacing-small"),
		`the select track adds the cell padding to the control width, got: ${firstTrack}`,
	);
});

test("an explicit width option still wins", async () => {
	const el = await grid({ selectionMode: "multiple", plugins: [selectColumnPlugin({ width: "4rem" })] });
	const rowStyle = el.renderRoot.querySelector('[part="row"]').getAttribute("style");
	assert.ok(rowStyle.includes("grid-template-columns:4rem"), rowStyle);
});
