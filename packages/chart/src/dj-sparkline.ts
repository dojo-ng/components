import { html, svg, nothing } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import { LocaleController, formatNumber } from "@dojo-ng/i18n";
import styles from "./dj-sparkline.styles.js";
import {
	sparklinePoints,
	sparklineLinePath,
	sparklineAreaPath,
	sparklineBars,
	sparklineAccessibleName,
	type SparklinePoint,
} from "./core.js";

// Fixed internal coordinate space. happy-dom does no layout, so a measured viewBox (dj-chart's
// approach, via ResizeObserver) isn't testable; a fixed space with preserveAspectRatio="none"
// makes the geometry layout-independent instead, scaling to whatever CSS size the host is given.
const W = 100;
const H = 30;

export type SparklineType = "line" | "area" | "bar";

/**
 * `<dj-sparkline>` — a tiny inline chart: one numeric series, no axes, grid, legend, tooltip,
 * brush, or margins. It shares its math with `@dojo-ng/chart`'s `core.ts` but is deliberately
 * NOT a `dj-chart` mode — a sparkline's data shape (a plain `data` array of numbers) and render
 * path are both much smaller. For a full chart with axes and interaction, use `<dj-chart>`.
 *
 * Set `label` to give it an accessible name (`role="img"` plus a generated "N points, min X,
 * max Y, last Z" summary, localized through the ambient locale); without a label the sparkline
 * is `aria-hidden`, which is the common case when adjacent text already states the value (a KPI
 * row showing the number next to its trend).
 *
 * {@link push} appends one or more values for cheap live updates without rebuilding `data`
 * yourself; `max-points` bounds how much history it keeps.
 *
 * Parts: `base`, `marker`.
 *
 * @cssprop [--dj-sparkline-width=8em] - Host width.
 * @cssprop [--dj-sparkline-height=1.5em] - Host height.
 * @cssprop [--dj-sparkline-color] - Line/area/bar color; defaults to dj-chart's series-1 token (`--dj-chart-1`, #2563eb).
 * @cssprop [--dj-sparkline-marker-size=0.25em] - Diameter of the last-point marker dot.
 */
export class DjSparkline extends DojoElement {
	static override styles = styles;
	static override version = "0.1.0";

	@property({ attribute: false }) data: number[] = [];
	/** Mark type. `line`/`area` share one path; `bar` renders one rect per point. */
	@property({ reflect: true }) type: SparklineType = "line";
	/** Accessible name; when unset the sparkline is `aria-hidden` (see the class doc). */
	@property() label?: string;
	/** Show a dot at the last point. Ignored for `type="bar"`. */
	@property({ type: Boolean, reflect: true }) marker = false;
	/** Fixed domain minimum; defaults to the data's own minimum. */
	@property({ type: Number }) min?: number;
	/** Fixed domain maximum; defaults to the data's own maximum. */
	@property({ type: Number }) max?: number;
	/** Cap on `data` values kept after {@link push} appends; 0 (default) is unbounded. Old
	 * values are trimmed from the front, so the sparkline shows a sliding window. */
	@property({ attribute: "max-points", type: Number }) maxPoints = 0;

	#i18n = new LocaleController(this);
	// Values queued by push() awaiting the next scheduled flush.
	#pendingPush: number[] = [];
	#pushFlushScheduled = false;

	private fmt(v: number): string {
		return formatNumber(v, this.#i18n.locale);
	}

	/** Schedule `fn` for the next animation frame (a microtask when rAF is unavailable). Kept as
	 * one small, overridable seam — tests replace this method to drive scheduling deterministically. */
	protected scheduleFrame(fn: () => void): void {
		if (typeof requestAnimationFrame === "function") requestAnimationFrame(fn);
		else queueMicrotask(fn);
	}

	/** Append one or more values without rebuilding `data` yourself. Multiple calls within the
	 * same animation frame coalesce into a single `data` assignment. Trims from the front to
	 * `max-points` when set. Sparklines have no transitions, so nothing else changes on append. */
	push(value: number | number[]): void {
		const values = Array.isArray(value) ? value : [value];
		if (!values.length) return;
		this.#pendingPush.push(...values);
		if (this.#pushFlushScheduled) return;
		this.#pushFlushScheduled = true;
		this.scheduleFrame(() => this.#flushPush());
	}

	#flushPush(): void {
		this.#pushFlushScheduled = false;
		const values = this.#pendingPush;
		this.#pendingPush = [];
		if (!values.length) return;
		let next = this.data.concat(values);
		if (this.maxPoints > 0 && next.length > this.maxPoints) {
			next = next.slice(next.length - this.maxPoints);
		}
		this.data = next;
	}

	override render() {
		const hasLabel = !!this.label;
		const accName = hasLabel ? sparklineAccessibleName(this.label as string, this.data, (v) => this.fmt(v)) : "";
		const points = sparklinePoints(this.data, W, H, this.min, this.max);
		return html`<svg
			part="base"
			viewBox="0 0 ${W} ${H}"
			preserveAspectRatio="none"
			role=${hasLabel ? "img" : nothing}
			aria-hidden=${hasLabel ? nothing : "true"}
			aria-label=${hasLabel ? accName : nothing}
		>${this.renderMark(points)}</svg>${this.marker && this.type !== "bar" ? this.renderMarker(points) : nothing}`;
	}

	private renderMark(points: SparklinePoint[]) {
		if (points.length === 0) return nothing;
		if (this.type === "bar") {
			const bars = sparklineBars(this.data, W, H, this.min, this.max);
			return svg`${bars.map((b) => svg`<rect class="bar" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}"></rect>`)}`;
		}
		if (this.type === "area") {
			return svg`<path class="area" d=${sparklineAreaPath(points, H)}></path><path class="line" d=${sparklineLinePath(points)}></path>`;
		}
		return svg`<path class="line" d=${sparklineLinePath(points)}></path>`;
	}

	// The marker is an HTML overlay, not an SVG <circle>, because `preserveAspectRatio="none"`
	// scales the fixed 100×30 space non-uniformly: anything drawn INSIDE the SVG is stretched
	// with it, so a circle comes out an ellipse (at the default 8em×1.5em host, about 1.6× wider
	// than tall). `vector-effect: non-scaling-stroke` rescues the line's weight but does nothing
	// for a filled shape's geometry. Sized in CSS units instead, the dot stays round at any host
	// aspect. Its POSITION needs no measurement: under `preserveAspectRatio="none"` a user-space
	// coordinate maps linearly onto the host box, so x/W and y/H are the host-relative
	// percentages exactly. Physical `left`/`top` on purpose — the SVG content does not mirror
	// under RTL, so a logical `inset-inline-start` would drift away from the line it marks.
	private renderMarker(points: SparklinePoint[]) {
		if (points.length === 0) return nothing;
		const last = points[points.length - 1];
		return html`<span
			part="marker"
			class="marker"
			aria-hidden="true"
			style="left:${(last.x / W) * 100}%;top:${(last.y / H) * 100}%"
		></span>`;
	}
}
export default DjSparkline;
