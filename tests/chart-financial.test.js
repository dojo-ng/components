// @dojo-ng/chart-financial: indicator math (F1), the candlestick plugin (F2), the volume pane
// plugin (F3), and the indicator overlay / crosshair / tradingDayTicks track (F4). `./setup.js`
// (happy-dom + Lit) is imported first because F2-F4's plugins pull in `@dojo-ng/chart`, which
// registers <dj-chart> and needs real HTMLElement/Lit globals — F1's own tests are pure logic and
// don't need it, but importing it is harmless for them too.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { render } from "lit";
import { scaleLinear, scaleLog, scaleBand } from "d3-scale";
import { sma, ema, bollinger, candlestickPlugin, volumePlugin, indicatorPlugin, crosshairPlugin, tradingDayTicks } from "../packages/chart-financial/dist/index.js";
import { candleMarks, barMarks, CANDLE_BODY_WIDTH_RATIO, MIN_CANDLE_BODY_HEIGHT, BAR_TICK_RATIO } from "../packages/chart-financial/dist/candlestick.js";
import { directionOf, volumeDomain, volumeMarks, VOLUME_PANE_ID, DEFAULT_VOLUME_PANE_HEIGHT, NEUTRAL_VOLUME_COLOR } from "../packages/chart-financial/dist/volume.js";
import { indicatorLinePath } from "../packages/chart-financial/dist/indicator.js";
import { nearestCategory, crosshairStateAt, renderCrosshair } from "../packages/chart-financial/dist/crosshair.js";
import { MIN_TICK_GAP_PX } from "../packages/chart-financial/dist/trading-day-ticks.js";
import { DEFAULT_UP_COLOR, DEFAULT_DOWN_COLOR } from "../packages/chart-financial/dist/shared.js";

// 30 daily closes (deliberately not a round or arithmetic progression), period 10.
const CLOSES = [
	44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
	45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64,
	46.21, 46.25, 45.71, 46.45, 45.78, 45.35, 44.03, 44.18, 44.22, 44.57,
];
const PERIOD = 10;

function smaRef(values, period) {
	const out = new Array(values.length).fill(null);
	for (let i = period - 1; i < values.length; i++) {
		const window = values.slice(i - period + 1, i + 1);
		out[i] = window.reduce((a, b) => a + b, 0) / period;
	}
	return out;
}

function emaRef(values, period) {
	const out = new Array(values.length).fill(null);
	if (values.length < period) return out;
	const k = 2 / (period + 1);
	let prev = smaRef(values, period)[period - 1];
	out[period - 1] = prev;
	for (let i = period; i < values.length; i++) {
		prev = values[i] * k + prev * (1 - k);
		out[i] = prev;
	}
	return out;
}

function bollingerRef(values, period, k = 2) {
	const mids = smaRef(values, period);
	const out = new Array(values.length).fill(null);
	for (let i = 0; i < values.length; i++) {
		const mid = mids[i];
		if (mid === null) continue;
		const window = values.slice(i - period + 1, i + 1);
		const variance = window.reduce((a, b) => a + (b - mid) ** 2, 0) / period;
		const stdev = Math.sqrt(variance);
		out[i] = { mid, upper: mid + k * stdev, lower: mid - k * stdev };
	}
	return out;
}

test("sma: leading null run is exactly period - 1, then matches the reference window average", () => {
	const out = sma(CLOSES, PERIOD);
	assert.equal(out.length, CLOSES.length);
	assert.deepEqual(out.slice(0, PERIOD - 1), new Array(PERIOD - 1).fill(null));
	assert.notEqual(out[PERIOD - 1], null);
	const expected = smaRef(CLOSES, PERIOD);
	for (let i = 0; i < out.length; i++) {
		if (expected[i] === null) assert.equal(out[i], null, `index ${i}`);
		else assert.ok(Math.abs(out[i] - expected[i]) < 1e-10, `index ${i}: ${out[i]} vs ${expected[i]}`);
	}
});

test("ema: leading null run is exactly period - 1, seeded from the SMA, matches to 10 decimal places", () => {
	const out = ema(CLOSES, PERIOD);
	assert.equal(out.length, CLOSES.length);
	assert.deepEqual(out.slice(0, PERIOD - 1), new Array(PERIOD - 1).fill(null));
	assert.ok(Math.abs(out[PERIOD - 1] - smaRef(CLOSES, PERIOD)[PERIOD - 1]) < 1e-10, "seed is the SMA");
	const expected = emaRef(CLOSES, PERIOD);
	for (let i = 0; i < out.length; i++) {
		if (expected[i] === null) assert.equal(out[i], null, `index ${i}`);
		else assert.ok(Math.abs(out[i] - expected[i]) < 1e-10, `index ${i}: ${out[i]} vs ${expected[i]}`);
	}
});

// Hand-traced exact case, worked by hand rather than by any code: k = 2/(2+1) = 2/3.
// Seed is the mean of the first 2 values: (10+20)/2 = 15.
// Next term: 30*(2/3) + 15*(1/3) = 20 + 5 = 25. Both terms land on exact integers, so this
// is checked with strict equality rather than a tolerance.
test("ema: hand-traced 3-value, period-2 case matches exactly", () => {
	assert.deepEqual(ema([10, 20, 30], 2), [null, 15, 25]);
});

test("bollinger: bands are symmetric about mid at k standard deviations, matches the reference", () => {
	const out = bollinger(CLOSES, PERIOD);
	assert.equal(out.length, CLOSES.length);
	assert.deepEqual(out.slice(0, PERIOD - 1), new Array(PERIOD - 1).fill(null));
	const expected = bollingerRef(CLOSES, PERIOD);
	for (let i = 0; i < out.length; i++) {
		if (expected[i] === null) {
			assert.equal(out[i], null, `index ${i}`);
			continue;
		}
		assert.ok(Math.abs(out[i].mid - expected[i].mid) < 1e-10, `mid ${i}`);
		assert.ok(Math.abs(out[i].upper - expected[i].upper) < 1e-10, `upper ${i}`);
		assert.ok(Math.abs(out[i].lower - expected[i].lower) < 1e-10, `lower ${i}`);
		// symmetry: the whole point of the band shape
		assert.ok(Math.abs((out[i].upper - out[i].mid) - (out[i].mid - out[i].lower)) < 1e-9, `symmetry ${i}`);
	}
});

test("bollinger: k widens the band proportionally", () => {
	const k1 = bollinger(CLOSES, PERIOD, 1);
	const k2 = bollinger(CLOSES, PERIOD, 2);
	for (let i = PERIOD - 1; i < CLOSES.length; i++) {
		const spread1 = k1[i].upper - k1[i].mid;
		const spread2 = k2[i].upper - k2[i].mid;
		assert.ok(Math.abs(spread2 - 2 * spread1) < 1e-10, `index ${i}`);
	}
});

test("period longer than the data returns all null and does not throw", () => {
	const shortValues = CLOSES.slice(0, 5);
	assert.doesNotThrow(() => {
		const s = sma(shortValues, PERIOD);
		assert.equal(s.length, shortValues.length);
		assert.deepEqual(s, new Array(shortValues.length).fill(null));
	});
	assert.doesNotThrow(() => {
		const e = ema(shortValues, PERIOD);
		assert.equal(e.length, shortValues.length);
		assert.deepEqual(e, new Array(shortValues.length).fill(null));
	});
	assert.doesNotThrow(() => {
		const b = bollinger(shortValues, PERIOD);
		assert.equal(b.length, shortValues.length);
		assert.deepEqual(b, new Array(shortValues.length).fill(null));
	});
});

// ---- F2: candlestickPlugin ----
//
// A three-row fixture with a clean, hand-computable linear y scale — domain [80, 120] over a
// [200, 0] range is exactly 5px per unit, so every pixel position below is arithmetic, not a
// guess. Row 0 is up (close > open), row 1 is a doji (close === open, the minimum-body-height
// case), row 2 is down (close < open). x/bandwidth come from a REAL `scaleBand` the fixture
// builds and hands to the plugin through `ctx.scales.xBand`/`ctx.xCenter` — those are trusted
// library values (same trust Track L placed in d3-scale directly), not re-derived by hand; what
// IS hand-computed here is the OHLC-specific geometry candleMarks/barMarks derive from them
// (body top/bottom/clamp, wick span, tick offsets).
const CATS = ["2024-01-02", "2024-01-03", "2024-01-04"];
const OHLC_ROWS = [
	{ date: "2024-01-02", o: 100, h: 110, l: 95, c: 105 }, // up
	{ date: "2024-01-03", o: 105, h: 108, l: 100, c: 105 }, // doji
	{ date: "2024-01-04", o: 105, h: 107, l: 90, c: 92 }, // down
];
const KEYS = { open: "o", high: "h", low: "l", close: "c" };

function makeCtx({ yScale, data = OHLC_ROWS, cats = CATS } = {}) {
	const xBand = scaleBand().domain(cats).range([0, 300]).padding(0.2);
	const y = yScale ?? scaleLinear().domain([80, 120]).range([200, 0]);
	const scales = { x: xBand, xBand, y, yRight: undefined, cats, band: true };
	return {
		host: {},
		data,
		series: [],
		categoryKey: "date",
		scales,
		inner: { width: 300, height: 200 },
		locale: "en-US",
		format: (v) => String(v),
		xCenter: (c) => (xBand(c) ?? 0) + xBand.bandwidth() / 2,
		paneScale: () => undefined,
		refresh: () => {},
	};
}

test("candleMarks: up candle body spans open-to-close, wick spans low-to-high", () => {
	const ctx = makeCtx();
	const marks = candleMarks(ctx, KEYS, "UP", "DOWN");
	const m = marks[0]; // open 100 -> y=100, close 105 -> y=75, high 110 -> y=50, low 95 -> y=125
	assert.equal(m.bodyY, 75);
	assert.equal(m.bodyHeight, 25);
	assert.equal(m.wickY1, 50);
	assert.equal(m.wickY2, 125);
	assert.equal(m.up, true);
	assert.equal(m.fill, "UP");
	assert.equal(m.bodyWidth, ctx.scales.xBand.bandwidth() * CANDLE_BODY_WIDTH_RATIO);
	assert.equal(m.x, ctx.xCenter("2024-01-02"));
	assert.equal(m.bodyX, m.x - m.bodyWidth / 2);
});

test("candleMarks: a doji (open === close) gets a visible minimum-height body, not a zero-height rect", () => {
	const ctx = makeCtx();
	const marks = candleMarks(ctx, KEYS, "UP", "DOWN");
	const m = marks[1]; // open 105 -> y=75, close 105 -> y=75 (same pixel)
	assert.equal(m.bodyHeight, MIN_CANDLE_BODY_HEIGHT);
	assert.ok(m.bodyHeight > 0, "a doji body must not disappear");
	assert.equal(m.bodyY, 75 - MIN_CANDLE_BODY_HEIGHT / 2);
	assert.ok(Math.abs(m.wickY1 - 60) < 1e-9); // high 108 (float: scaleLinear's own arithmetic, not exactly 60)
	assert.equal(m.wickY2, 100); // low 100
});

test("candleMarks: down candle gets the down fill, distinct from the up fill", () => {
	const ctx = makeCtx();
	const marks = candleMarks(ctx, KEYS, "UP", "DOWN");
	const m = marks[2]; // open 105 -> y=75, close 92 -> y=140, high 107 -> y=65, low 90 -> y=150
	assert.equal(m.bodyY, 75);
	assert.equal(m.bodyHeight, 65);
	assert.ok(Math.abs(m.wickY1 - 65) < 1e-9); // float: scaleLinear's own arithmetic, not exactly 65
	assert.equal(m.wickY2, 150);
	assert.equal(m.up, false);
	assert.equal(m.fill, "DOWN");
	assert.notEqual(m.fill, marks[0].fill, "up and down candles must get different fills");
});

test("barMarks: stem spans low-to-high, open tick left of center, close tick right of center", () => {
	const ctx = makeCtx();
	const marks = barMarks(ctx, KEYS, "UP", "DOWN");
	const m = marks[0];
	const tick = ctx.scales.xBand.bandwidth() * BAR_TICK_RATIO;
	assert.equal(m.y1, 50); // high
	assert.equal(m.y2, 125); // low
	assert.equal(m.openX1, m.x - tick);
	assert.equal(m.openX2, m.x);
	assert.equal(m.openY, 100);
	assert.equal(m.closeX1, m.x);
	assert.equal(m.closeX2, m.x + tick);
	assert.equal(m.closeY, 75);
	assert.equal(m.fill, "UP");
});

test("candleMarks: with y-scale=\"log\", positions match an independently-built scaleLog over the same domain", () => {
	const logScale = scaleLog().domain([80, 120]).range([200, 0]);
	const ctx = makeCtx({ yScale: logScale });
	const marks = candleMarks(ctx, KEYS, "UP", "DOWN");
	// Independent oracle: a SEPARATE scaleLog instance over the same domain/range, not the same
	// object reference the plugin was given — this is what actually proves the plugin reads
	// whatever scale it's handed rather than assuming linear math (Track L's own convention:
	// "position-matching against a hand-built scaleLog").
	const oracle = scaleLog().domain([80, 120]).range([200, 0]);
	for (const [i, row] of OHLC_ROWS.entries()) {
		const m = marks[i];
		assert.ok(Math.abs(m.wickY1 - oracle(row.h)) < 1e-9, `row ${i} high`);
		assert.ok(Math.abs(m.wickY2 - oracle(row.l)) < 1e-9, `row ${i} low`);
		const expectedTop = Math.min(oracle(row.o), oracle(row.c));
		const expectedBottom = Math.max(oracle(row.o), oracle(row.c));
		const expectedHeight = Math.max(expectedBottom - expectedTop, MIN_CANDLE_BODY_HEIGHT);
		assert.ok(Math.abs(m.bodyHeight - expectedHeight) < 1e-9, `row ${i} body height`);
	}
	// Log math genuinely differs from linear here — confirm the two don't coincidentally agree,
	// so this test can't false-pass by exercising code that ignores the scale it was given.
	const linearCtx = makeCtx();
	assert.notEqual(marks[0].wickY1, candleMarks(linearCtx, KEYS, "UP", "DOWN")[0].wickY1);
});

test("candlestickPlugin.domain: reaches the min low and max high across the rendered rows", () => {
	const plugin = candlestickPlugin({ ...KEYS });
	const ctx = makeCtx();
	assert.deepEqual(plugin.domain(ctx), [90, 110]);
});

test("candlestickPlugin.renderTooltip: O/H/L/C and the change, for a known category; undefined for an unknown one", () => {
	const plugin = candlestickPlugin({ ...KEYS });
	const ctx = makeCtx();
	const body = plugin.renderTooltip("2024-01-02", ctx);
	assert.notEqual(body, undefined);
	const div = document.createElement("div");
	render(body, div);
	const text = div.textContent;
	assert.match(text, /100/); // open
	assert.match(text, /110/); // high
	assert.match(text, /95/); // low
	assert.match(text, /105/); // close
	assert.match(text, /\+5/); // change: close(105) - open(100)
	assert.equal(plugin.renderTooltip("not-a-real-date", ctx), undefined);
});

test("candlestickPlugin.legendItems: up and down entries with distinct colors", () => {
	const plugin = candlestickPlugin({ ...KEYS, upColor: "UP", downColor: "DOWN", label: "AAPL" });
	const items = plugin.legendItems(makeCtx());
	assert.equal(items.length, 2);
	assert.notEqual(items[0].color, items[1].color);
	assert.ok(items.every((it) => it.label.includes("AAPL")));
});

test("candlestickPlugin.tableRows: four columns, one cell per rendered row, values in row order", () => {
	const plugin = candlestickPlugin({ ...KEYS });
	const rows = plugin.tableRows(makeCtx());
	assert.equal(rows.length, 4);
	const byHeaderSuffix = (suffix) => rows.find((r) => r.header.endsWith(suffix));
	assert.deepEqual(byHeaderSuffix("Open").cells, ["100", "105", "105"]);
	assert.deepEqual(byHeaderSuffix("High").cells, ["110", "108", "107"]);
	assert.deepEqual(byHeaderSuffix("Low").cells, ["95", "100", "90"]);
	assert.deepEqual(byHeaderSuffix("Close").cells, ["105", "105", "92"]);
	for (const row of rows) assert.equal(row.cells.length, OHLC_ROWS.length);
});

test("candlestickPlugin.renderUnder: candle style renders one wick + one body per row, wired to the same geometry candleMarks computes", () => {
	const plugin = candlestickPlugin({ ...KEYS, upColor: "UP", downColor: "DOWN" });
	const ctx = makeCtx();
	const div = document.createElement("div");
	render(plugin.renderUnder(ctx), div);
	const wicks = [...div.querySelectorAll(".candle-wick")];
	const bodies = [...div.querySelectorAll(".candle-body")];
	assert.equal(wicks.length, OHLC_ROWS.length);
	assert.equal(bodies.length, OHLC_ROWS.length);
	const expected = candleMarks(ctx, KEYS, "UP", "DOWN");
	bodies.forEach((el, i) => {
		assert.equal(Number(el.getAttribute("y")), expected[i].bodyY);
		assert.equal(Number(el.getAttribute("height")), expected[i].bodyHeight);
		assert.equal(el.getAttribute("fill"), expected[i].fill);
	});
});

test("candlestickPlugin.renderUnder: style \"bar\" renders OHLC bars instead of candles", () => {
	const plugin = candlestickPlugin({ ...KEYS, style: "bar" });
	const ctx = makeCtx();
	const div = document.createElement("div");
	render(plugin.renderUnder(ctx), div);
	assert.equal(div.querySelectorAll(".candle-body").length, 0);
	assert.equal(div.querySelectorAll(".ohlc-bar").length, OHLC_ROWS.length);
	assert.equal(div.querySelectorAll(".ohlc-open").length, OHLC_ROWS.length);
	assert.equal(div.querySelectorAll(".ohlc-close").length, OHLC_ROWS.length);
});

test("candlestickPlugin: name is stable and the plugin is a valid ChartPlugin shape", () => {
	const plugin = candlestickPlugin({ ...KEYS });
	assert.equal(plugin.name, "candlestick");
	assert.equal(typeof plugin.renderUnder, "function");
	assert.equal(typeof plugin.domain, "function");
	assert.equal(typeof plugin.renderTooltip, "function");
	assert.equal(typeof plugin.legendItems, "function");
	assert.equal(typeof plugin.tableRows, "function");
});

// ---- F3: volumePlugin ----
//
// Rows carry a volume key ("vol") plus, for the direction-coloring cases, conventional "open"/
// "close" fields — the same two literal keys `directionOf` (volume.ts) reads regardless of what
// key names a co-installed candlestickPlugin was actually configured with (decision, F3: read the
// rendered data, don't ask the other plugin). `resolvePanes` reproduces the two-phase construction
// `dj-chart.ts`'s own `buildPluginLayer` does — call `panes(layoutCtx)` first, THEN build the real
// `paneScale` map and hand the plugin its resolved `ChartContext` — because that two-phase contract
// (documented on `ChartPane`/`ChartContext` in plugin.ts) is what a plugin is actually promised,
// not an implementation detail of this one plugin.
const VOL_CATS = ["2024-01-02", "2024-01-03", "2024-01-04"];
const VOL_ROWS = [
	{ date: "2024-01-02", open: 100, close: 105, vol: 1000 }, // up
	{ date: "2024-01-03", open: 105, close: 105, vol: 500 }, // tie -> up (close >= open)
	{ date: "2024-01-04", open: 105, close: 92, vol: 1500 }, // down
];
const VOL_ONLY_ROWS = VOL_ROWS.map(({ date, vol }) => ({ date, vol })); // no open/close at all

function makeVolumeCtx(data = VOL_ROWS, cats = VOL_CATS) {
	const xBand = scaleBand().domain(cats).range([0, 300]).padding(0.2);
	const y = scaleLinear().domain([80, 120]).range([200, 0]);
	const scales = { x: xBand, xBand, y, yRight: undefined, cats, band: true };
	return {
		host: {},
		data,
		series: [],
		categoryKey: "date",
		scales,
		inner: { width: 300, height: 200 },
		locale: "en-US",
		format: (v) => String(v),
		xCenter: (c) => (xBand(c) ?? 0) + xBand.bandwidth() / 2,
		paneScale: () => undefined,
		refresh: () => {},
	};
}

/** Mirrors `buildPluginLayer`'s own two-phase resolution: `panes()` first (against a `paneScale`
 * that resolves nothing yet), then a real `paneScale` map built from what came back. */
function resolvePanes(plugin, layoutCtx) {
	const panes = plugin.panes(layoutCtx);
	const paneScales = new Map(panes.map((p) => [p.id, scaleLinear().domain(p.domain).range([p.height, 0])]));
	return { panes, ctx: { ...layoutCtx, paneScale: (id) => paneScales.get(id) } };
}

test("directionOf: up, down, a tie resolves up, and neutral when open/close aren't both present", () => {
	assert.equal(directionOf({ open: 100, close: 105 }), "up");
	assert.equal(directionOf({ open: 105, close: 92 }), "down");
	assert.equal(directionOf({ open: 100, close: 100 }), "up");
	assert.equal(directionOf({}), "neutral");
	assert.equal(directionOf({ open: 100 }), "neutral");
});

test("volumeDomain: [0, max] over the rendered rows; falls back to [0, 1] rather than a degenerate [0, 0]", () => {
	assert.deepEqual(volumeDomain(makeVolumeCtx(), "vol"), [0, 1500]);
	assert.deepEqual(volumeDomain(makeVolumeCtx([]), "vol"), [0, 1]);
	assert.deepEqual(volumeDomain(makeVolumeCtx([{ date: "x", vol: NaN }]), "vol"), [0, 1]);
});

test("volumePlugin.panes: one pane at the requested height and label, domain [0, max volume]", () => {
	const plugin = volumePlugin({ key: "vol", height: 80, label: "Vol" });
	const panes = plugin.panes(makeVolumeCtx());
	assert.equal(panes.length, 1);
	assert.equal(panes[0].id, VOLUME_PANE_ID);
	assert.equal(panes[0].height, 80);
	assert.deepEqual(panes[0].domain, [0, 1500]);
	assert.equal(panes[0].label, "Vol");
});

test("volumePlugin.panes: defaults height and label when not given", () => {
	const panes = volumePlugin({ key: "vol" }).panes(makeVolumeCtx());
	assert.equal(panes[0].height, DEFAULT_VOLUME_PANE_HEIGHT);
	assert.equal(panes[0].label, "Volume");
});

test("volumeMarks: bars baseline at the pane floor, x identical to the price chart's xCenter for every category", () => {
	const plugin = volumePlugin({ key: "vol", height: 80 });
	const { panes, ctx } = resolvePanes(plugin, makeVolumeCtx());
	const marks = volumeMarks(ctx, panes[0].id, "vol");
	assert.equal(marks.length, VOL_ROWS.length);
	marks.forEach((m, i) => {
		assert.ok(Math.abs(m.y + m.height - 80) < 1e-9, `row ${i} baseline`); // pane floor = pane height
		assert.ok(Math.abs(m.x + m.width / 2 - ctx.xCenter(VOL_CATS[i])) < 1e-9, `row ${i} x center`);
	});
});

test("volumeMarks: colored by the day's direction when open/close are present on the row", () => {
	const plugin = volumePlugin({ key: "vol" });
	const { panes, ctx } = resolvePanes(plugin, makeVolumeCtx());
	const marks = volumeMarks(ctx, panes[0].id, "vol");
	assert.equal(marks[0].fill, DEFAULT_UP_COLOR);
	assert.equal(marks[1].fill, DEFAULT_UP_COLOR); // tie -> up
	assert.equal(marks[2].fill, DEFAULT_DOWN_COLOR);
});

test("volumeMarks: neutral and no throw when there is no candlestick data to read a direction from", () => {
	assert.doesNotThrow(() => {
		const plugin = volumePlugin({ key: "vol" });
		const { panes, ctx } = resolvePanes(plugin, makeVolumeCtx(VOL_ONLY_ROWS));
		const marks = volumeMarks(ctx, panes[0].id, "vol");
		assert.equal(marks.length, VOL_ONLY_ROWS.length);
		for (const m of marks) assert.equal(m.fill, NEUTRAL_VOLUME_COLOR);
	});
});

test("volumePlugin.tableRows: adds one volume column, formatted, one cell per rendered row", () => {
	const plugin = volumePlugin({ key: "vol", label: "Vol" });
	const rows = plugin.tableRows(makeVolumeCtx());
	assert.equal(rows.length, 1);
	assert.equal(rows[0].header, "Vol");
	assert.deepEqual(rows[0].cells, ["1000", "500", "1500"]);
});

test("volumePlugin.legendItems: one entry named after the pane", () => {
	const items = volumePlugin({ key: "vol", label: "Vol" }).legendItems(makeVolumeCtx());
	assert.equal(items.length, 1);
	assert.equal(items[0].label, "Vol");
});

test("volumePlugin.renderPane: one bar per row, wired to the same geometry volumeMarks computes", () => {
	const plugin = volumePlugin({ key: "vol", height: 80 });
	const { panes, ctx } = resolvePanes(plugin, makeVolumeCtx());
	const div = document.createElement("div");
	render(plugin.renderPane(panes[0], ctx), div);
	const bars = [...div.querySelectorAll(".volume-bar")];
	assert.equal(bars.length, VOL_ROWS.length);
	const expected = volumeMarks(ctx, panes[0].id, "vol");
	bars.forEach((el, i) => {
		assert.ok(Math.abs(Number(el.getAttribute("y")) - expected[i].y) < 1e-9);
		assert.ok(Math.abs(Number(el.getAttribute("height")) - expected[i].height) < 1e-9);
		assert.equal(el.getAttribute("fill"), expected[i].fill);
	});
});

test("volumePlugin: name is stable and the plugin is a valid ChartPlugin shape", () => {
	const plugin = volumePlugin({ key: "vol" });
	assert.equal(plugin.name, "volume");
	assert.equal(typeof plugin.panes, "function");
	assert.equal(typeof plugin.renderPane, "function");
	assert.equal(typeof plugin.legendItems, "function");
	assert.equal(typeof plugin.tableRows, "function");
});

// ---- F4: indicatorPlugin ----
//
// 50 rows, category "c0".."c49", value = index+1 (1..50) — clean, hand-computable numbers under a
// y scale with 4px/unit (domain [0,50], range [200,0], no .nice()). sma(values, 20)[19] is the
// mean of 1..20 = 10.5, so the first plotted y is exactly 200 - 10.5*4 = 158 — the literal number
// the spec's own Verify text asks for ("its first plotted y matches sma()[19] through the scale").
const IND_CATS = Array.from({ length: 50 }, (_, i) => `c${i}`);
const IND_ROWS = IND_CATS.map((date, i) => ({ date, c: i + 1 }));

function makeIndicatorCtx(data = IND_ROWS, cats = IND_CATS) {
	const xBand = scaleBand().domain(cats).range([0, 1000]).padding(0.2);
	const y = scaleLinear().domain([0, 50]).range([200, 0]);
	const scales = { x: xBand, xBand, y, yRight: undefined, cats, band: true };
	return {
		host: {},
		data,
		series: [],
		categoryKey: "date",
		scales,
		inner: { width: 1000, height: 200 },
		locale: "en-US",
		format: (v) => String(v),
		xCenter: (c) => (xBand(c) ?? 0) + xBand.bandwidth() / 2,
		paneScale: () => undefined,
		refresh: () => {},
	};
}

function firstMoveTo(d) {
	const m = /^M([\d.-]+),([\d.-]+)/.exec(d);
	assert.ok(m, `no M command in "${d}"`);
	return { x: Number(m[1]), y: Number(m[2]) };
}

test("indicatorLinePath: sma(period 20) over 50 rows starts at the 20th category, first y matches sma()[19] through the scale", () => {
	const ctx = makeIndicatorCtx();
	const values = sma(IND_ROWS.map((r) => r.c), 20);
	const d = indicatorLinePath(ctx, values);
	const first = firstMoveTo(d);
	// d3-path rounds path-string coordinates to a few decimal places, so a path-derived number is
	// compared with a wider (but still tight) tolerance than the exact-arithmetic checks elsewhere.
	assert.ok(Math.abs(first.x - ctx.xCenter("c19")) < 1e-2);
	assert.ok(Math.abs(first.y - ctx.scales.y(values[19])) < 1e-2);
	assert.equal(values[19], 10.5); // mean(1..20) — the literal number, not just "some value"
	assert.equal((d.match(/M/g) || []).length, 1, "no internal gap once the window has filled");
});

test("indicatorLinePath: a null position breaks the path rather than dropping to zero", () => {
	const shortCtx = makeIndicatorCtx(IND_ROWS.slice(0, 3), IND_CATS.slice(0, 3));
	const values = [10, null, 30];
	const d = indicatorLinePath(shortCtx, values);
	assert.equal((d.match(/M/g) || []).length, 2, "one M per contiguous run either side of the null");
	assert.ok(Math.abs(firstMoveTo(d).y - shortCtx.scales.y(10)) < 1e-2, "first point at value 10's real y, not 0's");
});

test("indicatorPlugin: kind \"sma\" — domain, legendItems, tableRows use the em dash for the not-yet-filled run", () => {
	const plugin = indicatorPlugin({ key: "c", kind: "sma", period: 20, color: "PURPLE", label: "SMA20" });
	const ctx = makeIndicatorCtx();
	assert.deepEqual(plugin.domain(ctx), [10.5, 40.5]); // sma(1..50,20): min at [19]=mean(1..20)=10.5, max at [49]=mean(31..50)=40.5
	const items = plugin.legendItems(ctx);
	assert.deepEqual(items, [{ label: "SMA20", color: "PURPLE" }]);
	const rows = plugin.tableRows(ctx);
	assert.equal(rows.length, 1);
	assert.equal(rows[0].header, "SMA20");
	assert.equal(rows[0].cells[0], "—");
	assert.equal(rows[0].cells[18], "—");
	assert.equal(rows[0].cells[19], "10.5");
	assert.equal(rows[0].cells[49], "40.5");
});

test("indicatorPlugin: default label is derived from kind and period when not given", () => {
	const plugin = indicatorPlugin({ key: "c", kind: "ema", period: 12 });
	assert.equal(plugin.legendItems(makeIndicatorCtx())[0].label, "EMA(12)");
});

test("indicatorPlugin: kind \"bollinger\" draws three lines (mid solid, bands dashed) and three table columns", () => {
	const plugin = indicatorPlugin({ key: "c", kind: "bollinger", period: 20, label: "BB" });
	const ctx = makeIndicatorCtx();
	const rows = plugin.tableRows(ctx);
	assert.deepEqual(rows.map((r) => r.header), ["BB Mid", "BB Upper", "BB Lower"]);
	// Bollinger over a perfectly linear 1..50 run: stdev is constant once the window fills, so
	// upper-mid and mid-lower are equal and constant past index 19 — an independent check that
	// doesn't just re-call bollinger() to get its own answer.
	const mid = Number(rows[0].cells[19]);
	const upper = Number(rows[1].cells[19]);
	const lower = Number(rows[2].cells[19]);
	assert.ok(Math.abs(upper - mid - (mid - lower)) < 1e-9, "band symmetric about mid");
	assert.ok(upper > mid && mid > lower);

	const div = document.createElement("div");
	render(plugin.renderOver(ctx), div);
	const lines = [...div.querySelectorAll(".indicator-line")];
	assert.equal(lines.length, 3);
	assert.equal(lines.filter((l) => l.classList.contains("indicator-line--band")).length, 2);
	assert.equal(lines.filter((l) => !l.classList.contains("indicator-line--band")).length, 1);
});

test("indicatorPlugin.renderOver: sma renders one <path> wired to the same d indicatorLinePath computes", () => {
	const plugin = indicatorPlugin({ key: "c", kind: "sma", period: 20 });
	const ctx = makeIndicatorCtx();
	const div = document.createElement("div");
	render(plugin.renderOver(ctx), div);
	const paths = [...div.querySelectorAll(".indicator-line")];
	assert.equal(paths.length, 1);
	assert.equal(paths[0].getAttribute("d"), indicatorLinePath(ctx, sma(IND_ROWS.map((r) => r.c), 20)));
	assert.equal(paths[0].getAttribute("aria-hidden"), null); // aria-hidden is on the wrapping <g>, not the path
	assert.equal(div.querySelector('g[part="indicator"]').getAttribute("aria-hidden"), "true");
});

test("indicatorPlugin: name is stable and the plugin is a valid ChartPlugin shape", () => {
	const plugin = indicatorPlugin({ key: "c", kind: "sma", period: 20 });
	assert.equal(plugin.name, "indicator");
	assert.equal(typeof plugin.domain, "function");
	assert.equal(typeof plugin.renderOver, "function");
	assert.equal(typeof plugin.legendItems, "function");
	assert.equal(typeof plugin.tableRows, "function");
});

// ---- F4: tradingDayTicks ----
//
// 706 daily dates spanning "2024-01-15" through "2025-12-20" — deliberately NOT starting or
// ending on a month/quarter boundary, so the "first and last category always present" rule is
// actually exercised for the LAST category (the first is always structurally present anyway: the
// earliest date in the array is trivially the earliest date in its own month, so it's always the
// first "boundary" found — worth knowing, since it means this rule is only non-trivial for the
// last category, not symmetric the way the spec text reads). Month/quarter boundaries and the
// 800px/200px expectations below were computed independently (a standalone Node script grouping by
// UTC year/month), not by calling `tradingDayTicks` itself.
function dailyRange(startStr, endStr) {
	const out = [];
	let d = new Date(`${startStr}T00:00:00Z`);
	const end = new Date(`${endStr}T00:00:00Z`);
	while (d <= end) {
		out.push(d.toISOString().slice(0, 10));
		d = new Date(d.getTime() + 86400000);
	}
	return out;
}
const TWO_YEAR_CATS = dailyRange("2024-01-15", "2025-12-20");
const EXPECTED_MONTH_STARTS = [
	"2024-01-15", "2024-02-01", "2024-03-01", "2024-04-01", "2024-05-01", "2024-06-01",
	"2024-07-01", "2024-08-01", "2024-09-01", "2024-10-01", "2024-11-01", "2024-12-01",
	"2025-01-01", "2025-02-01", "2025-03-01", "2025-04-01", "2025-05-01", "2025-06-01",
	"2025-07-01", "2025-08-01", "2025-09-01", "2025-10-01", "2025-11-01", "2025-12-01",
	"2025-12-20", // last category, appended — not itself a month start
];
const EXPECTED_QUARTER_STARTS = [
	"2024-01-15", "2024-04-01", "2024-07-01", "2024-10-01",
	"2025-01-01", "2025-04-01", "2025-07-01", "2025-10-01",
	"2025-12-20", // last category, appended — not itself a quarter start
];

test("tradingDayTicks: 800px over two years of daily dates returns month starts", () => {
	assert.deepEqual(tradingDayTicks(TWO_YEAR_CATS, 800, "en-US"), EXPECTED_MONTH_STARTS);
});

test("tradingDayTicks: 200px over the same range falls back to quarter starts", () => {
	assert.deepEqual(tradingDayTicks(TWO_YEAR_CATS, 200, "en-US"), EXPECTED_QUARTER_STARTS);
});

test("tradingDayTicks: the first and last category are always present, even off-boundary", () => {
	const kept = tradingDayTicks(TWO_YEAR_CATS, 800, "en-US");
	assert.equal(kept[0], TWO_YEAR_CATS[0]);
	assert.equal(kept[kept.length - 1], TWO_YEAR_CATS[TWO_YEAR_CATS.length - 1]);
});

test("tradingDayTicks: output stays in chronological order and has no duplicates", () => {
	const kept = tradingDayTicks(TWO_YEAR_CATS, 800, "en-US");
	const sorted = [...kept].sort();
	assert.deepEqual(kept, sorted);
	assert.equal(new Set(kept).size, kept.length);
});

test("tradingDayTicks: two or fewer categories returns them all, unthinned", () => {
	assert.deepEqual(tradingDayTicks([], 800, "en-US"), []);
	assert.deepEqual(tradingDayTicks(["2024-01-01"], 800, "en-US"), ["2024-01-01"]);
	assert.deepEqual(tradingDayTicks(["2024-01-01", "2024-06-01"], 10, "en-US"), ["2024-01-01", "2024-06-01"]);
});

test("MIN_TICK_GAP_PX matches the exact threshold the 800px/200px split above depends on", () => {
	// Documents WHY 800px picks months and 200px picks quarters, rather than leaving it as two
	// numbers that happen to work: 24 months over 706 days has a 34.8px gap at 800px (clears 24)
	// and an 8.7px gap at 200px (doesn't) — asserted against the real constant, not a copy of it.
	assert.equal(MIN_TICK_GAP_PX, 24);
	const monthGapAt800 = 800 / (EXPECTED_MONTH_STARTS.length - 2); // -1 for gaps, -1 for the appended last
	const monthGapAt200 = 200 / (EXPECTED_MONTH_STARTS.length - 2);
	assert.ok(monthGapAt800 >= MIN_TICK_GAP_PX);
	assert.ok(monthGapAt200 < MIN_TICK_GAP_PX);
});

// ---- F4: crosshairPlugin ----
//
// Reuses the OHLC/candlestick fixture shape (CATS/OHLC_ROWS) from the F2 section above — the
// crosshair itself doesn't care whether the chart is a candlestick, it only reads
// `ctx.scales`/`ctx.xCenter`.
test("nearestCategory: picks the category whose xCenter is closest to x", () => {
	const ctx = makeCtx();
	const c0 = ctx.xCenter("2024-01-02");
	const c1 = ctx.xCenter("2024-01-03");
	assert.equal(nearestCategory(ctx, c0), "2024-01-02");
	assert.equal(nearestCategory(ctx, c0 + 1), "2024-01-02");
	assert.equal(nearestCategory(ctx, (c0 + c1) / 2 + 1), "2024-01-03");
});

test("crosshairStateAt: unsnapped x follows the raw pointer, snapped x jumps to the category center", () => {
	const ctx = makeCtx();
	const rawX = ctx.xCenter("2024-01-02") + 5;
	const unsnapped = crosshairStateAt(ctx, rawX, 100, false);
	const snapped = crosshairStateAt(ctx, rawX, 100, true);
	assert.equal(unsnapped.x, rawX);
	assert.equal(unsnapped.category, "2024-01-02");
	assert.equal(snapped.x, ctx.xCenter("2024-01-02"));
	assert.equal(snapped.category, "2024-01-02");
});

test("crosshairStateAt: value is the y scale's own invert of the pointer y, always (snap or not)", () => {
	const ctx = makeCtx(); // domain [80,120], range [200,0]: y=100 -> value 100
	const state = crosshairStateAt(ctx, ctx.xCenter("2024-01-02"), 100, false);
	assert.ok(Math.abs(state.value - 100) < 1e-9);
	assert.ok(Math.abs(state.value - ctx.scales.y.invert(100)) < 1e-9);
});

test("renderCrosshair: null state renders nothing", () => {
	const ctx = makeCtx();
	const div = document.createElement("div");
	render(renderCrosshair(ctx, null, "COLOR"), div);
	assert.equal(div.querySelectorAll(".crosshair-line").length, 0);
});

test("renderCrosshair: draws two guide lines at the state's x/y and two labels with the category/formatted value", () => {
	const ctx = makeCtx();
	const state = crosshairStateAt(ctx, ctx.xCenter("2024-01-03"), 75, false);
	const div = document.createElement("div");
	render(renderCrosshair(ctx, state, "COLOR"), div);
	const lines = [...div.querySelectorAll(".crosshair-line")];
	assert.equal(lines.length, 2);
	assert.equal(Number(lines[0].getAttribute("x1")), state.x);
	assert.equal(Number(lines[0].getAttribute("x2")), state.x);
	assert.equal(Number(lines[1].getAttribute("y1")), state.y);
	assert.equal(Number(lines[1].getAttribute("y2")), state.y);
	const labels = [...div.querySelectorAll(".crosshair-label")];
	assert.equal(labels.length, 2);
	assert.equal(labels[0].textContent, "2024-01-03");
	assert.equal(labels[1].textContent, ctx.format(state.value));
	assert.equal(div.querySelector('g[part="crosshair"]').getAttribute("aria-hidden"), "true");
});

/** happy-dom reports 0 for every element's real layout size, and dj-chart's plot only renders
 * once it has a measured (nonzero) size — the same `seed()` helper `chart-plugins.test.js` uses
 * to get past that gate under happy-dom. */
function seedSize(el, w = 400, h = 240) {
	el.w = w;
	el.h = h;
	el.requestUpdate();
	return settled(el);
}

test("crosshairPlugin: appears on pointer move and clears on leave (mechanism check — happy-dom's getScreenCTM is the identity matrix, so this confirms the wiring fires and cleans up, not pixel-accurate placement; that's confirmed in the real-browser suite)", async () => {
	const plugin = crosshairPlugin();
	const el = await mount("dj-chart", {
		type: "line",
		data: [
			{ date: "2024-01-01", v: 10 },
			{ date: "2024-01-02", v: 20 },
		],
		series: [{ key: "v" }],
		categoryKey: "date",
		plugins: [plugin],
	});
	await seedSize(el);
	assert.equal(el.renderRoot.querySelectorAll(".crosshair-line").length, 0);
	el.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, bubbles: true, composed: true, clientX: 50, clientY: 50 }));
	await settled(el);
	assert.equal(el.renderRoot.querySelectorAll(".crosshair-line").length, 2);
	el.dispatchEvent(new PointerEvent("pointerleave", { pointerId: 1, bubbles: true, composed: true, clientX: 50, clientY: 50 }));
	await settled(el);
	assert.equal(el.renderRoot.querySelectorAll(".crosshair-line").length, 0);
	el.remove();
});

test("crosshairPlugin: setup's disposer removes both listeners (no leak when plugins change)", async () => {
	const plugin = crosshairPlugin();
	const el = await mount("dj-chart", {
		type: "line",
		data: [{ date: "2024-01-01", v: 10 }],
		series: [{ key: "v" }],
		categoryKey: "date",
		plugins: [plugin],
	});
	await seedSize(el);
	el.plugins = []; // reference change -> syncPluginSetups disposes the old plugin's setup
	await settled(el);
	el.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, bubbles: true, composed: true, clientX: 50, clientY: 50 }));
	await settled(el);
	assert.equal(el.renderRoot.querySelectorAll(".crosshair-line").length, 0, "disposed plugin must not still react to pointer events");
	el.remove();
});

test("crosshairPlugin: name is stable and the plugin is a valid ChartPlugin shape", () => {
	const plugin = crosshairPlugin();
	assert.equal(plugin.name, "crosshair");
	assert.equal(typeof plugin.setup, "function");
	assert.equal(typeof plugin.renderOver, "function");
	assert.equal(plugin.legendItems, undefined, "an interaction aid, not a data-drawing plugin (decision 13 doesn't apply)");
	assert.equal(plugin.tableRows, undefined);
});
