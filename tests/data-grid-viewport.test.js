// dj-range-change (viewport reporting spec VP1/VP2). The grid reports which rows it has rendered so
// a consumer can window its data or load more at the end of the list.
//
// HARNESS: happy-dom does no layout, so by default the TanStack virtualizer renders ZERO rows (see
// data-grid.test.js). Giving the SCROLL element a real offsetHeight — the same stub
// data-grid-detail.test.js and data-grid-plugins.test.js use — makes the virtualizer measure a
// viewport and produce a genuine moving window, so the range contract can be tested here rather
// than deferred to a browser. Row heights still fall back to the `rowHeight` estimate (headless
// rects are zero-size), which is what keeps the window deterministic. Real measured-height layout
// is confirmed in tests/browser/data-grid-viewport.test.js.
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
const VIEWPORT = 400; // the stubbed scroll-element height

/** The row-model indices actually in the DOM, from each row's `r-<index>` id. */
function domIndices(el) {
	return [...el.renderRoot.querySelectorAll('[part="row"]')]
		.map((r) => Number(r.id.replace(/^r-/, "")))
		.sort((a, b) => a - b);
}

/** Mount a grid, then attach a listener on the HOST (outside the shadow root, which also proves the
 *  event bubbles and is composed). Settles twice so the virtualizer has measured its viewport. */
async function gridWithRanges(props = {}) {
	const el = await mount("dj-data-grid", { columns: COLUMNS, data: data(500), rowHeight: ROW_H, ...props });
	await settled(el);
	const seen = [];
	el.addEventListener("dj-range-change", (e) => seen.push(e.detail));
	await settled(el);
	return { el, seen };
}

/** Scroll the grid's viewport and let the virtualizer react. */
async function scrollTo(el, top) {
	const scroll = el.renderRoot.querySelector(".scroll");
	scroll.scrollTop = top;
	scroll.dispatchEvent(new Event("scroll"));
	await settled(el);
	await settled(el);
}

/** Get an event describing the TOP window. The mount-time emit lands before a test's listener can
 *  attach, and the dedupe (correctly) stays silent for a scroll that doesn't move anything — so
 *  scroll away and back to produce a fresh event for the top of the list. */
async function reemitTopWindow(el) {
	await scrollTo(el, 1200);
	await scrollTo(el, 0);
}

test("dj-range-change reaches a plain listener on the host (bubbles + composed)", async () => {
	const { el, seen } = await gridWithRanges();
	await scrollTo(el, 3000);
	assert.ok(seen.length > 0, "the event was observed from outside the shadow root");
	assert.equal(typeof seen.at(-1).start, "number");
	assert.ok(Array.isArray(seen.at(-1).rendered), "detail carries the rendered index list");
});

test("the reported window is bounded and matches the rows in the DOM", async () => {
	const { el, seen } = await gridWithRanges();
	await reemitTopWindow(el);
	const r = seen.at(-1);
	assert.equal(r.count, 500, "count is the full row count");
	assert.equal(r.start, 0, "the top window starts at row 0");
	assert.ok(r.end > 0 && r.end < 500, `end is a bounded window, not the last row (got ${r.end})`);
	assert.equal(r.rendered.length, r.end - r.start + 1, "rendered spans start..end inclusive");
	assert.deepEqual(r.rendered, domIndices(el), "rendered describes exactly the rows in the DOM");
});

test("scrolling advances start/end and rendered stays contiguous and DOM-accurate", async () => {
	const { el, seen } = await gridWithRanges();
	await reemitTopWindow(el);
	const first = seen.at(-1);
	const before = seen.length;

	await scrollTo(el, 6000); // ~row 200

	assert.ok(seen.length > before, "scrolling produced at least one more event");
	const after = seen.at(-1);
	assert.ok(after.start > first.start, `start advanced (${first.start} -> ${after.start})`);
	assert.ok(after.end > first.end, `end advanced (${first.end} -> ${after.end})`);
	assert.equal(after.count, 500, "count is unchanged by scrolling");
	for (let i = 1; i < after.rendered.length; i++) {
		assert.equal(after.rendered[i], after.rendered[i - 1] + 1, "rendered indices are contiguous");
	}
	assert.deepEqual(after.rendered, domIndices(el), "rendered still matches the DOM rows");
});

test("the window includes overscan, so it is wider than the viewport (rendered != visible)", async () => {
	// This is why the detail says `rendered`: overscan: 8 means a consumer treating the range as the
	// visible set would be wrong by up to 8 rows at each end.
	const { el, seen } = await gridWithRanges();
	await scrollTo(el, 6000);
	const fits = Math.ceil(VIEWPORT / ROW_H);
	assert.ok(
		seen.at(-1).rendered.length > fits,
		`the window (${seen.at(-1).rendered.length}) exceeds what fits the viewport (~${fits}), so it includes overscan`,
	);
});

test("the end-reached recipe fires at the bottom of the list", async () => {
	// The exact one-liner the README hands consumers: end >= count - 1.
	const { el, seen } = await gridWithRanges({ data: data(200) });
	let endReached = 0;
	el.addEventListener("dj-range-change", (e) => { if (e.detail.end >= e.detail.count - 1) endReached++; });
	await reemitTopWindow(el);
	assert.ok(seen.at(-1).end < 199, "not at the end while at the top");
	await scrollTo(el, 200 * ROW_H); // past the bottom; the virtualizer clamps
	assert.ok(endReached > 0, "scrolling to the bottom satisfied end >= count - 1");
	assert.equal(seen.at(-1).end, 199, "the last window ends on the final row");
});

test("an empty grid reports start/end of -1 with a count of 0", async () => {
	const { el, seen } = await gridWithRanges();
	await scrollTo(el, 0);
	el.data = [];
	await settled(el);
	assert.equal(seen.at(-1).start, -1);
	assert.equal(seen.at(-1).end, -1);
	assert.deepEqual(seen.at(-1).rendered, []);
	assert.equal(seen.at(-1).count, 0, "a consumer learns the list went empty");
});

test("the dedupe holds: re-renders that don't move the window emit nothing", async () => {
	const { el, seen } = await gridWithRanges({ selectionMode: "multiple" });
	await scrollTo(el, 3000);
	const before = seen.length;
	// Five re-renders that leave (start, end, count) alone.
	el.data = data(500); // equal-length swap
	await settled(el);
	el.rowSelection = { 0: true };
	await settled(el);
	el.activeIndex = 3;
	await settled(el);
	el.requestUpdate();
	await settled(el);
	el.requestUpdate();
	await settled(el);
	assert.equal(seen.length, before, "an unchanged (start, end, count) is silent");
});

test("changing data updates count, and a shorter array clamps end", async () => {
	const { el, seen } = await gridWithRanges();
	await scrollTo(el, 12000); // deep into the 500 rows
	const deep = seen.at(-1);
	assert.ok(deep.start > 100, `scrolled deep (start ${deep.start})`);

	el.data = data(20); // far shorter than the current window position
	await settled(el);
	await settled(el);
	const now = seen.at(-1);
	assert.equal(now.count, 20, "count follows the new data length");
	assert.ok(now.end <= 19, `end is clamped to the new last row (got ${now.end})`);
	assert.deepEqual(now.rendered, domIndices(el), "rendered matches the DOM after the shrink");
});

test("the event fires after the render is committed, not during it", async () => {
	// THE PLACEMENT REGRESSION THIS LOCKS. Emitting from render() dispatches mid-cycle, before Lit
	// commits the template, so a consumer inspecting the grid sees the PREVIOUS render while being
	// told about the new range. Verified 2026-07-28 by temporarily moving the emit into render():
	// the event announced count 22 while the DOM still showed the 30-row render (aria-rowcount 31
	// instead of 23), and this test failed. Note the recursion test below does NOT catch the
	// misplacement on its own — the dedupe stops the loop either way — so this is the guard.
	const el = await mount("dj-data-grid", { columns: COLUMNS, data: data(30), rowHeight: ROW_H });
	await settled(el);
	let domRowcount = null;
	let reportedCount = null;
	el.addEventListener("dj-range-change", (e) => {
		reportedCount = e.detail.count;
		domRowcount = el.renderRoot.querySelector('[role="grid"]').getAttribute("aria-rowcount");
	});
	el.data = data(22);
	await settled(el);
	assert.equal(reportedCount, 22);
	// aria-rowcount is rows + the header row, so 22 rows reads as 23.
	assert.equal(domRowcount, "23", "the committed DOM already matches the range being reported");
});

test("a listener that sets data does not recurse", async () => {
	// The companion to the placement test: a consumer reacting to the event by refetching its window
	// must not cascade. Emitting from updated() makes that reaction just another normal update.
	const { el, seen } = await gridWithRanges();
	await scrollTo(el, 3000);
	const before = seen.length;
	let reactions = 0;
	el.addEventListener("dj-range-change", () => {
		reactions++;
		assert.ok(reactions < 25, `runaway feedback loop: ${reactions} reactions`);
		el.data = data(el.data.length); // same length: the realistic "refetch this window" reaction
	});
	el.data = data(300);
	await settled(el);
	await settled(el);
	assert.ok(seen.length > before, "the data change did emit");
	assert.ok(reactions < 5, `the reaction settled quickly (${reactions} reactions)`);
	assert.equal(el.data.length, 300, "the reaction's data assignment took effect");
});

test("a renderDetail plugin's rows still report a contiguous, DOM-accurate window", async () => {
	const el = await mount("dj-data-grid", {
		columns: COLUMNS,
		data: data(200),
		rowHeight: ROW_H,
		plugins: [detailPlugin({ render: (row) => html`<em class="det">D-${row.original.a}</em>` })],
	});
	await settled(el);
	const seen = [];
	el.addEventListener("dj-range-change", (e) => seen.push(e.detail));
	// Expand a row so the rendered set contains a variable-height wrapper.
	const expander = el.renderRoot.querySelector(".vrow button[aria-expanded]");
	assert.ok(expander, "the detail plugin injected its expander column");
	expander.click();
	await settled(el);
	await scrollTo(el, 1500);

	const r = seen.at(-1);
	assert.equal(r.count, 200, "count unaffected by the detail plugin");
	for (let i = 1; i < r.rendered.length; i++) {
		assert.equal(r.rendered[i], r.rendered[i - 1] + 1, "rendered stays contiguous with measured rows");
	}
	assert.deepEqual(r.rendered, domIndices(el), "rendered matches the rows in the DOM");
});
