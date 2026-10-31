// dj-chart layout and accessibility regressions from the B1 browser pass (2026-10-29), each of
// which needs real text layout or real forced-colors emulation, so none can run under happy-dom.
// Widths are measured with getComputedTextLength() (the glyph advance), not getBBox() or
// getBoundingClientRect(): Firefox pads those two by 4-6px around SVG text while its advance
// matches Chromium's and WebKit's exactly, so the advance is the one measure that means the same
// thing in all three engines.
import { sendKeys, emulateMedia } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/chart/dist/index.js";
import { defineChartPlugin } from "../../packages/chart/dist/plugin.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** A chart inside a box of a known size, so layout doesn't depend on the runner's viewport. */
async function sizedChart(props, width = 420, height = 240) {
	const box = document.createElement("div");
	box.style.cssText = `width:${width}px; --dj-chart-height:${height}px`;
	const el = make("dj-chart", { type: "line", categoryKey: "c", series: [{ key: "v", label: "Value" }], ...props });
	box.append(el);
	await mount(box);
	await settleChart(el);
	return el;
}
async function settleChart(el) {
	await el.updateComplete;
	await wait(60);
	await settleFrames();
	await el.updateComplete;
}
const rows = (values) => values.map((v, i) => ({ c: i < DAYS.length && values.length <= DAYS.length ? DAYS[i] : `D${i + 1}`, v }));
/** The translate() of the plot's top-level group: where x=0 / y=0 of the plot sit in the SVG. */
function plotOrigin(el) {
	const t = el.shadowRoot.querySelector('svg[part="plot"] > g').getAttribute("transform");
	const [x, y] = t.match(/translate\(([-\d.]+),([-\d.]+)\)/).slice(1).map(Number);
	return { x, y };
}
/** Horizontal extent of an axis/label <text>, in plot coordinates, from its x and text-anchor. */
function extent(t) {
	const x = Number(t.getAttribute("x"));
	const w = t.getComputedTextLength();
	const anchor = t.getAttribute("text-anchor");
	if (anchor === "end") return [x - w, x];
	if (anchor === "middle") return [x - w / 2, x + w / 2];
	return [x, x + w];
}
const yTickTexts = (el) => [...el.shadowRoot.querySelectorAll('[part="axis"] text[text-anchor="end"]')];
const xTickTexts = (el) => [...el.shadowRoot.querySelectorAll('[part="axis"] text[text-anchor="middle"]:not(.axis-title)')];
/** A system color keyword resolved to rgb() in this engine, for comparing against computed fills. */
function systemColor(keyword) {
	const probe = document.createElement("span");
	probe.style.color = keyword;
	document.body.append(probe);
	const c = getComputedStyle(probe).color;
	probe.remove();
	return c;
}

describe("dj-chart layout (B1 regressions)", () => {
	afterEach(async () => {
		cleanup();
		await emulateMedia({ forcedColors: "none" });
	});

	// B1 F9: plugin table columns came from the brush window's slice but were matched to the full
	// table's rows by position, so a narrowed brush put row 120's values next to row 0's category
	// and left the rest blank. The table is never brush-narrowed; plugin columns now aren't either.
	it("plugin table cells stay on their own row when the brush is narrowed", async () => {
		const echo = defineChartPlugin({
			name: "echo",
			tableRows: (ctx) => [{ header: "Echo", cells: ctx.data.map((r) => `cat ${r.c}`) }],
		});
		const el = await sizedChart({ data: rows([3, 7, 5, 9, 4, 6, 8]), plugins: [echo], brush: true });
		const start = [...el.shadowRoot.querySelectorAll('[part="brush-handle"]')].find((h) => h.getAttribute("aria-label") === "Range start");
		start.focus();
		await sendKeys({ press: "ArrowRight" });
		await sendKeys({ press: "ArrowRight" });
		await settleChart(el);
		assertEqual(el.shadowRoot.querySelector('[aria-label="Range start"]').getAttribute("aria-valuenow"), "2", "the brush window really is narrowed");
		const trs = [...el.shadowRoot.querySelectorAll("table.sr-only tbody tr")];
		assertEqual(trs.length, 7, "the table still lists every row");
		for (const tr of trs) {
			const cat = tr.querySelector("th").textContent.trim();
			const cell = tr.querySelectorAll("td")[1].textContent.trim();
			assertEqual(cell, `cat ${cat}`, `row ${cat}: its plugin cell belongs to another row`);
		}
	});

	it('a plugin table cell of "—" is announced as "No value", like a core missing cell', async () => {
		const p = defineChartPlugin({ name: "gappy", tableRows: (ctx) => [{ header: "Gappy", cells: ctx.data.map((_, i) => (i === 0 ? "—" : "1")) }] });
		const el = await sizedChart({ data: rows([3, 7, 5]), plugins: [p] });
		const first = el.shadowRoot.querySelectorAll("table.sr-only tbody tr")[0].querySelectorAll("td")[1];
		const span = first.querySelector("span[aria-label]");
		assert(span, `the em dash carries an aria-label, got: ${first.innerHTML}`);
		assertEqual(span.getAttribute("aria-label"), "No value");
		await assertNoViolations(el);
	});

	// B1 F10: a plugin-only chart announced "Line chart, 0 series:  across N categories".
	it("a plugin-only chart's accessible name lists what its plugins draw", async () => {
		const signal = defineChartPlugin({ name: "signal", legendItems: () => [{ label: "Signal", color: "#0a0" }] });
		const described = defineChartPlugin({ name: "bands", describe: () => "Price bands", legendItems: () => [{ label: "Upper", color: "#00a" }, { label: "Lower", color: "#00a" }] });
		const el = await sizedChart({ series: [], data: rows([3, 7, 5]), plugins: [signal, described] });
		const name = el.shadowRoot.querySelector('svg[part="plot"]').getAttribute("aria-label");
		assertEqual(name, "Chart, 2 series: Signal, Price bands across 3 categories (Mon to Wed).");
		assert(!/\s{2}/.test(name), `no double space: "${name}"`);
		const caption = el.shadowRoot.querySelector("table.sr-only caption").textContent;
		assert(caption.includes("Signal, Price bands"), `the table caption says the same: "${caption}"`);
	});

	// B1 L1: the y gutter was a fixed 44px, so "10,000,000" on a log axis started left of the SVG
	// and the rotated axis title sat on top of the long labels.
	it("long y tick labels fit inside the SVG and clear the axis title", async () => {
		for (const width of [300, 1200]) {
			const el = await sizedChart({ yScale: "log", yLabel: "Value", data: rows([1, 30, 800, 12000, 450000, 2e6, 75]) }, width, width === 300 ? 200 : 600);
			const origin = plotOrigin(el);
			const ticks = yTickTexts(el);
			assert(ticks.some((t) => t.textContent.length >= 9), `${width}px: the fixture reaches a long label (${ticks.map((t) => t.textContent).join(", ")})`);
			const title = el.shadowRoot.querySelector('[part="axis"] .axis-title');
			const titleX = Number(title.getAttribute("transform").match(/translate\(([-\d.]+)/)[1]);
			const titleRight = origin.x + titleX + 13 / 2; // rotated: its line height spans x
			for (const t of ticks) {
				const [l] = extent(t);
				assert(origin.x + l >= 0, `${width}px: "${t.textContent}" starts ${(origin.x + l).toFixed(1)}px from the SVG's left edge (clipped)`);
				assert(origin.x + l >= titleRight, `${width}px: "${t.textContent}" overlaps the axis title (${(origin.x + l).toFixed(1)} < ${titleRight.toFixed(1)})`);
			}
			cleanup();
		}
	});

	// B1 M6: category labels were never thinned; 40 categories at 360px overprinted 93 pairs.
	it("category x labels never overprint, at any width", async () => {
		const data = Array.from({ length: 40 }, (_, i) => ({ c: `D${i + 1}`, v: 50 + ((i * 7) % 20) }));
		for (const width of [1200, 800, 500, 360]) {
			const el = await sizedChart({ data }, width);
			const spans = xTickTexts(el).map(extent).sort((a, b) => a[0] - b[0]);
			assert(spans.length >= 4, `${width}px: some labels survive (${spans.length})`);
			const origin = plotOrigin(el);
			const svgW = el.shadowRoot.querySelector('svg[part="plot"]').getBoundingClientRect().width;
			assert(origin.x + spans[0][0] >= 0, `${width}px: the first label starts left of the SVG`);
			assert(origin.x + spans[spans.length - 1][1] <= svgW + 0.5, `${width}px: the last label runs past the SVG's right edge`);
			for (let i = 1; i < spans.length; i++) {
				assert(spans[i][0] >= spans[i - 1][1], `${width}px: labels ${i - 1} and ${i} overlap by ${(spans[i - 1][1] - spans[i][0]).toFixed(1)}px`);
			}
			cleanup();
		}
	});

	// B1 M4: a point label's box cut 2px (Chromium) into its own marker.
	it("a point label clears its own marker", async () => {
		const el = await sizedChart({ markers: true, pointLabels: true, data: rows([0, 100, 50, 100, 0, 99.9, 0.1]) });
		const markers = [...el.shadowRoot.querySelectorAll("circle.marker")];
		const labels = [...el.shadowRoot.querySelectorAll("text.point-label")];
		assertEqual(labels.length, markers.length, "every point is labeled in this sparse fixture");
		labels.forEach((t, i) => {
			const m = markers[i];
			const markerTop = Number(m.getAttribute("cy")) - Number(m.getAttribute("r")) - 0.75; // half the 1.5px stroke
			const b = t.getBBox();
			assert(b.y + b.height <= markerTop + 0.01, `label "${t.textContent}" bottom ${(b.y + b.height).toFixed(1)} is below its marker's top ${markerTop.toFixed(1)}`);
		});
	});

	// B1 L3: a fixed-height pane (a volume pane asks for 60-80px) starved a short chart's main plot,
	// and the linear axis still asked for ~6 ticks in the sliver left, overprinting all of them.
	it("panes take at most 40% of a short chart, and linear ticks never overprint", async () => {
		const pane = defineChartPlugin({
			name: "pane",
			panes: () => [{ id: "p", height: 80, domain: [0, 1], label: "Pane" }],
			renderPane: (p) => {
				const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
				r.setAttribute("class", "probe-pane");
				r.setAttribute("height", String(p.height));
				return r;
			},
		});
		const el = await sizedChart({ data: rows([120, 135, 128, 170, 150, 160, 140]), plugins: [pane] }, 300, 200);
		const axis = el.shadowRoot.querySelector('[part="axis"] line');
		const innerH = Number(axis.getAttribute("y2"));
		const paneH = Number(el.shadowRoot.querySelector(".probe-pane").getAttribute("height"));
		assert(paneH > 0, "the pane still renders");
		assert(paneH <= 0.4 * (innerH + paneH + 8) + 0.5, `pane ${paneH.toFixed(1)}px vs plot ${innerH.toFixed(1)}px: more than 40% of the space`);
		const ys = yTickTexts(el).map((t) => Number(t.getAttribute("y"))).sort((a, b) => a - b);
		assert(ys.length >= 2, `both ends of the axis stay labeled (${ys.length} ticks)`);
		for (let i = 1; i < ys.length; i++) assert(ys[i] - ys[i - 1] >= 14, `ticks ${(ys[i] - ys[i - 1]).toFixed(1)}px apart overprint`);
	});

	// Same root cause as above, without a pane: a short chart asked d3 for ~6 linear ticks in
	// whatever height it had.
	it("a short linear axis never overprints its tick labels", async () => {
		for (const height of [120, 90, 75, 60]) {
			const el = await sizedChart({ data: rows([120, 135, 128, 170, 150, 160, 140]) }, 420, height);
			const ys = yTickTexts(el).map((t) => Number(t.getAttribute("y"))).sort((a, b) => a - b);
			assert(ys.length >= 1, `${height}px: the axis keeps at least one label`);
			for (let i = 1; i < ys.length; i++) assert(ys[i] - ys[i - 1] >= 14, `${height}px: ticks ${(ys[i] - ys[i - 1]).toFixed(1)}px apart overprint`);
			cleanup();
		}
	});

	// B1 M2/F8: under forced colors the axis text and grid kept the theme's grays, and every legend
	// swatch became the same empty box (its inline background was forced to Canvas).
	it("forced colors: axis, grid, and legend swatches use system colors", async () => {
		await emulateMedia({ forcedColors: "active" });
		const hollow = defineChartPlugin({ name: "hollowy", legendItems: () => [{ label: "Up", color: "#0a0", swatch: "hollow" }, { label: "Down", color: "#a00" }] });
		const el = await sizedChart({ data: rows([3, 7, 5]), plugins: [hollow] });
		const canvasText = systemColor("CanvasText");
		const canvas = systemColor("Canvas");
		const grayText = systemColor("GrayText");
		assertEqual(getComputedStyle(yTickTexts(el)[0]).fill, canvasText, "axis tick text is CanvasText");
		assertEqual(getComputedStyle(el.shadowRoot.querySelector('[part="grid"] line')).stroke, grayText, "grid lines are GrayText");
		const swatches = [...el.shadowRoot.querySelectorAll(".legend-swatch")].map((s) => getComputedStyle(s).backgroundColor);
		assertEqual(swatches[0], canvasText, "a series swatch is solid CanvasText, matching its CanvasText line");
		assertEqual(swatches[1], canvas, 'a plugin swatch asking for "hollow" is an outline (Canvas fill)');
		assertEqual(swatches[2], canvasText, "a plain plugin swatch is solid");
		await assertNoViolations(el);
	});
});
