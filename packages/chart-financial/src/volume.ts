import { svg } from "lit";
import { defineChartPlugin, type ChartContext, type ChartDatum, type ChartPane, type ChartPlugin } from "@dojo-ng/chart";
import { catOf, DEFAULT_UP_COLOR, DEFAULT_DOWN_COLOR, FORCED_COLORS_STYLE } from "./shared.js";

export const VOLUME_PANE_ID = "volume";
export const DEFAULT_VOLUME_PANE_HEIGHT = 60;
/** A bar with no candlestick data to read direction off of falls back to this — no dedicated
 * theme token for it (the frozen "New theme tokens" list is exactly the four Track F/L
 * introduces: up, down, crosshair, pane-gap), so it's a plain literal rather than a `var()`
 * reference implying a customization point that doesn't exist yet. */
export const NEUTRAL_VOLUME_COLOR = "#94a3b8";

/** Volume bars read conventional `"open"`/`"close"` keys directly off each row to decide a day's
 * direction — NOT by asking a co-installed `candlestickPlugin` for its configured key names
 * (decision, F3: "determined by reading the rendered data, not by asking the other plugin, so the
 * two stay uncoupled"). `volumePlugin`'s own frozen options (`key`/`height?`/`label?`) have no slot
 * for OHLC key names either, which is the other half of the reasoning: there is nowhere to
 * configure anything else. A row with no finite `open`/`close` pair (no candlestick present, or a
 * candlestick using differently-named keys) renders a neutral bar rather than guessing. */
export function directionOf(row: ChartDatum): "up" | "down" | "neutral" {
	const open = Number(row["open"]);
	const close = Number(row["close"]);
	if (!Number.isFinite(open) || !Number.isFinite(close)) return "neutral";
	return close >= open ? "up" : "down";
}

export function volumeDomain(ctx: ChartContext, key: string): [number, number] {
	let max = 0;
	for (const row of ctx.data) {
		const v = Number(row[key]);
		if (Number.isFinite(v)) max = Math.max(max, v);
	}
	return [0, max > 0 ? max : 1];
}

export interface VolumeMark {
	category: string;
	x: number;
	width: number;
	y: number;
	height: number;
	fill: string;
	direction: "up" | "down" | "neutral";
}

/** Bar geometry for one pane, off `ctx.paneScale(pane.id)` — the SAME shared x scale (`xCenter`,
 * `xBand.bandwidth()`) the price chart and any candlestick plugin use, which is what makes the
 * volume column line up with the price column exactly rather than approximately (decision 14). */
export function volumeMarks(ctx: ChartContext, paneId: string, key: string): VolumeMark[] {
	const scale = ctx.paneScale(paneId);
	if (!scale) return [];
	const bandwidth = ctx.scales.xBand.bandwidth();
	const baseline = scale(0);
	return ctx.data.map((row) => {
		const category = catOf(row, ctx.categoryKey);
		const value = Number(row[key]);
		const top = scale(Number.isFinite(value) ? value : 0);
		const direction = directionOf(row);
		const fill = direction === "up" ? DEFAULT_UP_COLOR : direction === "down" ? DEFAULT_DOWN_COLOR : NEUTRAL_VOLUME_COLOR;
		return {
			category,
			x: ctx.xCenter(category) - bandwidth / 2,
			width: bandwidth,
			y: Math.min(top, baseline),
			height: Math.abs(baseline - top),
			fill,
			direction,
		};
	});
}

function renderVolumeMarks(marks: VolumeMark[]) {
	return svg`<g part="volume-bars">
		${FORCED_COLORS_STYLE}
		${marks.map(
			(m) => svg`<rect class="volume-bar" part="volume-bar" data-direction="${m.direction}" x="${m.x}" y="${m.y}" width="${m.width}" height="${m.height}" fill="${m.fill}"></rect>`,
		)}
	</g>`;
}

/** `volumePlugin`'s options — named (rather than the inline object literal the frozen API spec
 * shows) so `genlib.py`'s catalog generator can resolve an Options block for it, the same reason
 * `CandlestickPluginOptions` exists in `candlestick.ts`. */
export interface VolumePluginOptions {
	/** Row key for the day's volume. */
	key: string;
	/** Pane height in px. Default 60. */
	height?: number;
	/** Legend/table name for the pane. Default `"Volume"`. */
	label?: string;
}

/** Volume as its own pane below the price chart (decision 19) — never a right-axis series, which
 * would share the price chart's vertical space and make both harder to read. */
export function volumePlugin(options: VolumePluginOptions): ChartPlugin {
	const key = options.key;
	const height = options.height ?? DEFAULT_VOLUME_PANE_HEIGHT;
	const label = options.label ?? "Volume";

	return defineChartPlugin({
		name: "volume",
		panes(ctx) {
			const pane: ChartPane = { id: VOLUME_PANE_ID, height, domain: volumeDomain(ctx, key), label };
			return [pane];
		},
		renderPane(pane, ctx) {
			return renderVolumeMarks(volumeMarks(ctx, pane.id, key));
		},
		legendItems() {
			return [{ label, color: NEUTRAL_VOLUME_COLOR }];
		},
		tableRows(ctx) {
			return [{ header: label, cells: ctx.data.map((row) => ctx.format(Number(row[key]))) }];
		},
	});
}
