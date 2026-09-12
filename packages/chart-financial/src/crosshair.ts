import { svg, nothing } from "lit";
import { defineChartPlugin, type ChartContext, type ChartPlugin } from "@dojo-ng/chart";

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

/** Vertical guide at the hovered category (or raw x, unsnapped), horizontal guide at the pointer's
 * value, both with axis labels — `aria-hidden` (decision-27 precedent: a hover-only visual aid,
 * not a second copy of data the accessible table already carries). No CSS transition on any of
 * these marks and nothing conditionally suppressed for `prefers-reduced-motion`: there is no
 * animation here to suppress in the first place (F4) — `nothing` when not hovering swaps the whole
 * group in cleanly rather than fading it, so there's nothing to flicker either. */
export function renderCrosshair(ctx: ChartContext, state: CrosshairState | null, color: string) {
	if (!state) return nothing;
	return svg`<g part="crosshair" aria-hidden="true">
		<line class="crosshair-line" part="crosshair-line" x1="${state.x}" y1="0" x2="${state.x}" y2="${ctx.inner.height}" stroke="${color}"></line>
		<line class="crosshair-line" part="crosshair-line" x1="0" y1="${state.y}" x2="${ctx.inner.width}" y2="${state.y}" stroke="${color}"></line>
		<text class="crosshair-label" part="crosshair-label" x="${state.x}" y="${ctx.inner.height + 18}" text-anchor="middle"
			paint-order="stroke" stroke="var(--dj-color-background, #fff)" stroke-width="3" fill="${color}">${state.category}</text>
		<text class="crosshair-label" part="crosshair-label" x="-8" y="${state.y}" text-anchor="end" dominant-baseline="middle"
			paint-order="stroke" stroke="var(--dj-color-background, #fff)" stroke-width="3" fill="${color}">${ctx.format(state.value)}</text>
	</g>`;
}

/** Vertical guide at the hovered category, horizontal at the pointer's value (decision, F4). Not a
 * data-drawing plugin in decision 13's sense (nothing here is a persisted representation of a
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
