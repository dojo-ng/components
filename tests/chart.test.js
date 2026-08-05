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
	sparklinePoints,
	sparklineBars,
	sparklineAccessibleName,
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

// ---- sparkline math (dj-sparkline shares core.ts with dj-chart but has its own render path) ----

test("sparklinePoints: x is evenly spaced across the width, y scaled to the data's own range", () => {
	const pts = sparklinePoints([0, 5, 10], 100, 30);
	assert.equal(pts.length, 3);
	assert.ok(Math.abs(pts[0].x - 0) < 1e-9);
	assert.ok(Math.abs(pts[1].x - 50) < 1e-9);
	assert.ok(Math.abs(pts[2].x - 100) < 1e-9);
	// SVG y grows downward: the max value maps to y=0 (top), the min to y=h (bottom).
	assert.ok(Math.abs(pts[0].y - 30) < 1e-9, "min value sits at the bottom");
	assert.ok(Math.abs(pts[2].y - 0) < 1e-9, "max value sits at the top");
});

test("sparklinePoints: a single point sits at mid-width", () => {
	const pts = sparklinePoints([5], 100, 30);
	assert.equal(pts.length, 1);
	assert.ok(Math.abs(pts[0].x - 50) < 1e-9);
});

test("sparklinePoints: honors a fixed min/max domain over the data's own range", () => {
	// Data [5,5,5] would be flat on its own range; the fixed [0,10] domain instead puts every
	// point at the vertical midpoint of THAT domain (h/2), proving the fixed domain is used.
	const pts = sparklinePoints([5, 5, 5], 100, 30, 0, 10);
	for (const p of pts) assert.ok(Math.abs(p.y - 15) < 1e-9, "value 5 in domain [0,10] is at the midpoint");
});

test("sparklinePoints: a flat series (no fixed domain) pads so the line centers", () => {
	const flat = sparklinePoints([7, 7, 7], 100, 30);
	for (const p of flat) assert.ok(Math.abs(p.y - 15) < 1e-9, "flat series centers vertically");
	const flatZero = sparklinePoints([0, 0], 100, 30);
	for (const p of flatZero) assert.ok(Math.abs(p.y - 15) < 1e-9, "a flat series of zero also centers");
});

test("sparklineBars: zero baseline when zero is within the domain — bars grow both ways", () => {
	const bars = sparklineBars([-4, 2, 6], 90, 30);
	assert.equal(bars.length, 3);
	const pos = bars.find((b) => b.value === 2);
	const neg = bars.find((b) => b.value === -4);
	assert.ok(neg.y > pos.y, "a negative bar sits below the zero baseline, a positive bar above it");
	for (const b of bars) assert.ok(b.height > 0, "every bar has positive height");
});

test("sparklineBars: an all-positive series clamps the baseline to the domain's near edge", () => {
	const bars = sparklineBars([10, 20, 30], 90, 30);
	// Zero is outside [10,30], so the baseline clamps to the domain min (10) — every bar's
	// bottom edge lands on the same y (the coordinate space's bottom, since 10 is the min).
	const bottoms = bars.map((b) => b.y + b.height);
	for (const y of bottoms) assert.ok(Math.abs(y - 30) < 1e-6, "bars share a bottom baseline at the domain min");
});

test("sparklineAccessibleName: composes label, count, min/max/last through the given formatter", () => {
	const name = sparklineAccessibleName("Revenue", [10, 30, 20], (v) => `$${v}`);
	assert.equal(name, "Revenue: 3 points, min $10, max $30, last $20.");
});

test("sparklineAccessibleName: empty data", () => {
	assert.equal(sparklineAccessibleName("Revenue", [], (v) => `$${v}`), "Revenue: no data.");
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

// ---- dj-sparkline (element-level) ----
// Same happy-dom limitation as dj-chart above, confirmed directly for this template: a bare
// `<circle>` written as static markup inside an `html`-tagged `<svg>` root renders fine, but a
// child inserted via an expression (an `svg`-tagged sub-template, e.g. the mark path/bars/
// marker) does not materialize in happy-dom's DOM at all — not a layout issue, a happy-dom gap
// in Lit part handling for SVG child content. So, as with dj-chart, the marks themselves are
// confirmed in a browser (spec SL3), not here; these assert only what survives the gap:
// attribute-level bindings on the <svg> root itself (reflection, aria) and the pure-helper math,
// which is unit-tested directly above.

test("dj-sparkline: type and marker reflect", async () => {
	const el = await mount("dj-sparkline", { data: [1, 2, 3], type: "area", marker: true });
	await settled(el);
	assert.equal(el.getAttribute("type"), "area");
	assert.equal(el.hasAttribute("marker"), true);
	el.type = "bar";
	el.marker = false;
	await settled(el);
	assert.equal(el.getAttribute("type"), "bar");
	assert.equal(el.hasAttribute("marker"), false);
});

test("dj-sparkline: aria-hidden when no label; role=img + aria-label when label is set", async () => {
	const noLabel = await mount("dj-sparkline", { data: [1, 2, 3] });
	await settled(noLabel);
	const svgNoLabel = noLabel.renderRoot.querySelector("svg");
	assert.equal(svgNoLabel.getAttribute("aria-hidden"), "true");
	assert.equal(svgNoLabel.hasAttribute("role"), false, "no role attribute when aria-hidden");
	assert.equal(svgNoLabel.hasAttribute("aria-label"), false);

	const labeled = await mount("dj-sparkline", { data: [1, 2, 3], label: "Revenue" });
	await settled(labeled);
	const svgLabeled = labeled.renderRoot.querySelector("svg");
	assert.equal(svgLabeled.getAttribute("role"), "img");
	assert.equal(svgLabeled.hasAttribute("aria-hidden"), false);
	assert.ok(svgLabeled.getAttribute("aria-label").startsWith("Revenue: 3 points"), "aria-label carries the generated summary");
});

test("dj-sparkline: aria-label composes through the ambient locale (localized number check)", async () => {
	// Set `lang` on the element itself, BEFORE connecting, so LocaleController's hostConnected
	// sync picks it up on first render (mount()'s props path sets the Lit property, which does
	// not reflect to the attribute LocaleController actually reads).
	const de = document.createElement("dj-sparkline");
	de.setAttribute("lang", "de-DE");
	de.data = [1000.5];
	de.label = "Revenue";
	document.body.appendChild(de);
	await de.updateComplete;
	const deAria = de.renderRoot.querySelector("svg").getAttribute("aria-label");
	assert.ok(deAria.includes("1.000,5"), `expected de-DE grouping/decimal in: ${deAria}`);

	const en = document.createElement("dj-sparkline");
	en.setAttribute("lang", "en-US");
	en.data = [1000.5];
	en.label = "Revenue";
	document.body.appendChild(en);
	await en.updateComplete;
	const enAria = en.renderRoot.querySelector("svg").getAttribute("aria-label");
	assert.ok(enAria.includes("1,000.5"), `expected en-US grouping/decimal in: ${enAria}`);
});
