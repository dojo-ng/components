// E2: print rendering. Only the virtualizer's rendered window (visible rows + 8 overscan) normally
// exists in the DOM — printing that as-is yields one screenful of rows followed by blank space, THE
// TRAP recorded in enterprise-export-spec.md E2. `beforeprint` populates a real <table>/<thead> with
// every row and hides the (still-mounted) screen grid via display:none; `afterprint` reverses both. A
// real HTML <thead> repeats across printed pages natively in every major engine — no CSS trick
// needed — but genuine cross-page repeat itself is not unit-testable from here (happy-dom has no
// pagination); that part is Bill's manual check.
//
// THE PRINT <table> ELEMENT IS ALWAYS IN THE DOM, empty and display:none when not printing, populated
// and visible while printing — NOT conditionally added/removed via a ternary. That's deliberate, not
// incidental: a ternary that swaps a whole nested template in and out at a top-level sibling position
// hits a real lit-html + happy-dom bug in this workspace (confirmed 2026-08-18 by bisecting a minimal
// reproduction down to exactly that shape — an always-present element with conditional CONTENT does
// not trigger it, only a conditionally-present ELEMENT does). A real browser was unaffected either
// way, but writing it the reliable way costs nothing (an empty <table> on screen) and makes the
// behavior something these tests can actually observe.
//
// TWO BUGS BILL FOUND IN THE FIRST VERSION (2026-08-18), both from a version that returned a wholly
// separate template while printing instead of the current always-present/toggled-visibility approach:
//   1. The grid came back permanently empty after printing ended, because unmounting `.scroll`
//      (rather than hiding it) orphaned the TanStack virtualizer's observers. Not reproducible in
//      happy-dom (this harness stubs `.scroll`'s offsetHeight directly rather than driving the
//      virtualizer through real observer callbacks), so what's tested below is the structural half of
//      the fix — `.scroll` stays mounted throughout — which is necessary though not sufficient proof.
//   2. The header didn't repeat past page 1 because the print table was nested inside `.wrap`
//      (display:flex), and a flex-item table doesn't get native thead-repeat. Tested below by
//      asserting the table is not a descendant of `.wrap`.
//
// HARNESS: happy-dom does no layout, so the virtualizer renders zero rows unless `.scroll` reports a
// real offsetHeight (the same stub tests/data-grid-viewport.test.js uses). Each test file gets its
// own process under `node --test`, so this stub is local to this file.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { html } from "lit";
import { detailPlugin } from "../packages/data-grid-detail/dist/index.js";
import "../packages/data-grid/dist/index.js";

const proto = globalThis.window.HTMLElement.prototype;
for (const [prop, val] of [["offsetHeight", 400], ["offsetWidth", 320]]) {
	Object.defineProperty(proto, prop, {
		configurable: true,
		get() { return this.classList?.contains("scroll") ? val : 0; },
	});
}

const COLUMNS = [{ id: "a", header: "A", accessorKey: "a" }, { id: "b", header: "B", accessorKey: "b" }];
const data = (n) => Array.from({ length: n }, (_, i) => ({ a: "a" + i, b: "b" + i }));
const ROW_H = 30;

// Only the div-based screen rows — `<tr>` tags never match this, so it stays accurate regardless of
// whether the (always-present) print table also has rows in it.
function screenRowCount(el) {
	return el.renderRoot.querySelectorAll(".vrow").length;
}

function printTable(el) {
	return el.renderRoot.querySelector("table.print-table");
}

test("the print table exists but empty/hidden before printing; beforeprint populates and shows it", async () => {
	const el = await mount("dj-data-grid", { columns: COLUMNS, data: data(200), rowHeight: ROW_H });
	await settled(el);
	const windowed = screenRowCount(el);
	assert.ok(windowed > 0 && windowed < 200, `sanity: normally windowed (got ${windowed} of 200)`);

	const table = printTable(el);
	assert.ok(table, "the <table> element is always present");
	assert.equal(table.style.display, "none", "hidden before printing");
	assert.equal(table.querySelectorAll("tbody tr").length, 0, "empty before printing — no cost on screen");

	window.dispatchEvent(new Event("beforeprint"));
	await settled(el);
	assert.equal(table.style.display, "", "shown while printing");
	assert.ok(table.querySelector("thead th"), "a genuine <thead> — browsers repeat this natively, no CSS trick needed");
	assert.equal(table.querySelectorAll("tbody tr").length, 200, "every row is in the print table");
	// Bug 1 (Bill, 2026-08-18): a prior version REMOVED `.scroll` from the DOM while printing, which
	// orphaned the virtualizer's observers and left the grid empty forever after. `.wrap` (the
	// scroll container's ancestor) must stay mounted, just hidden.
	const wrap = el.renderRoot.querySelector(".wrap");
	assert.ok(wrap, ".wrap is still in the DOM while printing (hidden, not removed)");
	assert.equal(wrap.style.display, "none", ".wrap is hidden via display:none, not removed");
	assert.ok(el.renderRoot.querySelector(".scroll"), ".scroll is still mounted while printing — never removed");
	// Bug 2 (Bill, 2026-08-18): the print table nested inside `.wrap` (display:flex) doesn't get a
	// browser's native repeating-<thead> print behavior. It must be a sibling, not a descendant.
	assert.ok(!wrap.contains(table), "the print table is NOT nested inside .wrap (which is display:flex)");

	window.dispatchEvent(new Event("afterprint"));
	await settled(el);
	assert.equal(table.style.display, "none", "hidden again once printing ends");
	assert.equal(table.querySelectorAll("tbody tr").length, 0, "emptied again once printing ends");
	assert.equal(wrap.style.display, "", ".wrap is shown again after printing ends");
	assert.equal(screenRowCount(el), windowed, "the windowed screen view is back, same as before printing");
});

test("the print table's header cells and body rows match the columns and row model", async () => {
	const el = await mount("dj-data-grid", { columns: COLUMNS, data: data(50), rowHeight: ROW_H });
	await settled(el);
	window.dispatchEvent(new Event("beforeprint"));
	await settled(el);

	const headCells = [...el.renderRoot.querySelectorAll("thead th")].map((th) => th.textContent.trim());
	assert.deepEqual(headCells, ["A", "B"], "header cells match the column definitions");

	const rows = [...el.renderRoot.querySelectorAll("tbody tr")];
	const indices = rows.map((r) => Number(r.id.replace(/^r-/, ""))).sort((a, b) => a - b);
	assert.deepEqual(indices, data(50).map((_, i) => i), "every row-model index 0..49 is present exactly once");
	const firstRowCells = [...rows[0].querySelectorAll("td")].map((td) => td.textContent.trim());
	assert.deepEqual(firstRowCells, ["a0", "b0"], "the first row's cells hold the first row's data");

	window.dispatchEvent(new Event("afterprint"));
	await settled(el);
});

test("a renderDetail plugin's rows stay windowed while printing (documented limitation)", async () => {
	const el = await mount("dj-data-grid", {
		columns: COLUMNS,
		data: data(200),
		rowHeight: ROW_H,
		plugins: [detailPlugin({ render: (row) => html`<em>D-${row.original.a}</em>` })],
	});
	await settled(el);
	const windowed = screenRowCount(el);

	window.dispatchEvent(new Event("beforeprint"));
	await settled(el);
	assert.equal(screenRowCount(el), windowed, "detail-plugin rows are not materialized for print");
	assert.equal(printTable(el).style.display, "none", "the print table stays hidden when a detail plugin is present");
	assert.equal(printTable(el).querySelectorAll("tbody tr").length, 0, "the print table stays empty when a detail plugin is present");
	assert.equal(el.renderRoot.querySelector(".wrap").style.display, "", ".wrap stays visible (no print table to show instead)");

	window.dispatchEvent(new Event("afterprint"));
	await settled(el);
});

test("toggling printing does not by itself emit a spurious dj-range-change", async () => {
	const el = await mount("dj-data-grid", { columns: COLUMNS, data: data(200), rowHeight: ROW_H });
	await settled(el);
	const seen = [];
	el.addEventListener("dj-range-change", (e) => seen.push(e.detail));

	window.dispatchEvent(new Event("beforeprint"));
	await settled(el);
	window.dispatchEvent(new Event("afterprint"));
	await settled(el);

	assert.equal(seen.length, 0, "the reported window is unaffected by print rendering");
});
