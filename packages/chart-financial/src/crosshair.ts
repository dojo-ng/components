import { svg, nothing } from "lit";
import { defineChartPlugin, type ChartContext, type ChartPlugin } from "@dojo-ng/chart";
import { FORCED_COLORS_STYLE } from "./shared.js";

const DEFAULT_CROSSHAIR_COLOR = "var(--dj-chart-crosshair, #64748b)";

export interface CrosshairPluginOptions {
	/** `true` snaps the vertical guide to the nearest category center rather than following the
	 * raw pointer x continuously. The horizontal guide always follows the raw pointer value — a
	 * "snap to the exact price" would need a data key crosshairPlugin doesn't have (same
	 * uncoupling reasoning as `volumePlugin`'s direction detection). Default `false`. */
	snap?: boolean;
}

export interface CrosshairState {
	category: string;
	x: number;
	y: number;
	value: number;
}

/** The category whose `xCenter` is closest to `x` — the only way to invert a band/point x scale,
 * which (unlike `ctx.scales.y`) has no `.invert()` of its own. */
export function nearestCategory(ctx: ChartContext, x: number): string {
	let best = "";
	let bestDist = Infinity;
	for (const c of ctx.scales.cats) {
		const d = Math.abs(ctx.xCenter(c) - x);
		if (d < bestDist) {
			bestDist = d;
			best = c;
		}
	}
	return best;
}

/** Crosshair state for a pointer already resolved to plot-local coordinates (the same space
 * `ctx.xCenter`/`ctx.scales.y` operate in) — kept separate from the `getScreenCTM`-based
 * coordinate conversion in `setup()` so the actual math is a pure, directly testable function. */
export function crosshairStateAt(ctx: ChartContext, localX: number, localY: number, snap: boolean): CrosshairState {
	const category = nearestCategory(ctx, localX);
	return {
		category,
		x: snap ? ctx.xCenter(category) : localX,
		y: localY,
		value: ctx.scales.y.invert(localY),
	};
}

/** Font size of the crosshair's two labels, set on the text itself so it doesn't depend on
 * whatever font size the host page happens to cascade into the chart. */
export const CROSSHAIR_FONT_SIZE = 12;

/** Decimal places worth showing for a pointer's value at `y`: as many as one pixel of the axis
 * can resolve, and no more. The pointer can't pick a value finer than a pixel, so printing
 * `126.212` on an axis where a pixel is worth 0.2 claims precision that isn't there. Works on a log
 * axis too, where a pixel is worth more near the top than near the bottom. */
export function crosshairDecimals(ctx: ChartContext, y: number): number {
	const perPixel = Math.abs(ctx.scales.y.invert(y + 1) - ctx.scales.y.invert(y));
	if (!(perPixel > 0) || !Number.isFinite(perPixel)) return 0;
	return Math.max(0, Math.min(6, Math.ceil(-Math.log10(perPixel))));
}

/** The pointer's value rounded to {@link crosshairDecimals}, then printed through the chart's own
 * formatter (`ctx.format`, which honors `numberFormat`/`formatY`), so the crosshair reads like the
 * axis does. */
export function crosshairValueText(ctx: ChartContext, state: CrosshairState): string {
	const d = crosshairDecimals(ctx, state.y);
	const f = 10 ** d;
	return ctx.format(Math.round(state.value * f) / f);
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, hi < lo ? lo : v));

/** Vertical guide at the hovered category (or raw x, unsnapped), horizontal guide at the pointer's
 * value, both with labels — `aria-hidden` (a hover-only visual aid,
 * not a second copy of data the accessible table already carries). Both labels stay inside the
 * plot: the value label sits just inside the left edge above its guide (the axis gutter is the
 * tick labels' space, and drawing there clipped the label and overprinted the ticks), and the
 * category label is clamped so it never runs off either end. No CSS transition on any of
 * these marks and nothing conditionally suppressed for `prefers-reduced-motion`: there is no
 * animation here to suppress in the first place — `nothing` when not hovering swaps the whole
 * group in cleanly rather than fading it, so there's nothing to flicker either. */
export function renderCrosshair(ctx: ChartContext, state: CrosshairState | null, color: string) {
	if (!state) return nothing;
	const catHalf = (state.category.length * CROSSHAIR_FONT_SIZE * 0.6) / 2;
	const catX = clamp(state.x, catHalf, ctx.inner.width - catHalf);
	const valueY = clamp(state.y - 5, CROSSHAIR_FONT_SIZE, ctx.inner.height - 3);
	return svg`<g part="crosshair" aria-hidden="true">
		${FORCED_COLORS_STYLE}
		<line class="crosshair-line" part="crosshair-line" x1="${state.x}" y1="0" x2="${state.x}" y2="${ctx.inner.height}" stroke="${color}"></line>
		<line class="crosshair-line" part="crosshair-line" x1="0" y1="${state.y}" x2="${ctx.inner.width}" y2="${state.y}" stroke="${color}"></line>
		<text class="crosshair-label" part="crosshair-label" x="${catX}" y="${ctx.inner.height + 18}" text-anchor="middle" font-size="${CROSSHAIR_FONT_SIZE}"
			paint-order="stroke" stroke="var(--dj-color-background, #fff)" stroke-width="3" fill="${color}">${state.category}</text>
		<text class="crosshair-label" part="crosshair-label" x="4" y="${valueY}" text-anchor="start" font-size="${CROSSHAIR_FONT_SIZE}"
			paint-order="stroke" stroke="var(--dj-color-background, #fff)" stroke-width="3" fill="${color}">${crosshairValueText(ctx, state)}</text>
	</g>`;
}

/** Vertical guide at the hovered category, horizontal at the pointer's value. Not a
 * data-drawing plugin (nothing here is a persisted representation of a
 * series — it exists only while the pointer is over the chart, and the tooltip/table already
 * carry the real values), so it declares no `legendItems`/`tableRows`. */
export function crosshairPlugin(options: CrosshairPluginOptions = {}): ChartPlugin {
	const snap = options.snap ?? false;
	const color = DEFAULT_CROSSHAIR_COLOR;
	let state: CrosshairState | null = null;

	return defineChartPlugin({
		name: "crosshair",
		setup(ctx) {
			const host = ctx.host;
			const onMove = (e: PointerEvent) => {
				const g = host.renderRoot?.querySelector('svg[part="plot"] > g') as SVGGraphicsElement | null;
				const ctm = g?.getScreenCTM()?.inverse();
				if (!ctm) return;
				// The plain a/b/c/d/e/f affine transform rather than DOMPoint#matrixTransform: both
				// express the same 2D transform, but happy-dom implements getScreenCTM()/inverse()
				// without implementing matrixTransform() on the point it hands back from
				// createSVGPoint() — confirmed directly, not assumed. This form works in every real
				// browser too, so it isn't a workaround specific to the test environment.
				const local = { x: ctm.a * e.clientX + ctm.c * e.clientY + ctm.e, y: ctm.b * e.clientX + ctm.d * e.clientY + ctm.f };
				state = crosshairStateAt(ctx, local.x, local.y, snap);
				ctx.refresh();
			};
			const onLeave = () => {
				if (state === null) return;
				state = null;
				ctx.refresh();
			};
			host.addEventListener("pointermove", onMove);
			host.addEventListener("pointerleave", onLeave);
			return () => {
				host.removeEventListener("pointermove", onMove);
				host.removeEventListener("pointerleave", onLeave);
			};
		},
		renderOver(ctx) {
			return renderCrosshair(ctx, state, color);
		},
	});
}
