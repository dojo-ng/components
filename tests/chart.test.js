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
	sparklineLinePath,
	sparklineAreaPath,
	sparklineBars,
	sparklineAccessibleName,
	drawSeries,
	effectiveRenderer,
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

// The path builders turn points into the `d` strings the element renders. happy-dom drops
// expression-inserted SVG children (see chart-later-spec.md SL1), so the strings never reach a
// DOM assertion in this suite — these are the only place their output is checked at all outside
// the real-browser suite.
test("sparklineLinePath: one moveto then a lineto per remaining point", () => {
	assert.equal(sparklineLinePath(sparklinePoints([0, 10, 5], 100, 30)), "M0,30 L50,0 L100,15");
});

test("sparklineLinePath: empty data produces no path", () => {
	assert.equal(sparklineLinePath([]), "");
});

test("sparklineAreaPath: closes the line down to the bottom edge and back", () => {
	const pts = sparklinePoints([0, 10, 5], 100, 30);
	assert.equal(sparklineAreaPath(pts, 30), "M0,30 L50,0 L100,15 L100,30 L0,30 Z");
});

test("sparklineAreaPath: empty data produces no path", () => {
	assert.equal(sparklineAreaPath([], 30), "");
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

// ---- canvas escape hatch (effectiveRenderer, drawSeries) ----
// happy-dom has no real 2D context, so drawSeries is exercised with a recording fake here — the
// only place its call shapes are asserted at all. Actual pixels are confirmed in a browser (CV3).

/** A CanvasCtxLike recording fake: every method call and property assignment becomes a
 * `[name, ...args]` tuple in `calls`, in order. */
function makeCanvasCtx() {
	const calls = [];
	const rec = (name) => (...args) => calls.push([name, ...args]);
	const ctx = {
		calls,
		clearRect: rec("clearRect"),
		beginPath: rec("beginPath"),
		moveTo: rec("moveTo"),
		lineTo: rec("lineTo"),
		closePath: rec("closePath"),
		arc: rec("arc"),
		fill: rec("fill"),
		stroke: rec("stroke"),
	};
	for (const prop of ["fillStyle", "strokeStyle", "lineWidth", "globalAlpha"]) {
		Object.defineProperty(ctx, prop, {
			set: (v) => {
				calls.push([prop, v]);
			},
		});
	}
	return ctx;
}
const callNames = (ctx, name) => ctx.calls.filter((c) => c[0] === name);

test("drawSeries: clears the canvas once per draw, even with no marks", () => {
	const ctx = makeCanvasCtx();
	drawSeries(ctx, [], 100, 30);
	assert.equal(callNames(ctx, "clearRect").length, 1);
	assert.deepEqual(ctx.calls[0], ["clearRect", 0, 0, 100, 30]);
});

test("drawSeries: a line mark issues one moveTo, (n-1) lineTo, and a single stroke — counts scale with points", () => {
	const points5 = [0, 1, 2, 3, 4].map((i) => ({ x: i * 10, y: i }));
	const ctx = makeCanvasCtx();
	drawSeries(ctx, [{ type: "line", color: "#123", points: points5 }], 100, 30);
	assert.equal(callNames(ctx, "moveTo").length, 1);
	assert.equal(callNames(ctx, "lineTo").length, 4);
	assert.equal(callNames(ctx, "stroke").length, 1);
	assert.equal(callNames(ctx, "fill").length, 0, "a line mark never fills");

	const points20 = Array.from({ length: 20 }, (_, i) => ({ x: i, y: i }));
	const ctx2 = makeCanvasCtx();
	drawSeries(ctx2, [{ type: "line", color: "#123", points: points20 }], 100, 30);
	assert.equal(callNames(ctx2, "lineTo").length, 19, "lineTo count scales with point count");
});

test("drawSeries: an area mark closes its path (closePath + one fill) in addition to the stroked line on top", () => {
	const points = [{ x: 0, y: 10 }, { x: 10, y: 5 }, { x: 20, y: 8 }];
	const ctx = makeCanvasCtx();
	drawSeries(ctx, [{ type: "area", color: "#123", points, baseline: 30 }], 100, 30);
	assert.equal(callNames(ctx, "closePath").length, 1);
	assert.equal(callNames(ctx, "fill").length, 1);
	assert.equal(callNames(ctx, "stroke").length, 1, "the line still strokes on top of the fill");
	// One moveTo opens the fill path (at the baseline), one opens the stroked line (at the data).
	const moveTo = callNames(ctx, "moveTo");
	assert.equal(moveTo.length, 2);
	assert.deepEqual(moveTo[0], ["moveTo", 0, 30]);
	// Fill path: n points + one line back down to the baseline. Stroke: n-1 (a plain polyline).
	const lineTo = callNames(ctx, "lineTo");
	assert.equal(lineTo.length, points.length + 1 + (points.length - 1));
	assert.ok(lineTo.some((c) => c[1] === points[points.length - 1].x && c[2] === 30), "the fill path closes down to the baseline");
});

test("drawSeries: a scatter mark issues one arc + one fill per point", () => {
	const points = [{ x: 1, y: 1, r: 4 }, { x: 2, y: 2, r: 4 }, { x: 3, y: 3, r: 4 }, { x: 4, y: 4, r: 4 }];
	const ctx = makeCanvasCtx();
	drawSeries(ctx, [{ type: "scatter", color: "#123", points }], 100, 30);
	assert.equal(callNames(ctx, "arc").length, 4, "arc count scales with point count");
	assert.equal(callNames(ctx, "fill").length, 4);
	assert.equal(callNames(ctx, "moveTo").length, 0, "scatter never strokes a path");
	assert.equal(callNames(ctx, "stroke").length, 0);
});

test("drawSeries: a mark with no points draws nothing beyond the initial clear", () => {
	const ctx = makeCanvasCtx();
	drawSeries(ctx, [{ type: "line", color: "#123", points: [] }], 100, 30);
	assert.equal(ctx.calls.filter((c) => c[0] !== "clearRect").length, 0);
});

test("effectiveRenderer: svg passes through regardless of type or forced-colors", () => {
	assert.equal(effectiveRenderer("svg", "line", false), "svg");
	assert.equal(effectiveRenderer("svg", "bar", true), "svg");
});

test("effectiveRenderer: canvas + bar falls back to svg (the unsupported-type case)", () => {
	assert.equal(effectiveRenderer("canvas", "bar", false), "svg");
});

test("effectiveRenderer: canvas + forced-colors falls back to svg regardless of type", () => {
	assert.equal(effectiveRenderer("canvas", "line", true), "svg");
	assert.equal(effectiveRenderer("canvas", "scatter", true), "svg");
});

test("effectiveRenderer: canvas stays canvas for line/area/scatter with no forced-colors", () => {
	assert.equal(effectiveRenderer("canvas", "line", false), "canvas");
	assert.equal(effectiveRenderer("canvas", "area", false), "canvas");
	assert.equal(effectiveRenderer("canvas", "scatter", false), "canvas");
});

test("effectiveRenderer: canvas + pie/donut/bubble falls back to svg", () => {
	assert.equal(effectiveRenderer("canvas", "pie", false), "svg");
	assert.equal(effectiveRenderer("canvas", "donut", false), "svg");
	assert.equal(effectiveRenderer("canvas", "bubble", false), "svg");
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

// ---- streaming (appendData / push) ----
// `scheduleFrame` is the one small overridable seam both elements route their rAF/microtask
// scheduling through (chart-later-spec.md ST1); replacing it with a queue lets these tests
// drive the batching deterministically instead of waiting on real frame timing.

test("dj-chart appendData: two calls within one frame coalesce into a single scheduled flush", async () => {
	const el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES });
	await seed(el);
	const scheduled = [];
	el.scheduleFrame = (fn) => scheduled.push(fn);
	el.appendData([{ cat: "D", u: 40, v: 16 }]);
	el.appendData([{ cat: "E", u: 50, v: 20 }]);
	assert.equal(scheduled.length, 1, "the second appendData call coalesces; no second frame is scheduled");
	scheduled.shift()();
	await settled(el);
	assert.equal(el.data.length, DATA.length + 2, "a single flush applied both queued rows");
	assert.deepEqual(el.data.slice(-2).map((d) => d.cat), ["D", "E"]);
});

test("dj-chart appendData: trims to max-points from the front", async () => {
	const el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, maxPoints: 4 });
	await seed(el);
	el.scheduleFrame = (fn) => fn();
	el.appendData([{ cat: "D", u: 40, v: 16 }, { cat: "E", u: 50, v: 20 }]);
	await settled(el);
	assert.equal(el.data.length, 4, "trimmed to max-points");
	assert.deepEqual(el.data.map((d) => d.cat), ["B", "C", "D", "E"], "oldest rows trimmed from the front");
});

test("dj-chart appendData: clears an active brush selection", async () => {
	const el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, brush: true });
	await seed(el);
	el.view = { start: 0, end: 1 };
	await settled(el);
	el.scheduleFrame = (fn) => fn();
	el.appendData([{ cat: "D", u: 40, v: 16 }]);
	await settled(el);
	assert.equal(el.view, null, "brush selection cleared on append");
});

test("dj-chart appendData: the streamed render carries a no-transition marker; a normal data assignment does not", async () => {
	const el = await mount("dj-chart", { type: "bar", categoryKey: "cat", data: DATA, series: SERIES });
	await seed(el);
	const plotSvg = () => el.renderRoot.querySelector("svg[part='plot']");
	assert.ok(!plotSvg().classList.contains("no-transition"), "an ordinary render carries no streaming marker");

	const scheduled = [];
	el.scheduleFrame = (fn) => scheduled.push(fn);
	el.appendData([{ cat: "D", u: 40, v: 16 }]);
	scheduled.shift()(); // run the flush: sets #streaming and assigns data
	await settled(el);
	assert.ok(plotSvg().classList.contains("no-transition"), "the streamed render carries the marker");
	assert.equal(scheduled.length, 1, "the flush also scheduled next frame's cleanup");

	scheduled.shift()(); // run the cleanup: clears #streaming and requests an update
	await settled(el);
	assert.ok(!plotSvg().classList.contains("no-transition"), "the marker clears on the next scheduled frame");

	el.data = el.data.concat([{ cat: "F", u: 5, v: 2 }]);
	await settled(el);
	assert.ok(!plotSvg().classList.contains("no-transition"), "a later, ordinary data assignment never carries the marker");
});

test("dj-sparkline push: scalar and array both batch via scheduleFrame and honor max-points", async () => {
	const el = await mount("dj-sparkline", { data: [1, 2, 3], maxPoints: 4 });
	await settled(el);
	const scheduled = [];
	el.scheduleFrame = (fn) => scheduled.push(fn);
	el.push(4);
	el.push([5, 6]);
	assert.equal(scheduled.length, 1, "multiple push calls batch into one scheduled flush");
	scheduled.shift()();
	await settled(el);
	assert.deepEqual(el.data, [3, 4, 5, 6], "a single flush trims to max-points from the front");
});

// ---- canvas escape hatch (element-level) ----
// happy-dom has no real 2D context, so nothing here asserts drawn pixels (that's drawSeries'
// unit tests, and CV3's browser confirmation). A <canvas> is a plain HTML element (not an
// expression-inserted SVG child), so — unlike the marks it replaces — its presence/absence and
// its `part` attribute DO survive happy-dom and are asserted directly here.

test("dj-chart renderer reflects to an attribute", async () => {
	const el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, renderer: "canvas" });
	await seed(el);
	assert.equal(el.getAttribute("renderer"), "canvas");
	el.renderer = "svg";
	await settled(el);
	assert.equal(el.getAttribute("renderer"), "svg");
});

test("dj-chart renderer defaults to svg: no canvas overlay, no warning", async () => {
	let el;
	const warns = await captureWarn(async () => {
		el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES });
		await seed(el);
	});
	assert.equal(warns.length, 0);
	assert.equal(el.renderRoot.querySelector('canvas[part="plot-canvas"]'), null);
});

test("dj-chart renderer=canvas on an eligible type (line) renders a canvas overlay with no warning", async () => {
	let el;
	const warns = await captureWarn(async () => {
		el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, renderer: "canvas" });
		await seed(el);
	});
	assert.equal(warns.length, 0);
	assert.ok(el.renderRoot.querySelector('canvas[part="plot-canvas"]'), "canvas overlay present");
});

test("dj-chart renderer=canvas on scatter renders a canvas overlay with no warning", async () => {
	let el;
	const warns = await captureWarn(async () => {
		el = await mount("dj-chart", { type: "scatter", xKey: "u", data: DATA, series: [{ key: "v" }], renderer: "canvas" });
		await seed(el);
	});
	assert.equal(warns.length, 0);
	assert.ok(el.renderRoot.querySelector('canvas[part="plot-canvas"]'), "canvas overlay present");
});

test("dj-chart renderer=canvas on an unsupported type (bar) warns once and falls back to svg", async () => {
	let el;
	const warns = await captureWarn(async () => {
		el = await mount("dj-chart", { type: "bar", categoryKey: "cat", data: DATA, series: SERIES, renderer: "canvas" });
		await seed(el);
		el.requestUpdate();
		await settled(el); // a second update must not warn again
	});
	assert.equal(warns.filter((w) => w.includes("canvas")).length, 1, "canvas warning logged exactly once");
	assert.equal(el.renderRoot.querySelector('canvas[part="plot-canvas"]'), null, "no canvas overlay when unsupported");
	assert.ok(el.renderRoot.querySelector("svg[part='plot']"), "still renders the svg plot");
});

test("dj-chart renderer=canvas warns once for a stacked chart even though type is line/area", async () => {
	let el;
	const warns = await captureWarn(async () => {
		el = await mount("dj-chart", { type: "area", categoryKey: "cat", data: DATA, series: SERIES, stacked: true, renderer: "canvas" });
		await seed(el);
	});
	assert.equal(warns.filter((w) => w.includes("canvas")).length, 1);
	assert.equal(el.renderRoot.querySelector('canvas[part="plot-canvas"]'), null);
});

test("dj-chart renderer=canvas warns once for a combo where a series overrides to bar", async () => {
	const series = [{ key: "u" }, { key: "v", type: "bar" }];
	let el;
	const warns = await captureWarn(async () => {
		el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series, renderer: "canvas" });
		await seed(el);
	});
	assert.equal(warns.filter((w) => w.includes("canvas")).length, 1);
	assert.equal(el.renderRoot.querySelector('canvas[part="plot-canvas"]'), null);
});
