// dj-chart tests. Pure geometry math (the regression gate for both the vertical and the
// new horizontal bar paths) plus element-level checks that survive the happy-dom SVG
// limitation: property reflection, warn-once side effects, and the accessible-name helper.
// Rendered SVG geometry is confirmed in a browser (spec G5), not here — happy-dom does no
// layout and desyncs Lit parts in this SVG-heavy template.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
	buildScales,
	buildScalesH,
	groupedBars,
	stackedBars,
	horizontalBars,
	horizontalStackedBars,
	centerLabelSize,
	centerSubLabelSize,
	accessibleName,
} from "../packages/chart/dist/core.js";

const DATA = [
	{ cat: "A", u: 10, v: 4 },
	{ cat: "B", u: 20, v: 8 },
	{ cat: "C", u: 30, v: 12 },
];
const SERIES = [{ key: "u" }, { key: "v" }];
const INNER_W = 300;
const INNER_H = 150;

// ---- vertical path (regression gate) ----

test("vertical: grouped bars produce one rect per (category, series) with equal widths", () => {
	const scales = buildScales(DATA, SERIES, "cat", "bar", false, INNER_W, INNER_H);
	const bars = groupedBars(DATA, "cat", SERIES, scales);
	assert.equal(bars.length, 6);
	const w0 = bars[0].width;
	for (const b of bars) assert.ok(Math.abs(b.width - w0) < 1e-9, "grouped bar widths equal");
	// Taller value → taller bar (height grows with value on the vertical path).
	const aU = bars.find((b) => b.category === "A" && b.seriesIndex === 0);
	const cU = bars.find((b) => b.category === "C" && b.seriesIndex === 0);
	assert.ok(cU.height > aU.height, "larger value → taller vertical bar");
});

test("vertical: band scale spans the inner width", () => {
	const scales = buildScales(DATA, SERIES, "cat", "bar", false, INNER_W, INNER_H);
	assert.deepEqual(scales.x.range(), [0, INNER_W]);
	assert.equal(scales.cats.length, 3);
});

test("vertical: stacked bar heights sum per category", () => {
	const scales = buildScales(DATA, SERIES, "cat", "bar", true, INNER_W, INNER_H);
	const bars = stackedBars(DATA, "cat", SERIES, scales);
	// Two series stacked over three categories → 6 segments.
	assert.equal(bars.length, 6);
	const aSegs = bars.filter((b) => b.category === "A");
	const stackedH = aSegs.reduce((sum, b) => sum + b.height, 0);
	// The stacked total (u+v = 14 for A) maps to the same pixel height as a single bar of 14.
	const total = scales.y(0) - scales.y(14);
	assert.ok(Math.abs(stackedH - total) < 1e-6, "stacked heights sum to the total value height");
});

// ---- horizontal path ----

test("horizontal: band scale spans the inner HEIGHT, value scale the inner WIDTH", () => {
	const sh = buildScalesH(DATA, SERIES, "cat", false, INNER_W, INNER_H);
	assert.deepEqual(sh.yBand.range(), [0, INNER_H]);
	assert.deepEqual(sh.x.range(), [0, INNER_W]);
	assert.equal(sh.cats.length, 3);
});

test("horizontal: grouped 3-cat x 2-series yields 6 rects with equal heights, widths ~ value", () => {
	const sh = buildScalesH(DATA, SERIES, "cat", false, INNER_W, INNER_H);
	const bars = horizontalBars(DATA, "cat", SERIES, sh);
	assert.equal(bars.length, 6);
	const h0 = bars[0].height;
	for (const b of bars) assert.ok(Math.abs(b.height - h0) < 1e-9, "grouped horizontal bar heights equal");
	// Bars grow rightward from x=0; larger value → wider bar.
	const aU = bars.find((b) => b.category === "A" && b.seriesIndex === 0);
	const cU = bars.find((b) => b.category === "C" && b.seriesIndex === 0);
	assert.ok(cU.width > aU.width, "larger value → wider horizontal bar");
	// Value proportionality: u for C (30) is 3x u for A (10).
	assert.ok(Math.abs(cU.width / aU.width - 3) < 1e-6, "widths proportional to values");
	// All bars start at the zero baseline (x0 == x(0)).
	const x0 = sh.x(0);
	for (const b of bars) assert.ok(Math.abs(b.x - x0) < 1e-9, "horizontal bars start at zero baseline");
});

test("horizontal: bands stay inside inner height and heights are positive", () => {
	const sh = buildScalesH(DATA, SERIES, "cat", false, INNER_W, INNER_H);
	const bars = horizontalBars(DATA, "cat", SERIES, sh);
	for (const b of bars) {
		assert.ok(b.y >= 0 && b.y + b.height <= INNER_H + 1e-6, "band within inner height");
		assert.ok(b.height > 0, "positive band height");
	}
});

test("horizontal: stacked widths sum per category to the total-value width", () => {
	const sh = buildScalesH(DATA, SERIES, "cat", true, INNER_W, INNER_H);
	const bars = horizontalStackedBars(DATA, "cat", SERIES, sh);
	assert.equal(bars.length, 6);
	const aSegs = bars.filter((b) => b.category === "A");
	const stackedW = aSegs.reduce((sum, b) => sum + b.width, 0);
	const total = sh.x(14) - sh.x(0); // A: u+v = 14
	assert.ok(Math.abs(stackedW - total) < 1e-6, "stacked widths sum to the total value width");
});

test("horizontal: hiding a series rescales the value domain", () => {
	const full = buildScalesH(DATA, SERIES, "cat", false, INNER_W, INNER_H);
	const hidden = new Set(["u"]);
	const only = buildScalesH(DATA, SERIES, "cat", false, INNER_W, INNER_H, hidden);
	// With u (max 30) hidden, the domain shrinks to v (max 12), so v bars get wider.
	const fullV = horizontalBars(DATA, "cat", SERIES, full).find((b) => b.category === "C" && b.seriesIndex === 1);
	const onlyV = horizontalBars(DATA, "cat", SERIES, only, hidden).find((b) => b.category === "C" && b.seriesIndex === 1);
	assert.ok(onlyV.width > fullV.width, "hiding the larger series widens the remaining bars");
	assert.ok(full.x.domain()[1] > only.x.domain()[1], "value domain shrinks when a series is hidden");
});

test("horizontal: seriesIndex stays original when a series is hidden (stacked)", () => {
	const hidden = new Set(["u"]);
	const sh = buildScalesH(DATA, SERIES, "cat", true, INNER_W, INNER_H, hidden);
	const bars = horizontalStackedBars(DATA, "cat", SERIES, sh, hidden);
	assert.equal(bars.length, 3); // only v remains, one per category
	for (const b of bars) assert.equal(b.seriesIndex, 1, "v keeps its original index");
});

// ---- center-label helpers ----

test("centerLabelSize clamps to a legible range and scales with the hole", () => {
	assert.equal(centerLabelSize(0), 10, "tiny hole clamps up to the minimum");
	assert.equal(centerLabelSize(1000), 28, "huge hole clamps down to the maximum");
	assert.equal(centerLabelSize(40), 20, "mid hole scales linearly (40 * 0.5)");
	assert.ok(centerSubLabelSize(40) < centerLabelSize(40), "sub-label is smaller than the label");
});

// ---- accessible name ----

test("accessibleName appends the center label after the summary", () => {
	const name = accessibleName(undefined, "donut", [{ key: "v" }], ["A", "B", "C"], "72%");
	assert.ok(name.includes("Donut chart"), "carries the generated summary");
	assert.ok(name.trimEnd().endsWith("72%."), "ends with the center label");
});

test("accessibleName includes the lead-in label and omits center label when absent", () => {
	const name = accessibleName("Sales", "bar", SERIES, ["A", "B"], undefined);
	assert.ok(name.startsWith("Sales. "), "lead-in label first");
	assert.ok(!name.includes("72%"), "no center label when not provided");
});

// ---- element-level (property reflection, warn-once, accessible name) ----
// happy-dom does no layout, so the SVG geometry is confirmed in a browser (spec G5). These
// assert the JS-observable behavior: reflection, the warn-once side effects, and the aria name.
import "../packages/chart/dist/index.js";

/** Seed a size so `ready` is true and the plot render path runs (happy-dom returns 0 sizes). */
function seed(el, w = 400, h = 240) {
	el.w = w;
	el.h = h;
	el.requestUpdate();
	return settled(el);
}

/** Capture console.warn output while running `fn`. */
async function captureWarn(fn) {
	const orig = console.warn;
	const out = [];
	console.warn = (...a) => out.push(a.join(" "));
	try {
		await fn();
	} finally {
		console.warn = orig;
	}
	return out;
}

test("orientation reflects to an attribute", async () => {
	const el = await mount("dj-chart", { type: "bar", categoryKey: "cat", data: DATA, series: SERIES, orientation: "horizontal" });
	await settled(el);
	assert.equal(el.getAttribute("orientation"), "horizontal");
	el.orientation = "vertical";
	await settled(el);
	assert.equal(el.getAttribute("orientation"), "vertical");
});

test("horizontal + brush warns once and renders no brush strip", async () => {
	let el;
	const warns = await captureWarn(async () => {
		el = await mount("dj-chart", { type: "bar", categoryKey: "cat", data: DATA, series: SERIES, orientation: "horizontal", brush: true });
		await seed(el);
		el.requestUpdate();
		await settled(el); // a second update must not warn again
	});
	const brushWarns = warns.filter((w) => w.includes("brush"));
	assert.equal(brushWarns.length, 1, "brush warning logged exactly once");
	assert.equal(el.renderRoot.querySelector(".brush"), null, "no brush strip rendered when horizontal");
});

test("horizontal + right axis warns once", async () => {
	const series = [{ key: "u" }, { key: "v", axis: "right" }];
	const warns = await captureWarn(async () => {
		const el = await mount("dj-chart", { type: "bar", categoryKey: "cat", data: DATA, series, orientation: "horizontal" });
		await seed(el);
	});
	assert.equal(warns.filter((w) => w.includes("secondary")).length, 1, "right-axis warning logged once");
});

test("orientation=horizontal on a non-bar type warns once", async () => {
	const warns = await captureWarn(async () => {
		const el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, orientation: "horizontal" });
		await seed(el);
	});
	assert.equal(warns.filter((w) => w.includes("only to bar charts")).length, 1, "non-bar warning logged once");
});

test("vertical bar chart renders a plot svg and never warns (no regression)", async () => {
	let el;
	const warns = await captureWarn(async () => {
		el = await mount("dj-chart", { type: "bar", categoryKey: "cat", data: DATA, series: SERIES });
		await seed(el);
	});
	assert.equal(warns.length, 0, "vertical path emits no warnings");
	assert.ok(el.renderRoot.querySelector("svg[part='plot']"), "vertical bar chart renders a plot svg");
});

test("donut center-label rides in the accessible name", async () => {
	// Unseeded: the sr-only fallback carries the aria-label as a simple (non-SVG) node.
	const el = await mount("dj-chart", { type: "donut", categoryKey: "cat", data: DATA, series: [{ key: "u" }], centerLabel: "72%" });
	await settled(el);
	const aria = el.renderRoot.querySelector("[role='img']")?.getAttribute("aria-label") ?? "";
	assert.ok(aria.includes("72%"), "center label is part of the aria-label");
	assert.ok(aria.includes("Donut chart"), "summary is still present");
});

test("a bar chart does not append center-label to its aria-label", async () => {
	const el = await mount("dj-chart", { type: "bar", categoryKey: "cat", data: DATA, series: SERIES, centerLabel: "72%" });
	await settled(el);
	const aria = el.renderRoot.querySelector("[role='img']")?.getAttribute("aria-label") ?? "";
	assert.ok(!aria.includes("72%"), "center label ignored for non-donut aria");
});
