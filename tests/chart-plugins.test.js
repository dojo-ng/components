// Track P: the plugin seam. `renderUnder`/`renderOver`/pane geometry/tick values live inside the
// SVG-tagged sub-templates that happy-dom desyncs on re-render (see chart.test.js's own banner) —
// those are confirmed by hand in a browser instead. What's asserted here is everything that DOES
// survive happy-dom: property/element wiring (setup/dispose, canvas fallback, the plugins:[] no-op
// guarantee) and the plain-HTML surfaces a plugin can extend (tooltip override, legend, table).
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/chart/dist/index.js";
import { defineChartPlugin } from "../packages/chart/dist/plugin.js";

const DATA = [
	{ cat: "A", u: 10 },
	{ cat: "B", u: 20 },
	{ cat: "C", u: 30 },
];
const SERIES = [{ key: "u" }];

/** Seed a size so `ready` is true and the plugin/plot render path runs (happy-dom returns 0 sizes). */
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

// ---- P1: the seam itself ----

test("defineChartPlugin resolves from the package entry point and is the identity function", () => {
	assert.equal(typeof defineChartPlugin, "function");
	const p = { name: "x" };
	assert.equal(defineChartPlugin(p), p, "defineChartPlugin returns its argument unchanged");
});

test("a chart with plugins: [] renders identically to one with the property left absent", async () => {
	const off = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES });
	await seed(off);
	const on = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, plugins: [] });
	await seed(on);
	assert.equal(on.renderRoot.querySelector(".plot").outerHTML, off.renderRoot.querySelector(".plot").outerHTML, "P1: plugins: [] is byte-identical to no plugins property at all");
	assert.equal(on.renderRoot.querySelector("table.sr-only").outerHTML, off.renderRoot.querySelector("table.sr-only").outerHTML);
});

test("a plugin whose every hook is absent changes nothing", async () => {
	const off = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES });
	await seed(off);
	const noop = defineChartPlugin({ name: "noop" });
	const on = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, plugins: [noop] });
	await seed(on);
	assert.equal(on.renderRoot.querySelector(".plot").outerHTML, off.renderRoot.querySelector(".plot").outerHTML, "P1: a plugin with no hooks implemented renders identically to no plugin at all");
});

test("a plugin's setup runs once on first (seeded) render and does not re-run on an unrelated update", async () => {
	let setupCalls = 0;
	const plugin = defineChartPlugin({ name: "p", setup: () => { setupCalls++; } });
	const el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, plugins: [plugin] });
	await seed(el);
	assert.equal(setupCalls, 1, "setup runs exactly once for the initial seeded render");
	el.requestUpdate();
	await settled(el);
	assert.equal(setupCalls, 1, "an unrelated re-render (same plugins array reference) does not re-run setup");
});

test("a plugin's disposer runs when the plugins array is replaced, and the new array's setup runs", async () => {
	let disposeCalls = 0;
	let setupCallsB = 0;
	const pluginA = defineChartPlugin({ name: "a", setup: () => () => { disposeCalls++; } });
	const pluginB = defineChartPlugin({ name: "b", setup: () => { setupCallsB++; } });
	const el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, plugins: [pluginA] });
	await seed(el);
	assert.equal(disposeCalls, 0);
	el.plugins = [pluginB];
	await settled(el);
	assert.equal(disposeCalls, 1, "replacing the plugins array disposes the previous setup");
	assert.equal(setupCallsB, 1, "the new array's plugin gets its own setup run");
});

test("a plugin's disposer runs on disconnect", async () => {
	let disposeCalls = 0;
	const plugin = defineChartPlugin({ name: "p", setup: () => () => { disposeCalls++; } });
	const el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, plugins: [plugin] });
	await seed(el);
	el.remove();
	assert.equal(disposeCalls, 1, "disconnectedCallback disposes any active plugin setups");
});

test("renderer=\"canvas\" with a plugin warns once and renders svg, not a canvas overlay", async () => {
	const plugin = defineChartPlugin({ name: "p" });
	let el;
	const warns = await captureWarn(async () => {
		el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, renderer: "canvas", plugins: [plugin] });
		await seed(el);
		el.requestUpdate();
		await settled(el); // a second render must not warn again
	});
	assert.equal(warns.filter((w) => w.includes("plugins")).length, 1, "the plugins+canvas warning logs exactly once");
	assert.equal(el.renderRoot.querySelector('canvas[part="plot-canvas"]'), null, "no canvas overlay when plugins are present");
	assert.ok(el.renderRoot.querySelector("svg[part='plot']"), "still renders the svg plot");
});

test("renderer=\"canvas\" with no plugins is unaffected (no regression)", async () => {
	const warns = await captureWarn(async () => {
		const el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, renderer: "canvas" });
		await seed(el);
		assert.ok(el.renderRoot.querySelector('canvas[part="plot-canvas"]'), "canvas overlay still renders with no plugins");
	});
	assert.equal(warns.length, 0);
});

// ---- P2: tooltip override (plain HTML — survives happy-dom) ----

test("renderTooltip: a plugin's renderTooltip replaces the core tooltip body for that category", async () => {
	const plugin = defineChartPlugin({
		name: "p",
		renderTooltip: (category) => (category === "B" ? "PLUGIN BODY" : undefined),
	});
	const el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, plugins: [plugin] });
	await seed(el);
	el.hovered = "B";
	await settled(el);
	const tooltip = el.renderRoot.querySelector(".tooltip");
	assert.ok(tooltip.textContent.includes("PLUGIN BODY"), "the plugin's tooltip body is used for category B");
	assert.equal(tooltip.querySelector(".tooltip-row"), null, "the core per-series rows are replaced, not appended");
});

test("renderTooltip: the core body still shows for a category the plugin returns undefined for", async () => {
	const plugin = defineChartPlugin({
		name: "p",
		renderTooltip: (category) => (category === "B" ? "PLUGIN BODY" : undefined),
	});
	const el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, plugins: [plugin] });
	await seed(el);
	el.hovered = "A";
	await settled(el);
	const tooltip = el.renderRoot.querySelector(".tooltip");
	assert.equal(tooltip.textContent.includes("PLUGIN BODY"), false);
	assert.ok(tooltip.querySelector(".tooltip-row"), "category A falls through to the core tooltip body");
});

test("renderTooltip: the first plugin (in array order) to return a defined body wins", async () => {
	const first = defineChartPlugin({ name: "first", renderTooltip: () => "FIRST" });
	const second = defineChartPlugin({ name: "second", renderTooltip: () => "SECOND" });
	const el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, plugins: [first, second] });
	await seed(el);
	el.hovered = "A";
	await settled(el);
	assert.ok(el.renderRoot.querySelector(".tooltip").textContent.includes("FIRST"));
	assert.equal(el.renderRoot.querySelector(".tooltip").textContent.includes("SECOND"), false);
});

test("renderTooltip: a later plugin's body is used when an earlier plugin returns undefined", async () => {
	const first = defineChartPlugin({ name: "first", renderTooltip: () => undefined });
	const second = defineChartPlugin({ name: "second", renderTooltip: () => "SECOND" });
	const el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, plugins: [first, second] });
	await seed(el);
	el.hovered = "A";
	await settled(el);
	assert.ok(el.renderRoot.querySelector(".tooltip").textContent.includes("SECOND"));
});

// ---- P4: legend and accessible-table extra columns (plain HTML — survives happy-dom) ----

test("renderLegend: a plugin's legendItems are appended after the core series entries", async () => {
	const plugin = defineChartPlugin({ name: "p", legendItems: () => [{ label: "Volume", color: "#123456" }] });
	const el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, plugins: [plugin] });
	await seed(el);
	const items = el.renderRoot.querySelectorAll(".legend .legend-item");
	assert.equal(items.length, 2, "one core series entry plus one plugin entry");
	assert.equal(items[0].textContent.trim(), "u", "core series entry comes first");
	assert.equal(items[1].textContent.trim(), "Volume", "plugin entry appended after");
	assert.ok(items[1].querySelector(".legend-swatch").getAttribute("style").includes("#123456"));
});

test("renderLegend: plugin legend items still append when legend-toggle is on (as plain, non-button items)", async () => {
	const plugin = defineChartPlugin({ name: "p", legendItems: () => [{ label: "Volume", color: "#123456" }] });
	const el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, plugins: [plugin], legendToggle: true });
	await seed(el);
	const items = el.renderRoot.querySelectorAll(".legend .legend-item");
	assert.equal(items.length, 2);
	assert.equal(items[0].tagName, "BUTTON", "core entries stay toggle buttons");
	assert.equal(items[1].tagName, "SPAN", "plugin entries are not toggleable");
	assert.equal(items[1].textContent.trim(), "Volume");
});

test("renderLegend: no plugin legend entries when legendItems is absent (no regression)", async () => {
	const plugin = defineChartPlugin({ name: "p" });
	const el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, plugins: [plugin] });
	await seed(el);
	assert.equal(el.renderRoot.querySelectorAll(".legend .legend-item").length, 1);
});

test("renderTable: a plugin's tableRows add a header (scope=col) and per-row cells after the core columns", async () => {
	const plugin = defineChartPlugin({
		name: "p",
		tableRows: () => [{ header: "Signal", cells: ["buy", "hold", "sell"] }],
	});
	const el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, plugins: [plugin] });
	await seed(el);
	const table = el.renderRoot.querySelector("table.sr-only");
	const headerCells = table.querySelectorAll("thead th");
	assert.equal(headerCells.length, 3, "the category column, the one series column, plus the plugin column");
	const pluginHeader = headerCells[headerCells.length - 1];
	assert.equal(pluginHeader.textContent, "Signal");
	assert.equal(pluginHeader.getAttribute("scope"), "col");
	const rows = table.querySelectorAll("tbody tr");
	assert.equal(rows.length, 3);
	["buy", "hold", "sell"].forEach((expected, i) => {
		const cells = rows[i].querySelectorAll("td");
		assert.equal(cells[cells.length - 1].textContent, expected);
	});
});

test("renderTable: two plugins each contributing tableRows both land, in plugin order", async () => {
	const p1 = defineChartPlugin({ name: "p1", tableRows: () => [{ header: "A", cells: ["a0", "a1", "a2"] }] });
	const p2 = defineChartPlugin({ name: "p2", tableRows: () => [{ header: "B", cells: ["b0", "b1", "b2"] }] });
	const el = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, plugins: [p1, p2] });
	await seed(el);
	const table = el.renderRoot.querySelector("table.sr-only");
	const headerCells = [...table.querySelectorAll("thead th")].map((th) => th.textContent);
	assert.deepEqual(headerCells.slice(-2), ["A", "B"]);
	const firstRowCells = [...table.querySelectorAll("tbody tr")[0].querySelectorAll("td")].map((td) => td.textContent);
	assert.deepEqual(firstRowCells.slice(-2), ["a0", "b0"]);
});

test("renderTable: no plugin columns when tableRows is absent (no regression)", async () => {
	const plugin = defineChartPlugin({ name: "p" });
	const off = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES });
	await seed(off);
	const on = await mount("dj-chart", { type: "line", categoryKey: "cat", data: DATA, series: SERIES, plugins: [plugin] });
	await seed(on);
	assert.equal(on.renderRoot.querySelector("table.sr-only").outerHTML, off.renderRoot.querySelector("table.sr-only").outerHTML);
});
