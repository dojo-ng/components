// @dojo-ng/chart-financial, in a real browser (F5): axe in light, dark, and forced-colors on a
// chart combining candles + a volume pane + an indicator overlay with y-scale="log"; under
// forced-colors, up and down candles are distinguished by an attribute (shape/fill pattern), not
// by computed color, which forced-colors flattens to a small system palette regardless of what
// --dj-chart-up/--dj-chart-down resolve to; and the chart's accessible name.
//
// `emulateMedia` (@web/test-runner-commands, bridged by `emulateMediaPlugin` registered in
// web-test-runner.config.mjs) drives colorScheme/forcedColors through a real Playwright page —
// none of this can run under happy-dom, which is why it's here and not in chart-financial.test.js.
import { emulateMedia } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/chart/dist/index.js";
import { candlestickPlugin, volumePlugin, indicatorPlugin, crosshairPlugin } from "../../packages/chart-financial/dist/index.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// theme.css is what actually gives --dj-chart-up/--dj-chart-down/--dj-chart-crosshair real
// light/dark/high-contrast values (F5) — no browser test in this workspace loads it by default,
// so it's added once here rather than relying on a fallback hex to stand in for real theming.
if (!document.querySelector('link[href="/packages/theme/theme.css"]')) {
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = "/packages/theme/theme.css";
	document.head.appendChild(link);
	// theme.css only defines the tokens; a real app paints its own body with them (see
	// playground/index.html's own `body { background: var(--dj-color-background); color:
	// var(--dj-color-text); }`). Without this the page background stays the browser's plain
	// white regardless of theme, so dark mode's light text renders on a white page — a genuine
	// contrast failure, but one belonging to this fixture, not to dj-chart or chart-financial.
	const style = document.createElement("style");
	style.textContent = "body { background: var(--dj-color-background); color: var(--dj-color-text); }";
	document.head.appendChild(style);
}

// 60 rows of daily OHLCV, deterministic (no Math.random — reproducible failures). Strictly
// alternating +3/-2 guarantees both an up day (close >= open) and a down day (close < open) exist
// in the fixture, rather than leaving that to chance.
function ohlcvFixture(n = 60) {
	const rows = [];
	const start = Date.UTC(2024, 0, 2); // 2024-01-02
	let price = 150;
	for (let i = 0; i < n; i++) {
		const date = new Date(start + i * 86400000).toISOString().slice(0, 10);
		const open = price;
		const close = i % 2 === 0 ? open + 3 : open - 2;
		const high = Math.max(open, close) + 2;
		const low = Math.min(open, close) - 2;
		const volume = 1000 + (i % 6) * 150;
		rows.push({ date, open, high, low, close, volume });
		price = close;
	}
	return rows;
}
const DATA = ohlcvFixture();
const FIRST_DATE = DATA[0].date;
const LAST_DATE = DATA[DATA.length - 1].date;

function financialChart(props) {
	return make("dj-chart", {
		type: "line", // routes to the cartesian-vertical path; irrelevant otherwise with series: []
		categoryKey: "date",
		series: [],
		data: DATA,
		yScale: "log",
		label: `Candlestick chart, ${FIRST_DATE} to ${LAST_DATE}`,
		plugins: [
			candlestickPlugin({ open: "open", high: "high", low: "low", close: "close" }),
			volumePlugin({ key: "volume" }),
			indicatorPlugin({ key: "close", kind: "sma", period: 10 }),
		],
		...props,
	});
}

async function settleChart(el) {
	await el.updateComplete;
	await wait(60);
	await settleFrames();
}

describe("@dojo-ng/chart-financial", () => {
	afterEach(async () => {
		cleanup();
		await emulateMedia({ colorScheme: "light", forcedColors: "none" });
	});

	it("renders candles, a volume pane, and an indicator overlay together", async () => {
		const el = await mount(financialChart({}));
		await settleChart(el);
		assert(el.shadowRoot.querySelector(".candle-body"), "candlestick body renders");
		assert(el.shadowRoot.querySelector(".volume-bar"), "volume bar renders");
		assert(el.shadowRoot.querySelector(".indicator-line"), "indicator line renders");
	});

	// Found and fixed alongside the `ready` gate above: `showLegend` was ALSO gated on
	// `series.length > 0` only, so a plugin-only chart's legend (decision 13: a data-drawing
	// plugin contributes to it) never rendered even once `ready` was fixed — `show-legend`
	// defaults to true, so this is the common case, not an opt-in one.
	it("shows a legend contributed entirely by plugins (no core series)", async () => {
		const el = await mount(financialChart({}));
		await settleChart(el);
		const items = [...el.shadowRoot.querySelectorAll(".legend-item")].map((n) => n.textContent);
		assert(items.length > 0, "the legend renders at all for a plugin-only chart");
		assert(items.some((t) => /price/i.test(t)), `expected a candlestick legend entry, got: ${items.join(" | ")}`);
		assert(items.some((t) => /volume/i.test(t)), `expected a volume legend entry, got: ${items.join(" | ")}`);
	});

	// Found and fixed en route (not originally scoped to F5, but F5's own fixture is exactly the
	// combination that exposed it): a candlestick-only chart (`series: []`) with `y-scale="log"`
	// used to build `scaleLog().domain([0, 0])`, which is NaN everywhere — core.ts's `yDomain`
	// early return for an empty series array didn't route through the same log-aware fallback the
	// "no finite values" case 30 lines down already used. Fixed in `packages/chart/src/core.ts`.
	it('y-scale="log" with no core series renders real (non-NaN) candle geometry', async () => {
		const el = await mount(financialChart({}));
		await settleChart(el);
		const bodies = [...el.shadowRoot.querySelectorAll(".candle-body")];
		assert(bodies.length > 0, "candles rendered at all");
		for (const b of bodies) {
			assert(Number.isFinite(Number(b.getAttribute("y"))), `candle body y must not be NaN, got ${b.getAttribute("y")}`);
			assert(Number.isFinite(Number(b.getAttribute("height"))), `candle body height must not be NaN, got ${b.getAttribute("height")}`);
		}
	});

	it("axe clean in light mode", async () => {
		const el = await mount(financialChart({}));
		await settleChart(el);
		await assertNoViolations(el);
	});

	it("axe clean in dark mode", async () => {
		await emulateMedia({ colorScheme: "dark" });
		const el = await mount(financialChart({}));
		await settleChart(el);
		await assertNoViolations(el);
	});

	it("axe clean under forced-colors, and up/down candles are distinguished by an attribute, not by computed color", async () => {
		await emulateMedia({ forcedColors: "active" });
		const el = await mount(financialChart({}));
		await settleChart(el);
		await assertNoViolations(el);

		const bodies = [...el.shadowRoot.querySelectorAll(".candle-body")];
		assert(bodies.length > 0, "candle bodies render under forced-colors");
		const directions = new Set(bodies.map((b) => b.getAttribute("data-direction")));
		assertEqual(directions.has("up"), true, "the fixture has at least one up candle");
		assertEqual(directions.has("down"), true, "the fixture has at least one down candle");
		for (const b of bodies) {
			const d = b.getAttribute("data-direction");
			assert(d === "up" || d === "down", `every candle body carries a direction attribute — the thing that actually distinguishes it under forced-colors, where computed fill color is not trustworthy (got "${d}")`);
		}
	});

	it("accessible name: names what the chart is and its date range", async () => {
		const el = await mount(financialChart({}));
		await settleChart(el);
		const svg = el.shadowRoot.querySelector('svg[part="plot"]');
		const name = svg.getAttribute("aria-label") ?? "";
		assert(/candlestick/i.test(name), `accessible name should say "candlestick": "${name}"`);
		assert(name.includes(FIRST_DATE) && name.includes(LAST_DATE), `accessible name should include the date range: "${name}"`);
	});
	// ---- B1 browser pass (2026-10-29) regressions ----

	// B1 F10: the summary read "Line chart, 0 series:  across 60 categories" — nothing about what
	// the chart actually draws, and a double space where the empty series list was.
	it("accessible name lists the candlesticks, volume, and indicator, with no empty series list", async () => {
		const el = await mount(financialChart({ label: undefined }));
		await settleChart(el);
		const name = el.shadowRoot.querySelector('svg[part="plot"]').getAttribute("aria-label");
		assert(name.startsWith("Chart, 3 series: Price candlesticks, Volume, SMA(10) across 60 categories"), `got "${name}"`);
		assert(!/0 series|\s{2}/.test(name), `no "0 series" and no double space: "${name}"`);
	});

	// B1 F9: with the brush narrowed, row 2024-01-02 showed 2024-06-18's prices and every row past
	// the window was blank. Each row's OHLC/volume cells must be that row's own.
	it("data table: every row's plugin cells are that row's own values under a narrowed brush", async () => {
		const el = await mount(financialChart({ brush: true, yScale: "linear" }));
		await settleChart(el);
		// Keydown dispatched straight at the handles (the brush's own keyboard handler): thirty real
		// sendKeys round trips took over the 5s test timeout in Firefox under full-suite load.
		const press = async (which, key, times) => {
			for (let i = 0; i < times; i++) {
				const h = el.shadowRoot.querySelector(`[aria-label="Range ${which}"]`);
				h.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
				await el.updateComplete;
			}
		};
		await press("start", "ArrowRight", 10);
		await press("end", "ArrowLeft", 20);
		await settleChart(el);
		assertEqual(el.shadowRoot.querySelectorAll(".candle-body").length, 30, "the brush narrowed the drawing to 30 candles");
		const headers = [...el.shadowRoot.querySelectorAll("table.sr-only thead th")].map((th) => th.textContent);
		const openCol = headers.indexOf("Price Open");
		const volCol = headers.indexOf("Volume");
		const trs = [...el.shadowRoot.querySelectorAll("table.sr-only tbody tr")];
		assertEqual(trs.length, DATA.length, "the table lists every row");
		trs.forEach((tr, i) => {
			const cells = [...tr.children].map((c) => c.textContent.trim());
			assertEqual(cells[0], DATA[i].date, `row ${i} date`);
			assertEqual(Number(cells[openCol].replace(/,/g, "")), DATA[i].open, `row ${DATA[i].date}: open belongs to another row`);
			assertEqual(Number(cells[volCol].replace(/,/g, "")), DATA[i].volume, `row ${DATA[i].date}: volume belongs to another row`);
		});
	});

	// B1 F5: the crosshair's value label sat at x=-8 in the tick gutter (clipped at the SVG edge,
	// on top of the tick labels) and printed the raw inverted value, "126.212".
	it("crosshair: the value label stays inside the plot and shows only the precision a pixel resolves", async () => {
		const el = await mount(financialChart({ yScale: "linear", plugins: [candlestickPlugin({ open: "open", high: "high", low: "low", close: "close" }), crosshairPlugin()] }));
		await settleChart(el);
		const plot = el.shadowRoot.querySelector('svg[part="plot"]');
		const r = plot.getBoundingClientRect();
		el.dispatchEvent(new PointerEvent("pointermove", { clientX: r.left + r.width * 0.37, clientY: r.top + r.height * 0.41, bubbles: true, composed: true }));
		await el.updateComplete;
		const labels = [...el.shadowRoot.querySelectorAll(".crosshair-label")];
		assertEqual(labels.length, 2, "both crosshair labels render");
		const value = labels.find((t) => t.getAttribute("text-anchor") === "start");
		assert(value, "the value label is anchored inside the plot");
		assert(Number(value.getAttribute("x")) >= 0, `value label x ${value.getAttribute("x")} is in the tick gutter`);
		const decimals = (value.textContent.split(".")[1] ?? "").length;
		assert(decimals <= 1, `a ~300px axis spanning tens of dollars resolves 0.1 at best; "${value.textContent}" claims ${decimals} decimals`);
		for (const t of labels) {
			const b = t.getBoundingClientRect();
			assert(b.left >= r.left - 0.5 && b.right <= r.right + 0.5, `"${t.textContent}" runs past the plot's edge`);
		}
	});

	// B1 F8: under forced colors the SMA stayed theme purple and all four legend swatches became
	// the same empty box, so "Price (up)" and "Price (down)" couldn't be told apart.
	it("forced colors: the indicator uses Highlight, and up/down legend swatches differ", async () => {
		await emulateMedia({ forcedColors: "active" });
		const el = await mount(financialChart({}));
		await settleChart(el);
		const probe = (kw) => { const s = document.createElement("span"); s.style.color = kw; document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c; };
		assertEqual(getComputedStyle(el.shadowRoot.querySelector(".indicator-line")).stroke, probe("Highlight"), "SMA line is Highlight");
		const sw = Object.fromEntries([...el.shadowRoot.querySelectorAll(".legend-item")].map((i) => [i.textContent.trim(), getComputedStyle(i.querySelector(".legend-swatch")).backgroundColor]));
		assertEqual(sw["Price (up)"], probe("Canvas"), "the up swatch is hollow, like an up candle");
		assertEqual(sw["Price (down)"], probe("CanvasText"), "the down swatch is solid, like a down candle");
		assertEqual(sw["SMA(10)"], probe("Highlight"), "the SMA swatch matches its line");
	});
});
