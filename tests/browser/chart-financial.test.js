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
import { candlestickPlugin, volumePlugin, indicatorPlugin } from "../../packages/chart-financial/dist/index.js";

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
});
