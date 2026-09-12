import { svg } from "lit";
import { line as d3line } from "d3-shape";
import { defineChartPlugin, type ChartContext, type ChartPlugin } from "@dojo-ng/chart";
import { catOf } from "./shared.js";
import { sma, ema, bollinger } from "./indicators.js";

/** No dedicated theme token for an indicator overlay (the frozen tokens are up/down/crosshair/
 * pane-gap only) — ramp slot 5, unlikely to collide with a candlestick-only chart's own (typically
 * empty) core series, which start from slot 1. */
const DEFAULT_INDICATOR_COLOR = "var(--dj-chart-5, #7c3aed)";

export interface IndicatorPluginOptions {
	/** Row key to compute the indicator from. */
	key: string;
	kind: "sma" | "ema" | "bollinger";
	/** Window length. */
	period: number;
	/** Bollinger only: standard-deviation multiplier. Default 2. */
	k?: number;
	color?: string;
	/** Legend/table name. Default `"SMA(20)"`-style, derived from kind and period. */
	label?: string;
}

function defaultLabel(options: IndicatorPluginOptions): string {
	return `${options.kind.toUpperCase()}(${options.period})`;
}

/** SVG path `d` for one line of indicator values, mirroring `core.ts`'s own `linePath`: a `null`
 * position breaks the path (`.defined()`) rather than dropping to zero or interpolating through
 * it — the leading run before the window fills is the common case, but any `null` breaks equally. */
export function indicatorLinePath(ctx: ChartContext, values: Array<number | null>): string {
	const points = ctx.data.map((row, i) => ({
		x: ctx.xCenter(catOf(row, ctx.categoryKey)),
		y: values[i],
	}));
	const gen = d3line<{ x: number; y: number | null }>()
		.defined((d) => d.y !== null)
		.x((d) => d.x)
		.y((d) => ctx.scales.y(d.y as number));
	return gen(points) ?? "";
}

function rawValues(ctx: ChartContext, key: string): number[] {
	return ctx.data.map((row) => Number(row[key]));
}

/** The computed series (or three, for Bollinger) this indicator draws — factored out of
 * `renderOver`/`domain`/`tableRows` so all three read the exact same numbers. */
function computedSeries(ctx: ChartContext, options: IndicatorPluginOptions): Array<{ suffix: string; values: Array<number | null> }> {
	const raw = rawValues(ctx, options.key);
	if (options.kind === "sma") return [{ suffix: "", values: sma(raw, options.period) }];
	if (options.kind === "ema") return [{ suffix: "", values: ema(raw, options.period) }];
	const bands = bollinger(raw, options.period, options.k ?? 2);
	return [
		{ suffix: " Mid", values: bands.map((b) => b?.mid ?? null) },
		{ suffix: " Upper", values: bands.map((b) => b?.upper ?? null) },
		{ suffix: " Lower", values: bands.map((b) => b?.lower ?? null) },
	];
}

/** A moving-average or Bollinger-band overlay, drawn on the primary (price) axis via `renderOver`
 * (decision, F4: above the core series/candles). Pure functions from `@dojo-ng/chart-financial`
 * itself do the math (decision 18); this plugin only draws what they return. */
export function indicatorPlugin(options: IndicatorPluginOptions): ChartPlugin {
	const color = options.color ?? DEFAULT_INDICATOR_COLOR;
	const label = options.label ?? defaultLabel(options);

	return defineChartPlugin({
		name: "indicator",
		domain(ctx) {
			let lo: number | undefined;
			let hi: number | undefined;
			for (const { values } of computedSeries(ctx, options)) {
				for (const v of values) {
					if (v === null) continue;
					lo = lo === undefined ? v : Math.min(lo, v);
					hi = hi === undefined ? v : Math.max(hi, v);
				}
			}
			return lo !== undefined && hi !== undefined ? [lo, hi] : undefined;
		},
		renderOver(ctx) {
			const series = computedSeries(ctx, options);
			return svg`<g part="indicator" aria-hidden="true">${series.map(({ suffix }, i) => {
				const dashed = options.kind === "bollinger" && suffix !== " Mid";
				return svg`<path
					class="indicator-line ${dashed ? "indicator-line--band" : ""}"
					part="indicator-line"
					d="${indicatorLinePath(ctx, series[i].values)}"
					fill="none"
					stroke="${color}"
					stroke-dasharray="${dashed ? "4 2" : "none"}"
				></path>`;
			})}</g>`;
		},
		legendItems() {
			return [{ label, color }];
		},
		tableRows(ctx) {
			return computedSeries(ctx, options).map(({ suffix, values }) => ({
				header: `${label}${suffix}`,
				cells: values.map((v) => (v === null ? "—" : ctx.format(v))),
			}));
		},
	});
}
