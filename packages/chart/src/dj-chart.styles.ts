import { css } from "lit";
export default css`
	:host {
		display: flex;
		flex-direction: column;
		inline-size: 100%;
		block-size: var(--dj-chart-height, 18rem);
		color: var(--dj-color-text, #1f2937);
		font-family: var(--dj-font-family, system-ui, sans-serif);
	}
	:host([hidden]) { display: none; }
	/* The plot fills the space left after the legend; it is the box the ResizeObserver
	   measures, so the SVG viewBox always matches the rendered plot (legend never steals
	   the chart's height or overflows into the next element). */
	.plot { position: relative; flex: 1 1 auto; min-block-size: 0; }
	svg { display: block; width: 100%; height: 100%; overflow: visible; }
	/* Canvas escape hatch (renderer="canvas"): series marks only, absolutely positioned over the
	   plot rect. pointer-events: none so the SVG hit-bands beneath it keep handling hover/tooltip. */
	.plot-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
	.axis line, .axis path { stroke: var(--dj-color-border, #d1d5db); }
	.axis text { fill: var(--dj-color-text-muted, #6b7280); font-size: 0.75rem; }
	.grid line { stroke: var(--dj-color-neutral-200, #e5e7eb); }
	.axis-title { fill: var(--dj-color-text, #1f2937); font-size: 0.8125rem; }
	.series-line { fill: none; stroke-width: 2; }
	.series-area { opacity: 0.25; stroke: none; }
	rect.bar { stroke: var(--dj-color-background, #fff); stroke-width: 0.5; }
	.marker { stroke: var(--dj-color-background, #fff); stroke-width: 1.5; }
	.point-mark { stroke: var(--dj-color-background, #fff); stroke-width: 1; }
	.slice { stroke: var(--dj-color-background, #fff); stroke-width: 1.5; }
	/* Isolate each run's bidi so the value and sub-label center correctly in RTL (e.g. ar-EG)
	   instead of sharing one bidi paragraph and clipping. */
	.center-label { fill: var(--dj-color-text, #1f2937); font-weight: 600; unicode-bidi: isolate; }
	.center-sub-label { fill: var(--dj-color-text-muted, #6b7280); font-weight: 400; unicode-bidi: isolate; }
	/* Point labels (Track M): a halo (a wide, round-joined stroke painted BEFORE the fill, via
	   paint-order) keeps the text legible wherever it lands on top of a mark or the grid. */
	.point-label {
		font-size: var(--dj-chart-label-size, 0.6875rem);
		fill: var(--dj-chart-label-color, var(--dj-color-text, #1f2937));
		paint-order: stroke;
		stroke: var(--dj-chart-label-halo, var(--dj-color-background, #fff));
		stroke-width: 3px;
		stroke-linejoin: round;
	}
	.point-label-text { margin-inline-start: 0.35em; }
	.hit { fill: transparent; }
	/* Enter/update transitions. The shared reducedMotion rule zeroes these durations under
	   prefers-reduced-motion, so they are automatically disabled for that preference. */
	[part="series"] { animation: dj-chart-enter var(--dj-transition-fast, 150ms) ease both; }
	@keyframes dj-chart-enter { from { opacity: 0; } to { opacity: 1; } }
	rect.bar { transition: y var(--dj-transition-fast, 150ms) ease, height var(--dj-transition-fast, 150ms) ease; }
	/* Streamed appendData() updates snap into place instead of animating: a sliding max-points
	   window reflows every bar's position on every append, and animating that every frame reads
	   as flicker rather than motion. See dj-chart.ts's #streaming flag. */
	svg.no-transition rect.bar { transition: none; }
	svg.no-transition [part="series"] { animation: none; }
	.legend { display: flex; flex-wrap: wrap; gap: var(--dj-spacing-small, 0.75rem); padding-block-start: var(--dj-spacing-x-small, 0.5rem); font-size: 0.8125rem; }
	.legend-item { display: inline-flex; align-items: center; gap: 0.35rem; }
	.legend-swatch { inline-size: 0.75rem; block-size: 0.75rem; border-radius: 2px; flex: 0 0 auto; }
	.legend-item--button { background: none; border: 0; padding: 0.1rem 0.15rem; margin: 0; font: inherit; color: inherit; cursor: pointer; border-radius: 3px; }
	.legend-item--button:focus-visible { outline: var(--dj-focus-ring, 2px solid); outline-offset: 1px; }
	.legend-item--off { opacity: 0.4; text-decoration: line-through; }
	/* Brush strip: an overview track with a draggable visible-range window. */
	.brush { display: block; inline-size: 100%; block-size: 40px; flex: 0 0 auto; margin-block-start: var(--dj-spacing-x-small, 0.5rem); touch-action: none; }
	.brush-track { fill: var(--dj-color-neutral-100, #f3f4f6); stroke: var(--dj-color-border, #d1d5db); stroke-width: 1; }
	.brush-context { fill: none; stroke: var(--dj-color-neutral-400, #9ca3af); stroke-width: 1; opacity: 0.7; }
	.brush-window { fill: var(--dj-color-primary-500, #3b82f6); opacity: 0.18; cursor: grab; }
	.brush-handle { fill: var(--dj-color-primary-600, #2563eb); cursor: ew-resize; }
	.brush-handle:focus-visible { outline: var(--dj-focus-ring, 2px solid); outline-offset: 1px; }
	.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
	.tooltip {
		position: absolute; pointer-events: none; z-index: 1;
		background: var(--dj-color-neutral-800, #1f2937); color: var(--dj-color-neutral-0, #fff);
		padding: 0.3rem 0.5rem; border-radius: var(--dj-input-border-radius-small, 0.1875rem);
		font-size: 0.8125rem; box-shadow: 0 2px 8px rgb(0 0 0 / 0.25);
		transform: translate(-50%, -110%); white-space: nowrap;
	}
	.tooltip[hidden] { display: none; }
	.tooltip-row { display: flex; align-items: center; gap: 0.35rem; }
	.tooltip-swatch { width: 0.6rem; height: 0.6rem; border-radius: 2px; flex: 0 0 auto; }
	/* Forced colors: color cannot distinguish series, so marks fall back to system colors;
	   the accessible data table carries the real per-series values. */
	@media (forced-colors: active) {
		.series-line { stroke: CanvasText; }
		.series-area { opacity: 1; fill: Canvas; stroke: CanvasText; }
		rect.bar { fill: CanvasText; stroke: Canvas; }
		.marker, .point-mark, .slice { fill: CanvasText; stroke: Canvas; }
		.legend-swatch, .tooltip { border: 1px solid CanvasText; }
		.brush-track { fill: Canvas; stroke: CanvasText; }
		.brush-window { fill: Highlight; opacity: 0.3; }
		.brush-handle { fill: CanvasText; }
		.brush-context { stroke: CanvasText; }
		.center-label, .center-sub-label { fill: CanvasText; }
		.point-label { fill: CanvasText; stroke: Canvas; }
	}
`;
