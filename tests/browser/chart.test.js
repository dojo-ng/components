// dj-chart, in a real browser: the SVG only renders once real layout gives the plot a size
// (ResizeObserver-driven, so happy-dom can't exercise it), interactive legend toggling,
// keyboard operation of the brush window, and an axe pass. Not a form control.
import { sendKeys } from "@web/test-runner-commands";
import { svg } from "lit";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/chart/dist/index.js";
import { defineChartPlugin } from "../../packages/chart/dist/plugin.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DATA = [
	{ m: "Jan", v: 3 },
	{ m: "Feb", v: 7 },
	{ m: "Mar", v: 5 },
	{ m: "Apr", v: 9 },
	{ m: "May", v: 4 },
];
const SERIES = [{ key: "v", label: "Visits" }];

function chart(props) {
	return make("dj-chart", { data: DATA, series: SERIES, categoryKey: "m", type: "line", ...props });
}
// Charts render only after ResizeObserver measures the plot; give it real time to settle.
async function settleChart(el) {
	await el.updateComplete;
	await wait(60);
	await settleFrames();
}

describe("dj-chart", () => {
	afterEach(cleanup);

	it("renders the SVG once the plot has real layout", async () => {
		const el = await mount(chart({}));
		await settleChart(el);
		assert(el.shadowRoot.querySelector('svg[part="plot"]'), "the plot SVG renders when the box has a size");
		assert(el.shadowRoot.querySelector('[part="line"]'), "the line series is drawn");
	});

	it("legend items toggle series visibility and emit dj-legend-toggle", async () => {
		const el = await mount(chart({ legendToggle: true }));
		await settleChart(el);
		let detail;
		el.addEventListener("dj-legend-toggle", (e) => { detail = e.detail; });

		assert(el.shadowRoot.querySelector('[part="line"]'), "the series is visible to start");
		const item = el.shadowRoot.querySelector('[part="legend-item"]');
		assert(item, "an interactive legend item renders");
		item.click();
		await el.updateComplete;
		assert(detail && detail.key === "v" && detail.hidden === true, "toggling emits dj-legend-toggle with the hidden state");
		assert(!el.shadowRoot.querySelector('[part="line"]'), "the hidden series is no longer drawn");

		el.shadowRoot.querySelector('[part="legend-item"]').click();
		await el.updateComplete;
		assert(el.shadowRoot.querySelector('[part="line"]'), "toggling again restores the series");
	});

	it("the brush window moves with the keyboard", async () => {
		const el = await mount(chart({ brush: true }));
		await settleChart(el);
		const startHandle = [...el.shadowRoot.querySelectorAll('[part="brush-handle"]')].find((h) => h.getAttribute("aria-label") === "Range start");
		assert(startHandle, "the brush renders a start handle");
		assertEqual(startHandle.getAttribute("aria-valuenow"), "0", "the window starts at category 0");

		startHandle.focus();
		await sendKeys({ press: "ArrowRight" });
		await el.updateComplete;
		const now = [...el.shadowRoot.querySelectorAll('[part="brush-handle"]')].find((h) => h.getAttribute("aria-label") === "Range start").getAttribute("aria-valuenow");
		assert(Number(now) > 0, `ArrowRight narrows the window from the start (got ${now})`);
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(chart({ label: "Monthly visits" }));
		await settleChart(el);
		await assertNoViolations(el);
	});

	// Track M (point labels): decision 27's whole argument is that a <text> label inside
	// role="img" isn't independently announced, so a label adds nothing to double-read — but that
	// argument only holds as long as role="img" is actually still there. Checked directly rather
	// than assumed, same as M3 asks.
	it("point labels: axe clean, and role=\"img\" is still present on the plot SVG", async () => {
		const el = await mount(chart({ label: "Monthly visits", pointLabels: true }));
		await settleChart(el);
		const svg = el.shadowRoot.querySelector('svg[part="plot"]');
		assert(svg, "the plot SVG renders");
		assertEqual(svg.getAttribute("role"), "img", "role=img is what makes the point labels non-double-read (decision 27) — if this ever changes, that assumption breaks");
		assert(el.shadowRoot.querySelectorAll(".point-label").length > 0, "point labels actually rendered for this assertion to mean anything");
		await assertNoViolations(el);
	});

	// Track L (log scale): happy-dom can't lay out real SVG geometry, so the actual break in the
	// line — the thing decision 3 cares about most — is confirmed here, in a real renderer, not just
	// via the linePath string in the unit suite.
	it("y-scale=\"log\": a non-positive value breaks the line into two subpaths, and axe stays clean", async () => {
		const data = [{ m: "Jan", v: 10 }, { m: "Feb", v: 0 }, { m: "Mar", v: 30 }];
		const el = await mount(chart({ data, label: "Sensor", yScale: "log" }));
		await settleChart(el);
		const line = el.shadowRoot.querySelector('[part="line"]');
		assert(line, "the line still renders");
		const d = line.getAttribute("d") ?? "";
		assertEqual((d.match(/M/g) ?? []).length, 2, "the non-positive value breaks the path into two subpaths, same as the unit-tested linePath string");
		await assertNoViolations(el);
	});

	// Track P (plugin seam): the geometry a plugin actually cares about — domain merge, pane
	// height/gap math, renderUnder/renderOver document order, and a pane sharing the plot's own
	// xCenter — all live inside the SVG-tagged sub-templates happy-dom can't lay out (see the unit
	// suite's own banner), so this is the one place they're confirmed for real.
	it("plugin seam: domain merge, pane layout, under/over ordering, and shared xCenter", async () => {
		const plugin = defineChartPlugin({
			name: "test-plugin",
			domain: () => [0, 500],
			panes: () => [
				{ id: "vol", height: 60, domain: [0, 100], label: "Volume" },
				{ id: "zero", height: 0, domain: [0, 1], label: "Zero pane" },
			],
			renderUnder: () => svg`<circle class="plugin-under-mark" cx="1" cy="1" r="1"></circle>`,
			renderOver: () => svg`<circle class="plugin-over-mark" cx="1" cy="1" r="1"></circle>`,
			renderPane: (pane, ctx) => svg`<circle class="pane-xcenter-mark" cx="${ctx.xCenter("Feb")}" cy="10" r="3"></circle>`,
		});
		const el = await mount(chart({ plugins: [plugin] }));
		await settleChart(el);

		const svgEl = el.shadowRoot.querySelector('svg[part="plot"]');
		const axisTicks = [...svgEl.querySelectorAll("g.axis text")].map((t) => t.textContent);
		assert(axisTicks.includes("500"), `the plugin's [0,500] domain widens the y-axis ticks (got ${axisTicks.join(", ")})`);

		const paneGroups = svgEl.querySelectorAll('g[part="series"][role="group"]');
		assertEqual(paneGroups.length, 1, "the zero-height pane is ignored; only the real pane renders");
		assertEqual(paneGroups[0].getAttribute("aria-label"), "Volume");

		const seriesChildren = [...svgEl.querySelector("g").children].map((c) => c.getAttribute("class") || c.getAttribute("part") || c.tagName);
		const underIdx = seriesChildren.findIndex((c) => c === "plugin-under-mark");
		const seriesIdx = seriesChildren.indexOf("series");
		const overIdx = seriesChildren.findIndex((c) => c === "plugin-over-mark");
		assert(underIdx >= 0 && seriesIdx >= 0 && overIdx >= 0, "under mark, core series, and over mark all rendered");
		assert(underIdx < seriesIdx, "renderUnder draws before the core series in document order");
		assert(seriesIdx < overIdx, "renderOver draws after the core series in document order");

		const linePath = svgEl.querySelector('[part="line"]').getAttribute("d");
		const febX = linePath.split("L")[1].split(",")[0]; // second point in the path = category "Feb"
		const paneMarkCx = el.shadowRoot.querySelector(".pane-xcenter-mark").getAttribute("cx");
		assertEqual(paneMarkCx, febX, "a pane's xCenter(\"Feb\") matches the core series' own x for Feb — same shared scale");

		await assertNoViolations(el);
	});

	// Found via a real financial-demo.html session (2026-09-12), not reasoned out in advance: a
	// chart with NO core series (a candlestick chart, decision 17) had its y-axis permanently
	// pinned at the yDomain "no series" placeholder (0 for linear) even once a plugin's own domain()
	// widened it — every candle rendered as a near-flat hairline because the axis spanned $0-$170
	// instead of the actual ~$140-$170 the data lived in. Fixed in buildPluginLayer: with no core
	// series, the merge starts from the plugin's own domain instead of folding in the placeholder.
	it("plugin seam: a chart with no core series is NOT pinned at the yDomain placeholder", async () => {
		const plugin = defineChartPlugin({ name: "price-plugin", domain: () => [140, 170] });
		const el = await mount(chart({ series: [], plugins: [plugin] }));
		await settleChart(el);

		const svgEl = el.shadowRoot.querySelector('svg[part="plot"]');
		const axisTicks = [...svgEl.querySelectorAll("g.axis text")]
			.map((t) => Number(t.textContent))
			.filter((n) => Number.isFinite(n));
		assert(axisTicks.length > 0, "the axis renders numeric ticks at all");
		assert(!axisTicks.includes(0), `axis must not include the placeholder's 0 floor (got ${axisTicks.join(", ")})`);
		assert(Math.min(...axisTicks) > 100, `the tightest tick should sit close to the plugin's own [140,170] domain, not near 0 (got ${axisTicks.join(", ")})`);
	});

	// Track P (plugin seam, P4): a plugin's legend/table extra columns are real accessible content —
	// confirmed here for both the header/cell association axe checks and, unlike unit tests, that the
	// whole chart (plugin content included) stays clean end to end.
	it("plugin seam: legend and table extra columns are present and axe-clean", async () => {
		const plugin = defineChartPlugin({
			name: "test-plugin",
			legendItems: () => [{ label: "Signal", color: "#0a0" }],
			tableRows: (ctx) => [{ header: "Signal", cells: ctx.data.map(() => "buy") }],
		});
		const el = await mount(chart({ plugins: [plugin], legendToggle: true, label: "Monthly visits" }));
		await settleChart(el);

		const legendText = el.shadowRoot.querySelector('[part="legend"]').textContent;
		assert(legendText.includes("Signal"), "the plugin's legend entry renders");

		const headerCells = [...el.shadowRoot.querySelectorAll("table.sr-only thead th")];
		const pluginHeader = headerCells.find((th) => th.textContent === "Signal");
		assert(pluginHeader, "the plugin's table column header renders");
		assertEqual(pluginHeader.getAttribute("scope"), "col");

		await assertNoViolations(el);
	});

	it("plugin seam: renderer=\"canvas\" with a plugin falls back to svg in a real browser too", async () => {
		const plugin = defineChartPlugin({ name: "test-plugin" });
		const el = await mount(chart({ plugins: [plugin], renderer: "canvas" }));
		await settleChart(el);
		assert(el.shadowRoot.querySelector('svg[part="plot"]'), "svg still renders");
		assert(!el.shadowRoot.querySelector('canvas[part="plot-canvas"]'), "no canvas overlay when plugins are present");
	});
});
