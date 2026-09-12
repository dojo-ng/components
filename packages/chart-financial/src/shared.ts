import { svg } from "lit";
import type { ChartDatum } from "@dojo-ng/chart";

/** Category label for a row — the same read `cat()` (core.ts, unexported) does, duplicated here
 * rather than imported since a plugin package only sees the core through `ChartContext`. */
export function catOf(row: ChartDatum, categoryKey: string): string {
	return String(row[categoryKey] ?? "");
}

/** Shared with `volumePlugin`, which has no `upColor`/`downColor` options of its own (the frozen
 * API gives it only `key`/`height`/`label`) — it defers to these same tokens so a candlestick and
 * a volume pane stay visually consistent by default. The real way to customize the pair together
 * is the CSS custom property itself, which both read; `candlestickPlugin`'s own `upColor`/
 * `downColor` options are a LOCAL override on top of that, not a second source of truth. */
export const DEFAULT_UP_COLOR = "var(--dj-chart-up, #16a34a)";
export const DEFAULT_DOWN_COLOR = "var(--dj-chart-down, #dc2626)";

/** Forced-colors shape/pattern distinction for up/down marks (decision, F5: "distinguishable
 * without color... shape or fill pattern, not hue alone"). Under `forced-colors: active` the
 * browser flattens author `fill`/`stroke` values to a small system palette regardless of what
 * `--dj-chart-up`/`--dj-chart-down` resolve to, so up/down would otherwise become visually
 * identical — this is what actually carries the distinction there: up renders hollow (`fill:
 * none`, an outline only — the same convention real candlestick platforms already use), down
 * renders solid. Rendered as an inline `<style>` inside each plugin's own SVG output
 * (`renderUnder`/`renderPane`) rather than added to `theme.css`, because a page-level stylesheet
 * can't reach marks drawn into `dj-chart`'s shadow root — only a stylesheet living in that same
 * shadow root (which this is, once Lit commits it) can. */
export const FORCED_COLORS_STYLE = svg`<style>
	@media (forced-colors: active) {
		.candle-wick { stroke: CanvasText; }
		.candle-body[data-direction="up"] { fill: none; stroke: CanvasText; stroke-width: 1.5; }
		.candle-body[data-direction="down"] { fill: CanvasText; stroke: CanvasText; }
		.ohlc-bar { stroke: CanvasText; }
		.ohlc-open[data-direction="up"], .ohlc-close[data-direction="up"] { stroke: CanvasText; }
		.ohlc-open[data-direction="down"], .ohlc-close[data-direction="down"] { stroke: CanvasText; stroke-dasharray: 3 2; }
		.volume-bar[data-direction="up"] { fill: none; stroke: CanvasText; stroke-width: 1.5; }
		.volume-bar[data-direction="down"] { fill: CanvasText; stroke: CanvasText; }
		.volume-bar[data-direction="neutral"] { fill: CanvasText; fill-opacity: 0.5; stroke: CanvasText; }
	}
</style>`;
