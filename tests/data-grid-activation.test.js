// data-grid activation (spec track AC): `activation` separates OPENING a row from SELECTING
// rows. Default "none" is byte-for-byte the original behavior; "click"/"double" emit
// dj-activate and stop a plain click from toggling selection. Modifier clicks are reserved
// for selection and must never activate.
//
// Same viewport shim as data-grid-plugins.test.js: happy-dom does no layout, so `.scroll`
// needs a non-zero offset size before the TanStack virtualizer renders body rows to click.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/data-grid/dist/index.js";

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
const rowEls = (el) => [...el.renderRoot.querySelectorAll('[part="row"]')];

/** Collect dj-activate on the HOST — also proves the event bubbles and is composed. */
function activations(el) {
	const seen = [];
	el.addEventListener("dj-activate", (e) => seen.push(e.detail));
	return seen;
}
const click = (rowEl, init = {}) =>
	rowEl.dispatchEvent(new globalThis.window.MouseEvent("click", { bubbles: true, composed: true, ...init }));
const dblclick = (rowEl, init = {}) =>
	rowEl.dispatchEvent(new globalThis.window.MouseEvent("dblclick", { bubbles: true, composed: true, ...init }));
const key = (el, k) =>
	el.renderRoot.querySelector('[role="grid"]')
		.dispatchEvent(new globalThis.window.KeyboardEvent("keydown", { key: k, bubbles: true, composed: true }));

// ---------------------------------------------------------------- default: nothing moves

test('activation defaults to "none" and a click still toggles selection, emitting no dj-activate', async () => {
	const el = await grid({ selectionMode: "multiple" });
	assert.equal(el.activation, "none");
	const seen = activations(el);

	click(rowEls(el)[1]);
	await settled(el);
	assert.deepEqual(Object.keys(el.rowSelection), ["1"], "click toggles selection, as it always did");
	assert.equal(seen.length, 0, "no dj-activate is ever emitted under none");

	click(rowEls(el)[1]);
	await settled(el);
	assert.equal(Object.keys(el.rowSelection).length, 0, "clicking again deselects");
	assert.equal(seen.length, 0);
});

test('under "none", Space and Enter both still toggle', async () => {
	const el = await grid({ selectionMode: "multiple" });
	const seen = activations(el);
	key(el, "Enter");
	await settled(el);
	assert.deepEqual(Object.keys(el.rowSelection), ["0"], "Enter toggles under none");
	key(el, " ");
	await settled(el);
	assert.equal(Object.keys(el.rowSelection).length, 0, "Space toggles under none");
	assert.equal(seen.length, 0);
});

// ---------------------------------------------------------------- activation="click"

test('"click": a plain click activates with the right row/index and leaves selection alone', async () => {
	const el = await grid({ activation: "click", selectionMode: "multiple" });
	const seen = activations(el);

	click(rowEls(el)[2]);
	await settled(el);
	assert.equal(seen.length, 1, "exactly one dj-activate");
	assert.deepEqual(seen[0].row, { a: "a2", b: "b2" }, "detail.row is the ORIGINAL row data");
	assert.equal(seen[0].index, 2, "detail.index is the row-model index");
	assert.deepEqual(el.rowSelection, {}, "activation must not toggle selection");
	assert.equal(el.activeIndex, 2, "the active row still follows the click");
});

test('"click": Ctrl/Cmd-click toggles selection and never activates', async () => {
	const el = await grid({ activation: "click", selectionMode: "multiple" });
	const seen = activations(el);

	click(rowEls(el)[1], { ctrlKey: true });
	await settled(el);
	assert.deepEqual(Object.keys(el.rowSelection), ["1"], "ctrl-click selects");
	assert.equal(seen.length, 0, "a modified click never activates");

	click(rowEls(el)[3], { metaKey: true });
	await settled(el);
	assert.deepEqual(Object.keys(el.rowSelection).sort(), ["1", "3"], "cmd-click adds to the selection");
	assert.equal(seen.length, 0);
});

test('"click": Shift-click is reserved for the range gesture and never activates', async () => {
	const el = await grid({ activation: "click", selectionMode: "multiple" });
	const seen = activations(el);
	click(rowEls(el)[2], { shiftKey: true });
	await settled(el);
	assert.equal(seen.length, 0, "shift-click must not activate (the select plugin owns ranges)");
});

test("Enter activates while Space still selects", async () => {
	const el = await grid({ activation: "click", selectionMode: "multiple" });
	const seen = activations(el);

	key(el, "Enter");
	await settled(el);
	assert.equal(seen.length, 1, "Enter activates");
	assert.equal(seen[0].index, 0);
	assert.deepEqual(el.rowSelection, {}, "Enter must not select");

	key(el, " ");
	await settled(el);
	assert.deepEqual(Object.keys(el.rowSelection), ["0"], "Space still selects");
	assert.equal(seen.length, 1, "Space must not activate");
});

test('activation fires with selectionMode="none" (a read-only clickable list)', async () => {
	const el = await grid({ activation: "click", selectionMode: "none" });
	const seen = activations(el);
	click(rowEls(el)[1]);
	await settled(el);
	assert.equal(seen.length, 1, "activation is independent of selection being enabled");
	assert.equal(seen[0].index, 1);
});

// ---------------------------------------------------------------- activation="double"

test('"double": a single click does not activate; one double click activates exactly once', async () => {
	const el = await grid({ activation: "double", selectionMode: "multiple" });
	const seen = activations(el);
	const row = rowEls(el)[1];

	click(row);
	await settled(el);
	assert.equal(seen.length, 0, "a single click must not activate under double");
	assert.deepEqual(el.rowSelection, {}, "...and must not toggle either");
	assert.equal(el.activeIndex, 1, "it only moves the active row");

	// A real double click delivers TWO clicks and then one dblclick. If the implementation
	// hand-rolled a click timer instead of using dblclick, this would emit more than once.
	click(row);
	dblclick(row);
	await settled(el);
	assert.equal(seen.length, 1, "exactly one dj-activate for one double click");
	assert.equal(seen[0].index, 1);
});

test('"double": modified double clicks do not activate', async () => {
	const el = await grid({ activation: "double", selectionMode: "multiple" });
	const seen = activations(el);
	dblclick(rowEls(el)[2], { ctrlKey: true });
	dblclick(rowEls(el)[2], { shiftKey: true });
	await settled(el);
	assert.equal(seen.length, 0);
});

// ---------------------------------------------------------------- AC2 regressions

test("changing activation at runtime takes effect without replacing data", async () => {
	const el = await grid({ selectionMode: "multiple" });
	const seen = activations(el);

	click(rowEls(el)[0]);
	await settled(el);
	assert.equal(seen.length, 0, "starts under none");
	assert.deepEqual(Object.keys(el.rowSelection), ["0"], "...and toggled instead");
	click(rowEls(el)[0]); // toggle it back off through the real path (TanStack owns the state)
	await settled(el);
	assert.deepEqual(el.rowSelection, {}, "selection cleared before switching modes");

	el.activation = "click";
	await settled(el);
	click(rowEls(el)[0]);
	await settled(el);
	assert.equal(seen.length, 1, "the new mode applies with no data change");

	el.activation = "none";
	await settled(el);
	click(rowEls(el)[1]);
	await settled(el);
	assert.equal(seen.length, 1, "and switching back restores toggling");
	assert.deepEqual(Object.keys(el.rowSelection), ["1"]);
});

test("a virtualized row far down the list reports its row-model index, not the rendered offset", async () => {
	const el = await mount("dj-data-grid", { columns: COLUMNS, data: rows(500), activation: "click" });
	const seen = activations(el);

	el.activeIndex = 400;
	await settled(el);
	key(el, "Enter");
	await settled(el);
	assert.equal(seen.length, 1);
	assert.equal(seen[0].index, 400, "index is the row-model index");
	assert.deepEqual(seen[0].row, { a: "a400", b: "b400" }, "and the row data matches that index");
});

test("a row that is both selected and activated emits the two events independently", async () => {
	const el = await grid({ activation: "click", selectionMode: "multiple" });
	const order = [];
	el.addEventListener("dj-selection-change", () => order.push("selection"));
	el.addEventListener("dj-activate", () => order.push("activate"));

	click(rowEls(el)[2], { ctrlKey: true }); // select only
	await settled(el);
	assert.deepEqual(order, ["selection"], "selecting emits only dj-selection-change");

	click(rowEls(el)[2]); // activate the already-selected row
	await settled(el);
	assert.deepEqual(order, ["selection", "activate"], "activating emits only dj-activate");
	assert.deepEqual(Object.keys(el.rowSelection), ["2"], "and leaves the selection intact");
});
