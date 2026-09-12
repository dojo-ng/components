import { html, svg } from "lit";
import { defineChartPlugin, type ChartContext, type ChartPlugin } from "@dojo-ng/chart";
import { catOf, DEFAULT_UP_COLOR, DEFAULT_DOWN_COLOR, FORCED_COLORS_STYLE } from "./shared.js";

/** Row-key names for the four OHLC fields, read directly off each data row — a candlestick chart
 * has no `series` of its own (decision 17), so there is nothing for these to attach to via
 * `ChartSeries` module augmentation; the plugin reads `ctx.data` by these keys instead. */
export interface OhlcKeys {
	open: string;
	high: string;
	low: string;
	close: string;
}

/** Body width as a fraction of the category bandwidth — the same shape `groupedBars` gives an
 * inter-series gap, just fixed at one ratio since a candle has no siblings to divide the band with. */
export const CANDLE_BODY_WIDTH_RATIO = 0.6;
/** A doji (open === close) still gets a visible body rather than a zero-height rect that vanishes. */
export const MIN_CANDLE_BODY_HEIGHT = 1;
/** OHLC-bar open/close tick length as a fraction of the bandwidth, each side of the vertical stem. */
export const BAR_TICK_RATIO = 0.4;

interface OhlcRow {
	category: string;
	x: number;
	bandwidth: number;
	open: number;
	high: number;
	low: number;
	close: number;
	openY: number;
	highY: number;
	lowY: number;
	closeY: number;
	up: boolean;
}

/** Pixel positions for every row, off `ctx.scales.y` and `ctx.scales.xBand` exactly as the core
 * itself reads them — `ctx.scales.y` is a plain `ValueScale`, so this needs no log-awareness of its
 * own: whichever scale (linear or log) the chart built is what a call to it returns. */
function ohlcRows(ctx: ChartContext, keys: OhlcKeys): OhlcRow[] {
	const y = ctx.scales.y;
	const bandwidth = ctx.scales.xBand.bandwidth();
	return ctx.data.map((row) => {
		const category = catOf(row, ctx.categoryKey);
		const open = Number(row[keys.open]);
		const high = Number(row[keys.high]);
		const low = Number(row[keys.low]);
		const close = Number(row[keys.close]);
		return {
			category,
			x: ctx.xCenter(category),
			bandwidth,
			open, high, low, close,
			openY: y(open),
			highY: y(high),
			lowY: y(low),
			closeY: y(close),
			up: close >= open,
		};
	});
}

export interface CandleMark {
	category: string;
	x: number;
	bodyX: number;
	bodyY: number;
	bodyWidth: number;
	bodyHeight: number;
	wickX: number;
	wickY1: number;
	wickY2: number;
	up: boolean;
	fill: string;
}

/** Candle body (open→close, clamped to a visible minimum height) plus wick (low→high). */
export function candleMarks(ctx: ChartContext, keys: OhlcKeys, upColor: string, downColor: string): CandleMark[] {
	return ohlcRows(ctx, keys).map((r) => {
		const bodyWidth = r.bandwidth * CANDLE_BODY_WIDTH_RATIO;
		const top = Math.min(r.openY, r.closeY);
		const bottom = Math.max(r.openY, r.closeY);
		const bodyHeight = Math.max(bottom - top, MIN_CANDLE_BODY_HEIGHT);
		const mid = (top + bottom) / 2;
		return {
			category: r.category,
			x: r.x,
			bodyX: r.x - bodyWidth / 2,
			bodyY: mid - bodyHeight / 2,
			bodyWidth,
			bodyHeight,
			wickX: r.x,
			wickY1: r.highY,
			wickY2: r.lowY,
			up: r.up,
			fill: r.up ? upColor : downColor,
		};
	});
}

export interface BarMark {
	category: string;
	x: number;
	y1: number;
	y2: number;
	openX1: number;
	openX2: number;
	openY: number;
	closeX1: number;
	closeX2: number;
	closeY: number;
	up: boolean;
	fill: string;
}

/** OHLC-bar geometry: a vertical stem (low→high) with a left tick at open and a right tick at close. */
export function barMarks(ctx: ChartContext, keys: OhlcKeys, upColor: string, downColor: string): BarMark[] {
	return ohlcRows(ctx, keys).map((r) => {
		const tick = r.bandwidth * BAR_TICK_RATIO;
		return {
			category: r.category,
			x: r.x,
			y1: r.highY,
			y2: r.lowY,
			openX1: r.x - tick,
			openX2: r.x,
			openY: r.openY,
			closeX1: r.x,
			closeX2: r.x + tick,
			closeY: r.closeY,
			up: r.up,
			fill: r.up ? upColor : downColor,
		};
	});
}

// Wrapped in a static `<g>` rather than a bare `${marks.map(...)}` at the template root — the
// sandbox caveat under "A Lit render() returning a template with ... no static wrapping element
// commits NOTHING" (ground-rules.md) is specific to two-or-more root-level dynamic children, but
// this is the same family of hazard, and `renderPointLabels` (dj-chart.ts) already establishes the
// safe pattern (a static wrapper around the dynamic list) for exactly this kind of mark group.
function renderCandleMarks(marks: CandleMark[]) {
	return svg`<g part="candles">
		${FORCED_COLORS_STYLE}
		${marks.map(
			(m) => svg`
				<line class="candle-wick" part="candle-wick" x1="${m.wickX}" y1="${m.wickY1}" x2="${m.wickX}" y2="${m.wickY2}" stroke="${m.fill}"></line>
				<rect class="candle-body" part="candle-body" data-direction="${m.up ? "up" : "down"}" x="${m.bodyX}" y="${m.bodyY}" width="${m.bodyWidth}" height="${m.bodyHeight}" fill="${m.fill}"></rect>
			`,
		)}
	</g>`;
}

function renderBarMarks(marks: BarMark[]) {
	return svg`<g part="ohlc-bars">
		${FORCED_COLORS_STYLE}
		${marks.map(
			(m) => svg`
				<line class="ohlc-bar" part="ohlc-bar" data-direction="${m.up ? "up" : "down"}" x1="${m.x}" y1="${m.y1}" x2="${m.x}" y2="${m.y2}" stroke="${m.fill}"></line>
				<line class="ohlc-open" part="ohlc-open" data-direction="${m.up ? "up" : "down"}" x1="${m.openX1}" y1="${m.openY}" x2="${m.openX2}" y2="${m.openY}" stroke="${m.fill}"></line>
				<line class="ohlc-close" part="ohlc-close" data-direction="${m.up ? "up" : "down"}" x1="${m.closeX1}" y1="${m.closeY}" x2="${m.closeX2}" y2="${m.closeY}" stroke="${m.fill}"></line>
			`,
		)}
	</g>`;
}

/** `candlestickPlugin`'s options. Structurally identical to `OhlcKeys & {...}` (the shape the
 * frozen API spec names), but written as a flat named interface rather than `OhlcKeys & {...}` or
 * `extends OhlcKeys` — `genlib.py`'s catalog generator (`interface_fields()`) parses an exported
 * interface's own literal members and does not resolve an `extends` clause's inherited fields, so
 * either of those would render an Options block silently missing `open`/`high`/`low`/`close`. The
 * duplication of `OhlcKeys`' four fields is accepted deliberately for that reason — flagged by
 * `knowledge-4d` (Bill's session) after fixing `genlib.py`'s multi-factory detection, 2026-09-12. */
export interface CandlestickPluginOptions {
	/** Row key for the opening price. */
	open: string;
	/** Row key for the day's high. */
	high: string;
	/** Row key for the day's low. */
	low: string;
	/** Row key for the closing price. */
	close: string;
	/** Candle body + wick, or an OHLC bar. */
	style?: "candle" | "bar";
	/** Default `--dj-chart-up`. */
	upColor?: string;
	/** Default `--dj-chart-down`. */
	downColor?: string;
	/** Legend/table/tooltip name for this instrument. Default `"Price"`. */
	label?: string;
}

/** A single candlestick (or OHLC-bar) instrument, drawn from four row keys (decision 17: one
 * plugin, a `style` option, rather than a candlestick plugin and a separate OHLC-bar plugin). */
export function candlestickPlugin(options: CandlestickPluginOptions): ChartPlugin {
	const keys: OhlcKeys = { open: options.open, high: options.high, low: options.low, close: options.close };
	const style = options.style ?? "candle";
	const upColor = options.upColor ?? DEFAULT_UP_COLOR;
	const downColor = options.downColor ?? DEFAULT_DOWN_COLOR;
	const label = options.label ?? "Price";

	return defineChartPlugin({
		name: "candlestick",
		domain(ctx) {
			let lo: number | undefined;
			let hi: number | undefined;
			for (const row of ctx.data) {
				const low = Number(row[keys.low]);
				const high = Number(row[keys.high]);
				if (Number.isFinite(low)) lo = lo === undefined ? low : Math.min(lo, low);
				if (Number.isFinite(high)) hi = hi === undefined ? high : Math.max(hi, high);
			}
			return lo !== undefined && hi !== undefined ? [lo, hi] : undefined;
		},
		renderUnder(ctx) {
			return style === "bar"
				? renderBarMarks(barMarks(ctx, keys, upColor, downColor))
				: renderCandleMarks(candleMarks(ctx, keys, upColor, downColor));
		},
		renderTooltip(category, ctx) {
			const row = ctx.data.find((d) => catOf(d, ctx.categoryKey) === category);
			if (!row) return undefined;
			const open = Number(row[keys.open]);
			const high = Number(row[keys.high]);
			const low = Number(row[keys.low]);
			const close = Number(row[keys.close]);
			const change = close - open;
			const fill = close >= open ? upColor : downColor;
			return html`
				<strong>${category}</strong>
				<div class="tooltip-row">Open: ${ctx.format(open)}</div>
				<div class="tooltip-row">High: ${ctx.format(high)}</div>
				<div class="tooltip-row">Low: ${ctx.format(low)}</div>
				<div class="tooltip-row">Close: ${ctx.format(close)}</div>
				<div class="tooltip-row"><span style=${`color:${fill}`}>${change >= 0 ? "+" : ""}${ctx.format(change)}</span></div>
			`;
		},
		legendItems() {
			return [
				{ label: `${label} (up)`, color: upColor },
				{ label: `${label} (down)`, color: downColor },
			];
		},
		tableRows(ctx) {
			const column = (key: string) => ctx.data.map((row) => ctx.format(Number(row[key])));
			return [
				{ header: `${label} Open`, cells: column(keys.open) },
				{ header: `${label} High`, cells: column(keys.high) },
				{ header: `${label} Low`, cells: column(keys.low) },
				{ header: `${label} Close`, cells: column(keys.close) },
			];
		},
	});
}
