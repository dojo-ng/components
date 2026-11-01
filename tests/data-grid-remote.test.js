// dj-data-grid remote rows (data-grid-remote-rows-spec.md, Track RR, RR1-RR4): `rowCount`,
// placeholder rows, `dj-rows-request` / `setRows` with the epoch, the settle hold on jumps, the
// cache and its eviction, and the keyboard and active row across rows that are not loaded.
//
// HARNESS: the same `.scroll` offsetHeight stub as data-grid-viewport.test.js, so the virtualizer
// measures a 400 px viewport and renders a real moving window. Rows use the fixed `rowHeight`.
import { mount, settled } from "./setup.js";
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import "../packages/data-grid/dist/index.js";

const proto = globalThis.window.HTMLElement.prototype;
for (const [prop, val] of [["offsetHeight", 400], ["offsetWidth", 320]]) {
	Object.defineProperty(proto, prop, {
		configurable: true,
		get() { return this.classList?.contains("scroll") ? val : 0; },
	});
}

// The virtualizer clamps a keyboard jump (End) to scrollHeight - clientHeight, and happy-dom
// reports both as 0. Give `.scroll` the values a browser would: its content height (the rowgroup)
// and the stubbed viewport.
Object.defineProperty(proto, "scrollHeight", {
	configurable: true,
	get() {
		if (!this.classList?.contains("scroll")) return 0;
		return parseFloat(/height:(\d+)px/.exec(this.firstElementChild?.getAttribute("style") ?? "")?.[1] ?? "0");
	},
});
Object.defineProperty(proto, "clientHeight", {
	configurable: true,
	get() { return this.classList?.contains("scroll") ? 400 : 0; },
});

const COLUMNS = [{ id: "a", header: "A", accessorKey: "a" }, { id: "b", header: "B", accessorKey: "b" }];
const ROW_H = 30;
const rowsFrom = (start, end) => Array.from({ length: end - start + 1 }, (_, k) => ({ id: "m" + (start + k), a: "a" + (start + k), b: "b" + (start + k) }));
const getRowId = (row) => row.id;

const rowEls = (el) => [...el.renderRoot.querySelectorAll('[part~="row"]')];
const placeholders = (el) => rowEls(el).filter((r) => r.getAttribute("part").split(" ").includes("row--placeholder"));
const loaded = (el) => rowEls(el).filter((r) => !r.getAttribute("part").split(" ").includes("row--placeholder"));
const gridEl = (el) => el.renderRoot.querySelector(".grid");
const key = (el, k) => gridEl(el).dispatchEvent(new globalThis.window.KeyboardEvent("keydown", { key: k, bubbles: true, composed: true }));

/** Mount a remote grid and record every dj-rows-request (attached before the first render). */
async function remoteGrid(props = {}) {
	const el = globalThis.document.createElement("dj-data-grid");
	const requests = [];
	el.addEventListener("dj-rows-request", (e) => requests.push(e.detail));
	Object.assign(el, { columns: COLUMNS, rowCount: 100000, rowHeight: ROW_H, getRowId, ...props });
	globalThis.document.body.appendChild(el);
	await settle(el);
	return { el, requests };
}
async function settle(el) {
	for (let i = 0; i < 4; i++) await settled(el);
}
async function scrollTo(el, top) {
	const scroll = el.renderRoot.querySelector(".scroll");
	scroll.scrollTop = top;
	scroll.dispatchEvent(new Event("scroll"));
	await settle(el);
}
/** Fire the scroll event a browser would send after the grid scrolled itself. */
async function syncScroll(el) {
	el.renderRoot.querySelector(".scroll").dispatchEvent(new Event("scroll"));
	await settle(el);
}
/** Answer every request at once, as a host with an instant source would. */
function autoAnswer(el) {
	el.addEventListener("dj-rows-request", (e) => {
		const { start, end, epoch } = e.detail;
		queueMicrotask(() => el.setRows(start, rowsFrom(start, end), epoch));
	});
}
const answer = (el, req) => el.setRows(req.start, rowsFrom(req.start, req.end), req.epoch);

// ---- RR1: rowCount, placeholders, the scrollbar ----

test("RR1: 100,000 rows with nothing loaded size the scrollbar and render placeholders", async () => {
	const { el } = await remoteGrid({ rowHeight: 36 });
	const rowgroup = el.renderRoot.querySelector('[role="rowgroup"]');
	assert.match(rowgroup.getAttribute("style"), /height:3600000px/, "rowgroup is rowCount × rowHeight tall");
	assert.equal(gridEl(el).getAttribute("aria-rowcount"), "100001", "aria-rowcount is rowCount + the header row");
	const rows = rowEls(el);
	assert.ok(rows.length > 0, "rows are rendered");
	assert.equal(placeholders(el).length, rows.length, "every rendered row is a placeholder");
	assert.deepEqual(rows.slice(0, 3).map((r) => r.getAttribute("aria-rowindex")), ["2", "3", "4"], "aria-rowindex starts at 2");
	for (const r of rows) {
		assert.equal(r.getAttribute("role"), "row");
		assert.equal(r.getAttribute("aria-busy"), "true");
		assert.equal(r.querySelectorAll('[role="gridcell"]').length, 2, "one empty cell per column");
	}
});

test("RR1: scrolling to 2,000,000 px renders placeholders near row 55,555", async () => {
	const { el } = await remoteGrid({ rowHeight: 36 });
	await scrollTo(el, 2000000);
	const idx = rowEls(el).map((r) => Number(r.getAttribute("aria-rowindex")) - 2);
	assert.ok(idx.length > 0);
	assert.ok(idx.some((i) => i === 55555), `rendered indices cover 55,555 (got ${idx[0]}..${idx.at(-1)})`);
	assert.ok(idx[0] >= 55555 - 20 && idx.at(-1) <= 55555 + 40, "the window is near 55,555");
	assert.equal(placeholders(el).length, idx.length);
});

test("RR1: data is ignored in remote mode, and loaded rows render real cells", async () => {
	const { el, requests } = await remoteGrid({ data: rowsFrom(0, 4).map((r) => ({ ...r, a: "LOCAL" })) });
	assert.ok(!el.renderRoot.textContent.includes("LOCAL"), "data is not rendered");
	answer(el, requests[0]);
	await settle(el);
	assert.equal(el.renderRoot.querySelector("#r-0 .cell").textContent, "a0");
});

test("RR1: plugin hooks are not called for placeholders; ctx.rowAt and ctx.indexOf use absolute indices", async () => {
	let ctx;
	const calls = { renderCell: 0, decorateCell: 0, rowAttributes: 0 };
	const spy = {
		name: "spy",
		setup(c) { ctx = c; },
		renderCell() { calls.renderCell++; return undefined; },
		decorateCell(_cell, content) { calls.decorateCell++; return content; },
		rowAttributes() { calls.rowAttributes++; return {}; },
	};
	const { el } = await remoteGrid({ plugins: [spy], settleMs: 0 });
	assert.deepEqual(calls, { renderCell: 0, decorateCell: 0, rowAttributes: 0 }, "no hook ran for placeholders");
	assert.equal(ctx.rowAt(5), undefined, "an unloaded row is undefined");

	await scrollTo(el, 5000 * ROW_H);
	el.setRows(5000, rowsFrom(5000, 5099), el.epoch);
	await settle(el);
	assert.ok(calls.renderCell > 0 && calls.decorateCell > 0 && calls.rowAttributes > 0, "hooks run for loaded rows");
	const row = ctx.rowAt(5010);
	assert.equal(row.original.id, "m5010", "rowAt takes an absolute index");
	assert.equal(ctx.indexOf(row), 5010, "indexOf returns it");
});

test("RR1: outside remote mode ctx.rowAt and ctx.indexOf are row-model indices", async () => {
	let ctx;
	const el = await mount("dj-data-grid", { columns: COLUMNS, data: rowsFrom(0, 9), plugins: [{ name: "c", setup(c) { ctx = c; } }] });
	await settle(el);
	assert.equal(ctx.rowAt(3).original.id, "m3");
	assert.equal(ctx.indexOf(ctx.rowAt(7)), 7);
	assert.equal(ctx.rowAt(10), undefined);
});

// ---- RR2: dj-rows-request, setRows, the epoch, coalescing ----

test("RR2 (a): the first render with ~20 visible rows asks for exactly block 0-99", async () => {
	const { requests } = await remoteGrid();
	assert.equal(requests.length, 1);
	assert.deepEqual({ start: requests[0].start, end: requests[0].end }, { start: 0, end: 99 });
	assert.equal(typeof requests[0].epoch, "number");
	assert.equal(requests[0].reason, "range");
});

test("RR2 (b): answering renders real cells and asks for nothing more", async () => {
	const { el, requests } = await remoteGrid();
	assert.equal(answer(el, requests[0]), true);
	await settle(el);
	assert.equal(placeholders(el).length, 0, "no placeholders left on screen");
	assert.equal(el.renderRoot.querySelector("#r-3 .cell").textContent, "a3");
	assert.equal(requests.length, 1, "no further request");
});

test("RR2 (c): scrolling one row asks nothing; scrolling into block 100 asks for 100-199 once", async () => {
	const { el, requests } = await remoteGrid();
	answer(el, requests[0]);
	await settle(el);
	await scrollTo(el, ROW_H);
	assert.equal(requests.length, 1, "one row of scrolling asks nothing");
	// Ordinary scrolling, ten rows at a time (less than a viewport, so no settle hold).
	for (let top = 300; top <= 3000; top += 300) await scrollTo(el, top);
	const second = requests.filter((r) => r.start === 100);
	assert.equal(second.length, 1, "block 100 requested once");
	assert.equal(second[0].end, 199);
	assert.equal(requests.length, 2, "nothing else requested");
});

test("RR2 (d): a jump to the end asks nothing until 100 ms of stillness, then one request", async () => {
	mock.timers.enable({ apis: ["setTimeout"] });
	try {
		const { el, requests } = await remoteGrid();
		answer(el, requests[0]);
		await settle(el);
		await scrollTo(el, 100000 * ROW_H);
		assert.equal(requests.length, 1, "nothing requested during the hold");
		mock.timers.tick(99);
		await settle(el);
		assert.equal(requests.length, 1, "still nothing at 99 ms");
		mock.timers.tick(1);
		await settle(el);
		assert.equal(requests.length, 2, "one request once the range held still");
		assert.deepEqual({ start: requests[1].start, end: requests[1].end }, { start: 99900, end: 99999 });
	} finally {
		mock.timers.reset();
	}
});

test("RR2 (d): movement during the hold restarts it, and only the final range is requested", async () => {
	mock.timers.enable({ apis: ["setTimeout"] });
	try {
		const { el, requests } = await remoteGrid();
		await scrollTo(el, 50000 * ROW_H);
		mock.timers.tick(60);
		await scrollTo(el, 80000 * ROW_H);
		mock.timers.tick(60);
		await settle(el);
		assert.equal(requests.length, 1, "the hold restarted on the second jump");
		mock.timers.tick(40);
		await settle(el);
		assert.equal(requests.length, 2);
		// Row 80,000 plus the 8 overscan rows above it spans blocks 799 and 800.
		assert.deepEqual({ start: requests[1].start, end: requests[1].end }, { start: 79900, end: 80099 }, "only the range the user stopped on is requested");
	} finally {
		mock.timers.reset();
	}
});

test("RR2 (e): an answer with an old epoch is dropped, the rows stay placeholders, and they are asked for again", async () => {
	const { el, requests } = await remoteGrid();
	const old = requests[0];
	el.resetRows();
	await settle(el);
	assert.equal(requests.length, 2, "the reset asked again");
	assert.ok(requests[1].epoch > old.epoch, "with a newer epoch");
	assert.deepEqual({ start: requests[1].start, end: requests[1].end }, { start: 0, end: 99 });
	assert.equal(answer(el, old), false, "the stale answer is refused");
	await settle(el);
	assert.equal(loaded(el).length, 0, "stale rows were not shown");
	assert.equal(el._cachedRowCount, 0);
	assert.equal(answer(el, requests[1]), true);
	await settle(el);
	assert.equal(placeholders(el).length, 0, "the current answer fills the rows");
});

// ---- RR3: cache and eviction ----

test("RR3: the cache stays within cacheSize, keeps the block on screen, and refetches evicted blocks", async () => {
	const { el, requests } = await remoteGrid({ cacheSize: 300, blockSize: 100, settleMs: 0 });
	autoAnswer(el);
	answer(el, requests[0]);
	await settle(el);
	for (const row of [1050, 2050, 3050]) {
		await scrollTo(el, row * ROW_H);
		await settle(el);
		assert.ok(el._cachedRowCount <= 300, `cache holds ${el._cachedRowCount} rows at row ${row}`);
		assert.equal(placeholders(el).length, 0, `the block on screen at row ${row} was kept`);
		assert.equal(el.renderRoot.querySelector(`#r-${row} .cell`).textContent, "a" + row);
	}
	const before = requests.filter((r) => r.start === 0).length;
	await scrollTo(el, 0);
	await settle(el);
	assert.equal(requests.filter((r) => r.start === 0).length, before + 1, "block 0 was evicted and is requested again");
	assert.equal(placeholders(el).length, 0);
	assert.ok(el._cachedRowCount <= 300);
});

// ---- RR4: keyboard, focus, and the active row across unloaded rows ----

test("RR4: End on 100,000 rows: index 99,999, a row-less dj-active-change, a request, then the row", async () => {
	const { el, requests } = await remoteGrid({ settleMs: 0 });
	answer(el, requests[0]);
	await settle(el);
	const changes = [];
	el.addEventListener("dj-active-change", (e) => changes.push(e.detail));
	key(el, "End");
	await syncScroll(el); // a browser fires scroll after the grid's scrollTo; happy-dom does not
	assert.equal(el.activeIndex, 99999);
	assert.equal(changes.length, 1, "one dj-active-change");
	assert.deepEqual(changes[0], { index: 99999, row: undefined });
	const req = requests.at(-1);
	assert.deepEqual({ start: req.start, end: req.end }, { start: 99900, end: 99999 });
	answer(el, req);
	await settle(el);
	assert.equal(changes.length, 2, "a second dj-active-change once the block landed");
	assert.equal(changes[1].index, 99999);
	assert.equal(changes[1].row.id, "m99999");
	answer(el, req); // answering twice must not announce again
	assert.equal(changes.length, 2);
});

test("RR4: the late announcement is skipped when the user moved on", async () => {
	const { el, requests } = await remoteGrid({ settleMs: 0 });
	const changes = [];
	el.addEventListener("dj-active-change", (e) => changes.push(e.detail));
	key(el, "ArrowDown");
	key(el, "ArrowDown");
	await settle(el);
	assert.deepEqual(changes.map((c) => c.index), [1, 2]);
	answer(el, requests[0]);
	await settle(el);
	assert.equal(changes.length, 3, "only the current active row is announced again");
	assert.deepEqual(changes[2], { index: 2, row: rowsFrom(2, 2)[0] });
});

test("RR4: PageDown and PageUp move by the whole rows in the viewport, in both modes", async () => {
	// 400 px viewport / 30 px rows = 13 whole rows.
	const local = await mount("dj-data-grid", { columns: COLUMNS, data: rowsFrom(0, 99), rowHeight: ROW_H });
	await settle(local);
	key(local, "PageDown"); await settle(local);
	assert.equal(local.activeIndex, 13);
	key(local, "PageDown"); await settle(local);
	assert.equal(local.activeIndex, 26);
	key(local, "PageUp"); await settle(local);
	assert.equal(local.activeIndex, 13);
	key(local, "PageUp"); key(local, "PageUp"); await settle(local);
	assert.equal(local.activeIndex, 0, "clamped at the top");

	const { el } = await remoteGrid();
	key(el, "PageDown"); await settle(el);
	assert.equal(el.activeIndex, 13, "remote mode moves the same distance");
	key(el, "End"); key(el, "PageDown"); await settle(el);
	assert.equal(el.activeIndex, 99999, "clamped at rowCount - 1");
});

test("RR4: dj-activate does nothing on a placeholder", async () => {
	const { el, requests } = await remoteGrid({ activation: "click", settleMs: 0 });
	const activations = [];
	el.addEventListener("dj-activate", (e) => activations.push(e.detail));
	key(el, "Enter");
	el.renderRoot.querySelector("#r-2").dispatchEvent(new globalThis.window.MouseEvent("click", { bubbles: true, composed: true }));
	await settle(el);
	assert.equal(activations.length, 0, "no dj-activate before the row is loaded");
	assert.equal(el.activeIndex, 2, "a click on a placeholder still moves the active row");
	answer(el, requests[0]);
	await settle(el);
	key(el, "Enter");
	assert.equal(activations.length, 1);
	assert.deepEqual(activations[0], { row: rowsFrom(2, 2)[0], index: 2 });
});

test("RR4: aria-activedescendant points at a rendered placeholder", async () => {
	const { el } = await remoteGrid();
	key(el, "ArrowDown"); key(el, "ArrowDown"); key(el, "ArrowDown");
	await settle(el);
	const id = gridEl(el).getAttribute("aria-activedescendant");
	assert.equal(id, "r-3");
	const row = el.renderRoot.getElementById(id);
	assert.equal(row.getAttribute("aria-busy"), "true", "the active row is a placeholder");
	assert.ok(row.getAttribute("part").split(" ").includes("row--active"));
});

test("RR4: a missing getRowId warns once and keys selection by absolute index", async () => {
	const warn = mock.method(console, "warn", () => {});
	try {
		const { el, requests } = await remoteGrid({ getRowId: undefined, selectionMode: "multiple", settleMs: 0 });
		answer(el, requests[0]);
		await settle(el);
		el.toggleAt(4);
		await settle(el);
		assert.deepEqual(el.rowSelection, { 4: true });
		assert.equal(warn.mock.calls.length, 1, "warned once");
	} finally {
		warn.mock.restore();
	}
});

// ---- RR5: sorting handed to the host ----

const header = (el, i = 0) => el.renderRoot.querySelectorAll('[role="columnheader"]')[i];

test("RR5: a header click emits dj-sort, drops the rows, and asks for 0-99 in a new epoch", async () => {
	const { el, requests } = await remoteGrid();
	answer(el, requests[0]);
	await settle(el);
	const old = requests[0];
	const sorts = [];
	el.addEventListener("dj-sort", (e) => sorts.push({ detail: e.detail, gridSorting: el.sorting }));

	header(el).click();
	await settle(el);
	assert.equal(sorts.length, 1, "dj-sort fired");
	assert.deepEqual(sorts[0].detail.sorting, [{ id: "a", desc: false }]);
	assert.deepEqual(sorts[0].gridSorting, sorts[0].detail.sorting, "grid.sorting is already set when the host hears about it");
	assert.equal(header(el).getAttribute("aria-sort"), "ascending", "aria-sort reflects the state");
	assert.equal(loaded(el).length, 0, "the rows went back to placeholders");
	assert.equal(el._cachedRowCount, 0);
	assert.equal(requests.length, 2, "one new request");
	assert.deepEqual({ start: requests[1].start, end: requests[1].end }, { start: 0, end: 99 });
	assert.ok(requests[1].epoch > old.epoch, "with a higher epoch");

	assert.equal(answer(el, old), false, "a late answer from the old epoch is ignored");
	await settle(el);
	assert.equal(loaded(el).length, 0);

	// The host's order is what renders: the grid does not sort the rows it is given.
	const sorted = rowsFrom(0, 99).reverse();
	assert.equal(el.setRows(0, sorted, requests[1].epoch), true);
	await settle(el);
	assert.equal(el.renderRoot.querySelector("#r-0 .cell").textContent, "a99", "row 0 is the host's first row");
	assert.equal(requests.length, 2, "nothing more requested");
});

test("RR5: sorting while scrolled deep goes to the top and asks only for the top rows", async () => {
	const { el, requests } = await remoteGrid();
	autoAnswer(el);
	answer(el, requests[0]);
	await settle(el);
	for (let top = 300; top <= 3000; top += 300) await scrollTo(el, top);
	el.activeIndex = 95;
	await settle(el);
	const before = requests.length;

	header(el, 1).click();
	await settle(el);
	await syncScroll(el); // the scroll event a browser sends after the grid's scrollTo
	await settle(el);
	const scroll = el.renderRoot.querySelector(".scroll");
	assert.equal(scroll.scrollTop, 0, "scrolled to the top");
	assert.equal(el.activeIndex, 0, "the active row is back at the top");
	const after = requests.slice(before);
	assert.equal(after.length, 1, `one request after the sort (got ${JSON.stringify(after)})`);
	assert.deepEqual({ start: after[0].start, end: after[0].end }, { start: 0, end: 99 }, "no request for the old position in the new epoch");
	assert.equal(placeholders(el).length, 0, "the answered top rows render");
});

test("RR5: outside remote mode a header click still sorts in memory", async () => {
	const el = await mount("dj-data-grid", { columns: COLUMNS, data: rowsFrom(0, 9).reverse(), rowHeight: ROW_H });
	await settle(el);
	assert.equal(el.renderRoot.querySelector("#r-0 .cell").textContent, "a9");
	header(el).click();
	await settle(el);
	assert.equal(el.renderRoot.querySelector("#r-0 .cell").textContent, "a0", "sorted by the grid");
});

// ---- RR6: inserts, removals, and reset ----

const rowEl = (el, i) => el.renderRoot.querySelector(`#r-${i}`);
const translateY = (row) => Number(/translateY\(([-\d.]+)px\)/.exec(row.getAttribute("style"))[1]);
const scrollEl = (el) => el.renderRoot.querySelector(".scroll");

test("RR6: inserting 3 rows at 0 while scrolled to row 500 keeps row 500's content in place", async () => {
	const { el } = await remoteGrid({ settleMs: 0 });
	autoAnswer(el);
	await settle(el);
	for (let top = 300; top <= 500 * ROW_H; top += 300) await scrollTo(el, top);
	await settle(el);
	assert.equal(el.getVisibleRange().first, 500);
	const before = rowEl(el, 500);
	assert.equal(before.querySelector(".cell").textContent, "a500");
	const pos = translateY(before) - scrollEl(el).scrollTop;

	el.insertRows(0, 3);
	await settle(el);
	await syncScroll(el);
	assert.equal(el.rowCount, 100003);
	assert.equal(el.getVisibleRange().first, 503, "the first visible row moved down by 3");
	const after = rowEl(el, 503);
	assert.equal(after.querySelector(".cell").textContent, "a500", "row 500's content is now row 503");
	assert.equal(translateY(after) - scrollEl(el).scrollTop, pos, "at the same pixel position");
	assert.equal(gridEl(el).getAttribute("aria-rowcount"), "100004");
});

test("RR6: an insert at the top while the view is at the top shows the new rows", async () => {
	const { el, requests } = await remoteGrid({ settleMs: 0 });
	answer(el, requests[0]);
	await settle(el);
	el.insertRows(0, [{ id: "new1", a: "NEW1", b: "" }, { id: "new2", a: "NEW2", b: "" }]);
	await settle(el);
	await syncScroll(el);
	assert.equal(scrollEl(el).scrollTop, 0, "no scroll compensation at the top");
	assert.equal(rowEl(el, 0).querySelector(".cell").textContent, "NEW1", "given rows are cached");
	assert.equal(rowEl(el, 2).querySelector(".cell").textContent, "a0", "old rows moved down");
	// Block 0 is the two new rows plus old rows 0-97: complete, so nothing is asked for. Block 1
	// holds only old rows 98-99 and would be asked for when it comes on screen.
	assert.equal(requests.length, 1, "a full block is not asked for again");
	await scrollTo(el, 100 * ROW_H);
	const last = requests.at(-1);
	assert.deepEqual({ start: last.start, end: last.end }, { start: 100, end: 199 }, "the block with holes is asked for");
	assert.ok(last.epoch > requests[0].epoch);
	assert.equal(rowEl(el, 101).querySelector(".cell").textContent, "a99", "its cached rows still show meanwhile");
});

test("RR6: a stale setRows after insertRows is refused", async () => {
	const { el, requests } = await remoteGrid({ settleMs: 0 });
	const old = requests[0];
	el.insertRows(10, 5);
	await settle(el);
	assert.ok(el.epoch > old.epoch, "the insert started a new epoch");
	assert.equal(answer(el, old), false, "the old answer is refused");
	await settle(el);
	assert.equal(loaded(el).length, 0);
	assert.ok(requests.some((r) => r.start === 0 && r.epoch === el.epoch), "and re-requested in the new epoch");
});

test("RR6: inserting at or above the active row moves it down; below leaves it", async () => {
	const { el } = await remoteGrid();
	el.activeIndex = 20;
	el.insertRows(30, 2);
	assert.equal(el.activeIndex, 20);
	el.insertRows(20, 2);
	assert.equal(el.activeIndex, 22);
	el.insertRows(0, [rowsFrom(0, 0)[0]]);
	assert.equal(el.activeIndex, 23);
});

test("RR6: removing the active row keeps activeIndex on the row that slid up into it", async () => {
	// No auto-answer: this fake host does not know about the removal and would undo it.
	const { el, requests } = await remoteGrid({ settleMs: 0 });
	answer(el, requests[0]);
	await settle(el);
	key(el, "ArrowDown"); key(el, "ArrowDown"); key(el, "ArrowDown");
	await settle(el);
	assert.equal(el.activeIndex, 3);
	el.removeRows(3, 1);
	await settle(el);
	assert.equal(el.activeIndex, 3, "same index");
	assert.equal(el.rowCount, 99999);
	assert.equal(rowEl(el, 3).querySelector(".cell").textContent, "a4", "now the row that was below it");
	assert.ok(rowEl(el, 3).getAttribute("part").split(" ").includes("row--active"));
	// Removing rows above the active row moves it up with its row.
	el.removeRows(0, 2);
	assert.equal(el.activeIndex, 1);
});

test("RR6: removing the last row clamps activeIndex", async () => {
	const { el } = await remoteGrid({ rowCount: 50 });
	key(el, "End");
	await settle(el);
	assert.equal(el.activeIndex, 49);
	el.removeRows(49, 1);
	await settle(el);
	assert.equal(el.rowCount, 49);
	assert.equal(el.activeIndex, 48);
	el.removeRows(40, 100); // a count past the end is clamped
	assert.equal(el.rowCount, 40);
	assert.equal(el.activeIndex, 39);
});

test("RR6: removing rows above the screen scrolls up by the rows removed above it", async () => {
	const { el } = await remoteGrid({ settleMs: 0 });
	autoAnswer(el);
	await settle(el);
	for (let top = 300; top <= 500 * ROW_H; top += 300) await scrollTo(el, top);
	await settle(el);
	el.removeRows(100, 10);
	await settle(el);
	await syncScroll(el);
	assert.equal(el.getVisibleRange().first, 490);
	assert.equal(rowEl(el, 490).querySelector(".cell").textContent, "a500");
	// A removal straddling the first visible row counts only the rows above it.
	el.removeRows(485, 10);
	await settle(el);
	await syncScroll(el);
	assert.equal(scrollEl(el).scrollTop, 485 * ROW_H);
	assert.equal(el.getVisibleRange().first, 485);
	assert.equal(rowEl(el, 485).querySelector(".cell").textContent, "a505");
});

test("RR6: resetRows({ keepScroll: true }) keeps scrollTop and asks again only for the rendered blocks", async () => {
	const { el, requests } = await remoteGrid({ settleMs: 0 });
	autoAnswer(el);
	await settle(el);
	for (let top = 300; top <= 3000 * ROW_H; top += 3000) await scrollTo(el, top);
	await scrollTo(el, 3050 * ROW_H);
	await settle(el);
	const top = scrollEl(el).scrollTop;
	const before = requests.length;
	el.resetRows({ keepScroll: true });
	await settle(el);
	assert.equal(scrollEl(el).scrollTop, top, "scrollTop kept");
	const after = requests.slice(before);
	assert.deepEqual(after.map((r) => [r.start, r.end]), [[3000, 3099]], "only the rendered block");
	assert.equal(after[0].epoch, el.epoch);
	el.resetRows({ keepScroll: false });
	await settle(el);
	await syncScroll(el);
	assert.equal(scrollEl(el).scrollTop, 0, "keepScroll: false goes to the top");
});

test("RR6: getVisibleRange has no overscan, and scrollToIndex works in both modes", async () => {
	const local = await mount("dj-data-grid", { columns: COLUMNS, data: rowsFrom(0, 999), rowHeight: ROW_H });
	await settle(local);
	assert.deepEqual(local.getVisibleRange(), { first: 0, last: 13 }, "400 px of 30 px rows: rows 0-13, the last in part");
	local.scrollToIndex(200, { align: "start" });
	await syncScroll(local);
	assert.deepEqual(local.getVisibleRange(), { first: 200, last: 213 });
	assert.ok(local.renderRoot.querySelector("#r-200"));

	const { el } = await remoteGrid();
	el.scrollToIndex(50000, { align: "center" });
	await syncScroll(el);
	const { first, last } = el.getVisibleRange();
	assert.ok(first <= 50000 && last >= 50000, `${first}..${last} contains 50,000`);
	assert.ok(last - first === 13 || last - first === 14, "one viewport of rows, two of them maybe in part");

	const empty = await mount("dj-data-grid", { columns: COLUMNS, data: [] });
	assert.deepEqual(empty.getVisibleRange(), { first: -1, last: -1 });
});

test("RR6: insertRows and removeRows move the select plugin's Shift anchor", async () => {
	const { selectColumnPlugin } = await import("../packages/data-grid-select/dist/index.js");
	const { el, requests } = await remoteGrid({ selectionMode: "multiple", plugins: [selectColumnPlugin()], settleMs: 0 });
	answer(el, requests[0]);
	await settle(el);
	const box = (i) => rowEl(el, i).querySelector(".dj-select-row");
	const click = (i, shiftKey = false) => box(i).dispatchEvent(new globalThis.window.MouseEvent("click", { bubbles: true, composed: true, shiftKey }));
	click(5);
	await settle(el);
	assert.deepEqual(el.rowSelection, { m5: true });

	el.insertRows(0, [{ id: "n1", a: "", b: "" }, { id: "n2", a: "", b: "" }]); // m5 is now row 7, and so is the anchor
	await settle(el);
	click(9, true);
	await settle(el);
	assert.deepEqual(Object.keys(el.rowSelection).sort(), ["m5", "m6", "m7"], "the range runs from the anchor's row");

	el.removeRows(7, 1); // the anchor row itself goes
	await settle(el);
	const sel = { ...el.rowSelection };
	click(4, true);
	await settle(el);
	assert.deepEqual(el.rowSelection, { ...sel, m2: true }, "no anchor, so Shift-click toggles one row, not a range");
});

// ---- RR7: select all, ranges over unloaded rows, the event fields ----

async function selectGrid(props = {}) {
	const { selectColumnPlugin } = await import("../packages/data-grid-select/dist/index.js");
	const g = await remoteGrid({ selectionMode: "multiple", plugins: [selectColumnPlugin()], settleMs: 0, ...props });
	const changes = [];
	g.el.addEventListener("dj-selection-change", (e) => changes.push(e.detail));
	return { ...g, changes };
}
const headBox = (el) => el.renderRoot.querySelector(".dj-select-all");
const rowBox = (el, i) => rowEl(el, i).querySelector(".dj-select-row");
const clickEl = (box, shiftKey = false) => box.dispatchEvent(new globalThis.window.MouseEvent("click", { bubbles: true, composed: true, shiftKey }));

test("RR7: select all on 100,000 rows is every row, loaded or not", async () => {
	const { el, requests, changes } = await selectGrid();
	answer(el, requests[0]);
	await settle(el);
	clickEl(headBox(el));
	await settle(el);
	assert.equal(el.allSelected, true);
	const last = changes.at(-1);
	assert.deepEqual({ all: last.all, except: last.except, count: last.count, ids: last.ids }, { all: true, except: [], count: 100000, ids: [] });
	assert.equal(last.rows.length, 100, "rows is the loaded rows only");
	assert.deepEqual(el.selection, { ids: [], all: true, except: [], count: 100000 });
	assert.equal(headBox(el).checked, true);
	assert.equal(headBox(el).indeterminate, false);
	assert.ok(rowEl(el, 3).getAttribute("part").split(" ").includes("row--selected"));
	assert.equal(rowBox(el, 3).checked, true);

	// Rows that arrive later are selected too.
	await scrollTo(el, 5000 * ROW_H);
	el.setRows(5000, rowsFrom(5000, 5099), el.epoch);
	await settle(el);
	assert.equal(rowBox(el, 5005).checked, true, "a row loaded after select all is selected");
	assert.equal(rowEl(el, 5005).getAttribute("aria-selected"), "true");
});

test("RR7: unticking two loaded rows under select all lists them in except, and the header is indeterminate", async () => {
	const { el, requests, changes } = await selectGrid();
	answer(el, requests[0]);
	await settle(el);
	el.selectAll();
	await settle(el);
	clickEl(rowBox(el, 2));
	await settle(el);
	clickEl(rowBox(el, 7));
	await settle(el);
	const last = changes.at(-1);
	assert.deepEqual({ all: last.all, except: [...last.except].sort(), count: last.count }, { all: true, except: ["m2", "m7"], count: 99998 });
	assert.deepEqual(el.rowSelection, { m2: true, m7: true }, "rowSelection holds the deselected rows");
	assert.equal(rowBox(el, 2).checked, false);
	assert.ok(!rowEl(el, 2).getAttribute("part").split(" ").includes("row--selected"));
	assert.equal(headBox(el).checked, false);
	assert.equal(headBox(el).indeterminate, true);

	// Ticking one back, then the header (which clears everything from the indeterminate state).
	clickEl(rowBox(el, 2));
	await settle(el);
	assert.deepEqual(changes.at(-1).except, ["m7"]);
	assert.equal(changes.at(-1).count, 99999);
	clickEl(headBox(el));
	await settle(el);
	assert.equal(el.allSelected, true, "an indeterminate header selects all again");
	clickEl(headBox(el));
	await settle(el);
	assert.equal(el.allSelected, false);
	assert.deepEqual(el.selection, { ids: [], all: false, except: [], count: 0 });
});

test("RR7: without select all, ids and count describe the selected rows, loaded or not", async () => {
	const { el, requests, changes } = await selectGrid();
	answer(el, requests[0]);
	await settle(el);
	clickEl(rowBox(el, 1));
	await settle(el);
	assert.deepEqual(changes.at(-1), { rows: [rowsFrom(1, 1)[0]], ids: ["m1"], all: false, except: [], count: 1 });
	el.resetRows();
	await settle(el);
	assert.deepEqual(el.selection, { ids: ["m1"], all: false, except: [], count: 1 }, "an unloaded selected row still counts");
});

test("RR7: a Shift range from row 10 to row 5,010 asks for the missing rows and selects 5,001 ids after the last arrives", async () => {
	const { el, requests, changes } = await selectGrid({ cacheSize: 300 });
	answer(el, requests[0]);
	await settle(el);
	clickEl(rowBox(el, 10)); // the anchor
	await settle(el);
	await scrollTo(el, 5000 * ROW_H);
	for (const r of requests.filter((q) => q.start >= 4900)) answer(el, r);
	await settle(el);
	const before = requests.length;
	const changesBefore = changes.length;

	clickEl(rowBox(el, 5010), true);
	await settle(el);
	const asked = requests.slice(before);
	assert.ok(asked.length > 0, "the missing rows are requested");
	assert.ok(asked.every((r) => r.reason === "selection"), "with reason selection");
	assert.equal(asked[0].start, 100);
	assert.equal(asked.at(-1).end, 4899);
	assert.equal(changes.length, changesBefore, "nothing selected yet");

	// Answer in pieces; with cacheSize 300 most of them are evicted again before the last lands.
	for (let start = 100; start < 4900; start += 400) {
		assert.equal(changes.length, changesBefore, `still nothing at ${start}`);
		el.setRows(start, rowsFrom(start, Math.min(4899, start + 399)), el.epoch);
		await settle(el);
	}
	assert.ok(el._cachedRowCount <= 300 + 200, "the cache was trimmed meanwhile");
	assert.equal(changes.length, changesBefore + 1, "one selection change once every row arrived");
	const sel = changes.at(-1);
	assert.equal(sel.count, 5001);
	assert.equal(sel.ids.length, 5001);
	const want = new Set(rowsFrom(10, 5010).map((r) => r.id));
	assert.ok(sel.ids.every((id) => want.has(id)), "exactly rows 10-5,010");
});

test("RR7: a resetRows while a Shift range waits drops it", async () => {
	const { el, requests, changes } = await selectGrid();
	answer(el, requests[0]);
	await settle(el);
	clickEl(rowBox(el, 10));
	await settle(el);
	await scrollTo(el, 1000 * ROW_H);
	for (const r of requests.filter((q) => q.start >= 900)) answer(el, r);
	await settle(el);
	clickEl(rowBox(el, 1005), true);
	await settle(el);
	const pending = requests.filter((r) => r.reason === "selection");
	assert.ok(pending.length > 0);
	const selected = { ...el.rowSelection };
	const count = changes.length;

	el.resetRows();
	await settle(el);
	for (const r of pending) assert.equal(answer(el, r), false, "the old answers are refused");
	for (const r of requests.filter((q) => q.epoch === el.epoch)) answer(el, r);
	await settle(el);
	assert.equal(changes.length, count, "no selection change");
	assert.deepEqual(el.rowSelection, selected);
});

test("RR7: removing a loaded deselected row under select all keeps the count right", async () => {
	const { el, requests, changes } = await selectGrid();
	answer(el, requests[0]);
	await settle(el);
	el.selectAll();
	clickEl(rowBox(el, 4));
	await settle(el);
	assert.equal(el.selection.count, 99999);
	el.removeRows(4, 1);
	await settle(el);
	assert.equal(el.allSelected, true, "select all survives a removal");
	assert.deepEqual(el.selection, { ids: [], all: true, except: [], count: 99999 }, "the removed row left except, and rowCount dropped");
	assert.equal(changes.at(-1).count, 99999);
});

test("RR7: outside remote mode all is false and ids/count match rows", async () => {
	const { selectColumnPlugin } = await import("../packages/data-grid-select/dist/index.js");
	const el = await mount("dj-data-grid", { columns: COLUMNS, data: rowsFrom(0, 9), getRowId, selectionMode: "multiple", plugins: [selectColumnPlugin()] });
	await settle(el);
	const changes = [];
	el.addEventListener("dj-selection-change", (e) => changes.push(e.detail));
	el.selectAll();
	await settle(el);
	assert.equal(el.allSelected, false);
	const d = changes.at(-1);
	assert.equal(d.all, false);
	assert.equal(d.count, 10);
	assert.deepEqual(d.ids, d.rows.map((r) => r.id));
	assert.deepEqual(d.except, []);
	el.clearSelection();
	await settle(el);
	assert.equal(changes.at(-1).count, 0);
});

// ---- RR8: drag carries the selection ----

function stubTransfer() {
	const store = {};
	return {
		store, effectAllowed: "", dropEffect: "none", image: null,
		setData(t, v) { store[t] = v; },
		getData(t) { return store[t] ?? ""; },
		setDragImage(el) { this.image = el.textContent; },
	};
}
function dragEvt(target, type, dt) {
	const e = new Event(type, { bubbles: true, composed: true, cancelable: true });
	Object.defineProperty(e, "dataTransfer", { value: dt });
	target.dispatchEvent(e);
	return e;
}
async function dragGrid() {
	const { selectColumnPlugin } = await import("../packages/data-grid-select/dist/index.js");
	const { rowDragPlugin } = await import("../packages/data-grid-drag/dist/index.js");
	const drag = rowDragPlugin({ type: "x/rows", data: (rows, sel) => JSON.stringify({ n: rows.length, sel }) });
	const g = await remoteGrid({ selectionMode: "multiple", plugins: [selectColumnPlugin(), drag], settleMs: 0 });
	answer(g.el, g.requests[0]);
	await settle(g.el);
	const events = [];
	g.el.addEventListener("dj-row-dragstart", (e) => events.push(["start", e.detail]));
	g.el.addEventListener("dj-row-dragend", (e) => events.push(["end", e.detail]));
	return { ...g, events };
}

test("RR8: with all selected, dragging a loaded row reports selection.all and the chip reads 100,000 rows", async () => {
	const { el, events } = await dragGrid();
	el.selectAll();
	await settle(el);
	const dt = stubTransfer();
	const e = dragEvt(rowEl(el, 5).querySelector(".cell:last-child"), "dragstart", dt);
	await settle(el);
	assert.equal(e.defaultPrevented, false);
	const [, start] = events[0];
	assert.deepEqual(start.selection, { ids: [], all: true, except: [], count: 100000 });
	assert.equal(start.rows.length, 100, "rows is the loaded rows");
	assert.equal(dt.image, "100,000 rows");
	assert.equal(dt.store["text/plain"], "100,000 rows");
	assert.deepEqual(JSON.parse(dt.store["x/rows"]).sel.all, true, "data() gets the selection");
	const dragging = () => rowEls(el).filter((r) => r.getAttribute("part").split(" ").includes("row--dragging")).length;
	assert.ok(dragging() > 0, "selected rows show as dragging");

	dt.dropEffect = "move";
	dragEvt(rowEl(el, 5), "dragend", dt);
	await settle(el);
	const [kind, end] = events[1];
	assert.equal(kind, "end");
	assert.deepEqual(end.selection, start.selection);
	assert.equal(end.dropEffect, "move");
	assert.equal(dragging(), 0);
});

test("RR8: a remote drag resolves the row by absolute index and counts ids or one row", async () => {
	const { el, events } = await dragGrid();
	await scrollTo(el, 5000 * ROW_H);
	el.setRows(5000, rowsFrom(5000, 5099), el.epoch);
	await settle(el);
	// An unselected row deep in the list: dragged alone, found through ctx.rowAt.
	let dt = stubTransfer();
	dragEvt(rowEl(el, 5003), "dragstart", dt);
	assert.deepEqual(events[0][1].rows.map((r) => r.id), ["m5003"]);
	assert.deepEqual(events[0][1].selection, { ids: ["m5003"], all: false, except: [], count: 1 });
	assert.equal(dt.image, "1 row");
	dragEvt(rowEl(el, 5003), "dragend", dt);

	// Two selected rows, one of them no longer loaded.
	el.toggleAt(5001);
	el.toggleAt(5002);
	el.resetRows();
	el.setRows(5000, rowsFrom(5000, 5001), el.epoch);
	await settle(el);
	dt = stubTransfer();
	dragEvt(rowEl(el, 5001), "dragstart", dt);
	const sel = events.at(-1)[1];
	assert.deepEqual(sel.rows.map((r) => r.id), ["m5001"], "rows is the loaded selected rows");
	assert.deepEqual([...sel.selection.ids].sort(), ["m5001", "m5002"]);
	assert.equal(sel.selection.count, 2);
	assert.equal(dt.image, "2 rows");
});
