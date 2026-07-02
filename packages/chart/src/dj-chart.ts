import { html, svg, nothing, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import DojoElement, { reducedMotion } from "@dojo-ng/dojo-element";
import { LocaleController, formatNumber } from "@dojo-ng/i18n";
import styles from "./dj-chart.styles.js";
import type { ChartDatum, ChartSeries, ChartType, ChartMargin } from "./types.js";
import {
	buildScales,
	buildXYScales,
	radiusFor,
	pieArcs,
	seriesX,
	categories,
	cat,
	num,
	xCenter,
	linePath,
	areaPath,
	groupedBars,
	stackedBars,
	yTicks,
	ticksOf,
	summary,
	hasBars,
} from "./core.js";

const RAMP = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];
const MARGIN: ChartMargin = { top: 8, right: 12, bottom: 28, left: 44 };
// Right margin when a secondary axis is present, leaving room for its tick labels and title.
const RIGHT_AXIS_MARGIN = 48;

/**
 * `<dj-chart>` — a themeable, accessible SVG chart. Set `data` (array of rows) and `series`.
 * `type` selects the mark: cartesian (`line`, `area`, `bar`) reads `category-key` for x; x/y
 * (`scatter`, `bubble`) reads `x-key` for a numeric x (and `size-key` for bubble radius); radial
 * (`pie`, `donut`) draws one series as slices by category. `stacked` stacks bars and areas; a
 * series may override `type` for combos.
 *
 * Built on D3 math (scales, shapes) with the SVG owned here, so marks are themeable via
 * `--dj-*` tokens (a `--dj-chart-1..8` ramp) and `::part()`, and the chart is real DOM for
 * assistive tech. It exposes a visually-hidden data table as the accessible equivalent, carries
 * `role="img"` with a generated summary, and honors reduced motion. Not a form control.
 *
 * `legend-toggle` makes legend items toggle series visibility; `brush` adds an overview strip
 * below cartesian charts for selecting the visible category window (double-click resets).
 *
 * Parts: `plot`, `axis`, `grid`, `series`, `bar`, `line`, `point`, `slice`, `legend`, `legend-item`,
 * `brush-handle`, `tooltip`.
 * Events: `dj-hover` (detail `{ category }` or `null`; cartesian and radial), `dj-legend-toggle`
 * (detail `{ key, hidden }`).
 *
 * @cssprop [--dj-chart-height=18rem] - Overall chart height (width fills the container).
 * @cssprop [--dj-chart-1=#2563eb] - Categorical series color 1.
 * @cssprop [--dj-chart-2=#16a34a] - Categorical series color 2.
 * @cssprop [--dj-chart-3=#d97706] - Categorical series color 3.
 * @cssprop [--dj-chart-4=#dc2626] - Categorical series color 4.
 * @cssprop [--dj-chart-5=#7c3aed] - Categorical series color 5.
 * @cssprop [--dj-chart-6=#0891b2] - Categorical series color 6.
 * @cssprop [--dj-chart-7=#db2777] - Categorical series color 7.
 * @cssprop [--dj-chart-8=#65a30d] - Categorical series color 8.
 */
export class DjChart extends DojoElement {
	static override styles = [styles, reducedMotion];
	static override version = "0.1.0";

	@property({ attribute: false }) data: ChartDatum[] = [];
	@property({ attribute: false }) series: ChartSeries[] = [];
	@property({ attribute: "category-key" }) categoryKey = "";
	@property({ reflect: true }) type: ChartType = "line";
	@property({ type: Boolean }) stacked = false;
	@property({ attribute: "show-legend", type: Boolean }) showLegend = true;
	@property({ attribute: "show-grid", type: Boolean }) showGrid = true;
	@property({ attribute: "x-label" }) xLabel?: string;
	@property({ attribute: "y-label" }) yLabel?: string;
	/** Title for the secondary (right) y-axis, shown when a series sets `axis: "right"`. */
	@property({ attribute: "y-label-right" }) yLabelRight?: string;
	/** Accessible-name lead-in; the generated data summary is appended. */
	@property() label?: string;
	/** Show point markers at each datum on line and area series. */
	@property({ type: Boolean }) markers = false;
	/** Numeric x accessor for scatter/bubble charts. */
	@property({ attribute: "x-key" }) xKey = "";
	/** Numeric accessor for bubble radius (area-encoded). */
	@property({ attribute: "size-key" }) sizeKey?: string;
	/** Donut/pie hole size as a fraction of the radius (0 = pie); donut defaults to 0.6. */
	@property({ attribute: "inner-radius", type: Number }) innerRadius?: number;
	/** Make legend items toggle series visibility (cartesian and x/y charts). */
	@property({ attribute: "legend-toggle", type: Boolean }) legendToggle = false;
	/** Show a brush strip below cartesian charts to select the visible category window. */
	@property({ type: Boolean }) brush = false;
	/** Intl number-format options for y-axis ticks and tooltip values (locale-aware). */
	@property({ attribute: false }) numberFormat?: Intl.NumberFormatOptions;
	/** Override y value formatting; takes precedence over numberFormat and the locale. */
	@property({ attribute: false }) formatY?: (value: number) => string;
	/** Override x category-label formatting. */
	@property({ attribute: false }) formatX?: (category: string) => string;

	@state() private w = 0;
	@state() private h = 0;
	@state() private hovered: string | null = null;
	@state() private hoverPt: { si: number; ri: number } | null = null;
	@state() private hiddenKeys = new Set<string>();
	@state() private view: { start: number; end: number } | null = null;

	#ro?: ResizeObserver;
	// Re-renders the chart when the document/ancestor locale changes, and supplies the
	// active locale for tick and tooltip number formatting.
	#i18n = new LocaleController(this);
	// Active brush-handle drag, if any.
	#brushDrag?: { mode: "start" | "end" | "pan"; n: number; origStart: number; origEnd: number; x0: number };

	/** Format a y value for ticks and tooltips: explicit override, else locale-aware Intl. */
	private fmtY(v: number): string {
		return this.formatY ? this.formatY(v) : formatNumber(v, this.#i18n.locale, this.numberFormat);
	}
	/** Format an x category label: explicit override, else the category string as-is. */
	private fmtX(c: string): string {
		return this.formatX ? this.formatX(c) : c;
	}

	override connectedCallback() {
		super.connectedCallback();
		this.#ro = new ResizeObserver((entries) => {
			const r = entries[0]?.contentRect;
			// Ignore zero-size callbacks (transient reflow or a detached node); keep the last
			// good measurement so the chart never collapses back to the empty state.
			if (r && r.width > 0 && r.height > 0) {
				this.w = Math.round(r.width);
				this.h = Math.round(r.height);
			}
		});
		// Measure the plot box (not the host), so the legend's height is excluded from the
		// chart area. The plot element is always rendered, so it exists after first paint.
		void this.updateComplete.then(() => {
			const plot = this.renderRoot?.querySelector(".plot");
			if (!plot || !this.isConnected) return;
			// Seed the size synchronously so the chart paints even where ResizeObserver
			// doesn't deliver an initial callback (e.g. a hidden/background tab), then keep
			// it in sync via the observer.
			const r = plot.getBoundingClientRect();
			if (r.width > 0 && r.height > 0) {
				this.w = Math.round(r.width);
				this.h = Math.round(r.height);
			}
			this.#ro?.observe(plot);
		});
	}
	override disconnectedCallback() {
		super.disconnectedCallback();
		this.#ro?.disconnect();
		this.#ro = undefined;
	}

	private color(s: ChartSeries, i: number): string {
		return s.color ?? `var(--dj-chart-${(i % 8) + 1}, ${RAMP[i % RAMP.length]})`;
	}
	/** Color for a pie/donut slice by category index (no per-series color in radial charts). */
	private sliceColor(i: number): string {
		return `var(--dj-chart-${(i % 8) + 1}, ${RAMP[i % RAMP.length]})`;
	}
	private seriesType(s: ChartSeries): ChartType {
		return s.type ?? this.type;
	}
	/** Which rendering family the chart type belongs to. */
	private group(): "cartesian" | "xy" | "radial" {
		if (this.type === "pie" || this.type === "donut") return "radial";
		if (this.type === "scatter" || this.type === "bubble") return "xy";
		return "cartesian";
	}

	/** Toggle a series' visibility from the legend (when `legend-toggle` is set). */
	private toggleSeries(key: string) {
		const next = new Set(this.hiddenKeys);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		this.hiddenKeys = next;
		this.emit("dj-legend-toggle", { detail: { key, hidden: next.has(key) } });
	}

	/** The visible category window [start, end] (inclusive) for the brush, clamped to the data. */
	private viewRange(n: number): [number, number] {
		if (!this.brush || !this.view || n === 0) return [0, Math.max(0, n - 1)];
		const start = Math.max(0, Math.min(this.view.start, n - 1));
		const end = Math.max(start, Math.min(this.view.end, n - 1));
		return [start, end];
	}

	override render() {
		const cats = categories(this.data, this.categoryKey);
		const accName = `${this.label ? this.label + ". " : ""}${summary(this.type, this.series, cats)}`;
		const ready = this.w > 0 && this.h > 0 && this.data.length > 0 && this.series.length > 0;
		const showLegend = this.showLegend && this.series.length > 0;
		// The .plot box is ALWAYS this same node (only its contents vary), so the
		// ResizeObserver target stays stable across renders. The accessible table is always
		// present, so content is never missing before first paint.
		return html`
			<div class="plot">
				${ready ? this.renderPlot(cats, accName) : html`<div class="sr-only" role="img" aria-label=${accName}></div>`}
			</div>
			${ready && this.brush && this.group() === "cartesian" ? this.renderBrush() : nothing}
			${ready && showLegend ? this.renderLegend() : nothing}
			${this.renderTable(cats)}
		`;
	}

	private renderPlot(cats: string[], accName: string): TemplateResult {
		const W = this.w;
		const H = this.h;
		const fam = this.group();
		if (fam === "radial") return this.renderRadial(W, H, cats, accName);
		const innerH = Math.max(0, H - MARGIN.top - MARGIN.bottom);
		if (fam === "xy") return this.renderXY(W, H, Math.max(0, W - MARGIN.left - MARGIN.right), innerH, accName);
		// Cartesian. A secondary axis needs extra right margin for its tick labels.
		const hasRight = this.series.some((s) => s.axis === "right");
		const innerW = Math.max(0, W - MARGIN.left - (hasRight ? RIGHT_AXIS_MARGIN : MARGIN.right));
		// The brush window narrows the rendered data to a category range; the table keeps full data.
		const [vs, ve] = this.viewRange(this.data.length);
		const data = this.brush && this.view ? this.data.slice(vs, ve + 1) : this.data;
		const cats2 = categories(data, this.categoryKey);
		const scales = buildScales(data, this.series, this.categoryKey, this.type, this.stacked, innerW, innerH, this.hiddenKeys);
		const yOf = (i: number) => (this.series[i]?.axis === "right" && scales.yRight ? scales.yRight : scales.y);
		const ticks = yTicks(scales, 5);
		const yR = scales.yRight;
		let rightAxis: unknown = nothing;
		if (yR) {
			const sc = yR;
			rightAxis = svg`<g class="axis" part="axis">
				<line x1="${innerW}" y1="0" x2="${innerW}" y2="${innerH}"></line>
				${ticksOf(sc, 5).map((t) => svg`<text x="${innerW + 8}" y="${sc(t)}" text-anchor="start" dominant-baseline="middle">${this.fmtY(t)}</text>`)}
				${this.yLabelRight
					? svg`<text class="axis-title" transform="translate(${innerW + RIGHT_AXIS_MARGIN - 12},${innerH / 2}) rotate(90)" text-anchor="middle">${this.yLabelRight}</text>`
					: nothing}
			</g>`;
		}

		const bars = hasBars(this.series, this.type)
			? this.stacked
				? stackedBars(data, this.categoryKey, this.series, scales, this.hiddenKeys)
				: groupedBars(data, this.categoryKey, this.series, scales, yOf, this.hiddenKeys)
			: [];

		return html`
			<svg viewBox="0 0 ${W} ${H}" role="img" aria-label=${accName} part="plot">
				<g transform="translate(${MARGIN.left},${MARGIN.top})">
					${this.showGrid
						? svg`<g class="grid" part="grid">${ticks.map(
								(t) => svg`<line x1="0" x2="${innerW}" y1="${scales.y(t)}" y2="${scales.y(t)}"></line>`,
							)}</g>`
						: nothing}
					<g class="axis" part="axis">
						<line x1="0" y1="0" x2="0" y2="${innerH}"></line>
						${ticks.map(
							(t) => svg`<text x="-8" y="${scales.y(t)}" text-anchor="end" dominant-baseline="middle">${this.fmtY(t)}</text>`,
						)}
						<line x1="0" y1="${innerH}" x2="${innerW}" y2="${innerH}"></line>
						${cats2.map(
							(c) => svg`<text x="${xCenter(scales, c)}" y="${innerH + 18}" text-anchor="middle">${this.fmtX(c)}</text>`,
						)}
						${this.yLabel
							? svg`<text class="axis-title" transform="translate(${-MARGIN.left + 12},${innerH / 2}) rotate(-90)" text-anchor="middle">${this.yLabel}</text>`
							: nothing}
						${this.xLabel
							? svg`<text class="axis-title" x="${innerW / 2}" y="${innerH + MARGIN.bottom}" text-anchor="middle">${this.xLabel}</text>`
							: nothing}
					</g>
					${rightAxis}
					<g part="series">
						${this.series.map((s, i) => (this.hiddenKeys.has(s.key) ? nothing : this.renderSeries(s, i, scales, bars, yOf(i), data)))}
					</g>
					<g>
						${cats2.map(
							(c) => svg`<rect class="hit" x="${(scales.band ? (scales.xBand(c) ?? 0) : xCenter(scales, c) - 4)}" y="0" width="${scales.band ? scales.xBand.bandwidth() : 8}" height="${innerH}" @pointerenter=${() => this.onHover(c)} @pointerleave=${() => this.onHover(null)}></rect>`,
						)}
					</g>
				</g>
			</svg>
			${this.renderTooltip(scales, innerH)}
		`;
	}

	private renderSeries(s: ChartSeries, i: number, scales: ReturnType<typeof buildScales>, bars: ReturnType<typeof groupedBars>, yScale: ReturnType<typeof buildScales>["y"], data: ChartDatum[]) {
		const t = this.seriesType(s);
		const c = this.color(s, i);
		if (t === "line") {
			return svg`<path class="series-line" part="line" d=${linePath(data, this.categoryKey, s.key, scales, yScale)} stroke=${c}></path>${this.renderMarkers(data, s.key, c, scales, yScale)}`;
		}
		if (t === "area") {
			return svg`<path class="series-area" d=${areaPath(data, this.categoryKey, s.key, scales, yScale)} fill=${c}></path>
				<path class="series-line" part="line" d=${linePath(data, this.categoryKey, s.key, scales, yScale)} stroke=${c}></path>${this.renderMarkers(data, s.key, c, scales, yScale)}`;
		}
		// bar: render the rects belonging to this series index (already on its axis via groupedBars)
		return svg`${bars
			.filter((b) => b.seriesIndex === i)
			.map((b) => svg`<rect class="bar" part="bar" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill=${c}></rect>`)}`;
	}

	/** Point markers at each datum for line/area series, shown when `markers` is set. */
	private renderMarkers(data: ChartDatum[], key: string, color: string, scales: ReturnType<typeof buildScales>, yScale: ReturnType<typeof buildScales>["y"] = scales.y) {
		if (!this.markers) return nothing;
		return svg`${data.map((row) => {
			const c = cat(row, this.categoryKey);
			return svg`<circle class="marker" part="point" cx="${xCenter(scales, c)}" cy="${yScale(num(row[key]))}" r="3.5" fill=${color}></circle>`;
		})}`;
	}

	/** Scatter and bubble: linear x and y axes with point (or size-encoded) marks. */
	private renderXY(W: number, H: number, innerW: number, innerH: number, accName: string): TemplateResult {
		const vis = this.series.filter((s) => !this.hiddenKeys.has(s.key));
		const scales = buildXYScales(this.data, vis.length ? vis : this.series, this.xKey, innerW, innerH);
		const r = radiusFor(this.data, this.type === "bubble" ? this.sizeKey : undefined);
		const xticks = scales.x.ticks(5);
		const yticks = scales.y.ticks(5);
		return html`
			<svg viewBox="0 0 ${W} ${H}" role="img" aria-label=${accName} part="plot">
				<g transform="translate(${MARGIN.left},${MARGIN.top})">
					${this.showGrid
						? svg`<g class="grid" part="grid">
								${yticks.map((t) => svg`<line x1="0" x2="${innerW}" y1="${scales.y(t)}" y2="${scales.y(t)}"></line>`)}
								${xticks.map((t) => svg`<line x1="${scales.x(t)}" x2="${scales.x(t)}" y1="0" y2="${innerH}"></line>`)}
							</g>`
						: nothing}
					<g class="axis" part="axis">
						<line x1="0" y1="0" x2="0" y2="${innerH}"></line>
						${yticks.map((t) => svg`<text x="-8" y="${scales.y(t)}" text-anchor="end" dominant-baseline="middle">${this.fmtY(t)}</text>`)}
						<line x1="0" y1="${innerH}" x2="${innerW}" y2="${innerH}"></line>
						${xticks.map((t) => svg`<text x="${scales.x(t)}" y="${innerH + 18}" text-anchor="middle">${this.fmtY(t)}</text>`)}
						${this.yLabel
							? svg`<text class="axis-title" transform="translate(${-MARGIN.left + 12},${innerH / 2}) rotate(-90)" text-anchor="middle">${this.yLabel}</text>`
							: nothing}
						${this.xLabel
							? svg`<text class="axis-title" x="${innerW / 2}" y="${innerH + MARGIN.bottom}" text-anchor="middle">${this.xLabel}</text>`
							: nothing}
					</g>
					<g part="series">
						${this.series.map((s, si) => {
							if (this.hiddenKeys.has(s.key)) return nothing;
							const c = this.color(s, si);
							const xk = seriesX(s, this.xKey);
							return svg`${this.data.map(
								(row, ri) => svg`<circle class="point-mark" part="point" cx="${scales.x(num(row[xk]))}" cy="${scales.y(num(row[s.key]))}" r="${this.type === "bubble" ? r(num(row[s.sizeKey ?? this.sizeKey ?? ""])) : 4}" fill=${c}
									@pointerenter=${() => (this.hoverPt = { si, ri })} @pointerleave=${() => (this.hoverPt = null)}></circle>`,
							)}`;
						})}
					</g>
				</g>
			</svg>
			${this.renderXYTooltip(scales, r)}
		`;
	}

	private renderXYTooltip(scales: ReturnType<typeof buildXYScales>, r: (v: number) => number): TemplateResult {
		const pt = this.hoverPt;
		if (!pt) return html`<div class="tooltip" part="tooltip" hidden></div>`;
		const s = this.series[pt.si];
		const row = this.data[pt.ri];
		if (!s || !row) return html`<div class="tooltip" part="tooltip" hidden></div>`;
		const xk = seriesX(s, this.xKey);
		const xv = num(row[xk]);
		const yv = num(row[s.key]);
		const left = MARGIN.left + scales.x(xv);
		const top = MARGIN.top + scales.y(yv);
		const sizeKey = s.sizeKey ?? this.sizeKey;
		void r;
		return html`<div class="tooltip" part="tooltip" style=${`left:${left}px; top:${top}px`}>
			<strong>${s.label ?? s.key}</strong>
			<div class="tooltip-row">${this.xLabel ?? xk}: ${this.fmtY(xv)}</div>
			<div class="tooltip-row">${this.yLabel ?? s.key}: ${this.fmtY(yv)}</div>
			${this.type === "bubble" && sizeKey ? html`<div class="tooltip-row">${sizeKey}: ${this.fmtY(num(row[sizeKey]))}</div>` : nothing}
		</div>`;
	}

	/** Pie and donut: arc slices from the first series, with a category legend and slice tooltip. */
	private renderRadial(W: number, H: number, cats: string[], accName: string): TemplateResult {
		const valueKey = this.series[0]?.key ?? "";
		const R = Math.max(0, Math.min(W, H) / 2 - 4);
		const ratio = this.type === "donut" ? this.innerRadius ?? 0.6 : this.innerRadius ?? 0;
		const slices = pieArcs(this.data, this.categoryKey, valueKey, R, Math.max(0, Math.min(0.95, ratio)) * R);
		return html`
			<svg viewBox="0 0 ${W} ${H}" role="img" aria-label=${accName} part="plot">
				<g transform="translate(${W / 2},${H / 2})" part="series">
					${slices.map(
						(sl) => svg`<path class="slice" part="slice" d=${sl.d} fill=${this.sliceColor(sl.index)}
							@pointerenter=${() => this.onHover(sl.category)} @pointerleave=${() => this.onHover(null)}></path>`,
					)}
				</g>
			</svg>
			${this.renderRadialTooltip(valueKey, W)}
		`;
	}

	private renderRadialTooltip(valueKey: string, W: number): TemplateResult {
		if (this.hovered == null) return html`<div class="tooltip" part="tooltip" hidden></div>`;
		const row = this.data.find((d) => cat(d, this.categoryKey) === this.hovered);
		return html`<div class="tooltip" part="tooltip" style=${`left:${W / 2}px; top:${MARGIN.top}px`}>
			<strong>${this.fmtX(this.hovered)}</strong>
			<div class="tooltip-row">${this.fmtY(row ? num(row[valueKey]) : 0)}</div>
		</div>`;
	}

	// ---- brush strip (visible category window) ----

	private brushInnerW(W: number): number {
		const hasRight = this.series.some((s) => s.axis === "right");
		return Math.max(1, W - MARGIN.left - (hasRight ? RIGHT_AXIS_MARGIN : MARGIN.right));
	}
	/** Map a clientX to a category index using the brush svg's box. */
	private brushIndexAt(clientX: number, svg: SVGSVGElement, n: number): number {
		const rect = svg.getBoundingClientRect();
		const innerW = this.brushInnerW(rect.width);
		const frac = Math.max(0, Math.min(1, (clientX - rect.left - MARGIN.left) / innerW));
		return Math.round(frac * (n - 1));
	}
	private onBrushDown(mode: "start" | "end" | "pan", e: PointerEvent) {
		const n = this.data.length;
		const [vs, ve] = this.viewRange(n);
		this.#brushDrag = { mode, n, origStart: vs, origEnd: ve, x0: e.clientX };
		(e.target as Element).setPointerCapture?.(e.pointerId);
		e.preventDefault();
	}
	private onBrushMove(e: PointerEvent) {
		const d = this.#brushDrag;
		if (!d) return;
		const svg = (e.target as SVGElement).ownerSVGElement;
		if (!svg) return;
		const idx = this.brushIndexAt(e.clientX, svg, d.n);
		if (d.mode === "start") this.view = { start: Math.min(idx, d.origEnd), end: d.origEnd };
		else if (d.mode === "end") this.view = { start: d.origStart, end: Math.max(idx, d.origStart) };
		else {
			const delta = idx - this.brushIndexAt(d.x0, svg, d.n);
			let s = d.origStart + delta;
			let en = d.origEnd + delta;
			if (s < 0) { en -= s; s = 0; }
			if (en > d.n - 1) { s -= en - (d.n - 1); en = d.n - 1; }
			this.view = { start: Math.max(0, s), end: Math.min(d.n - 1, en) };
		}
	}
	private onBrushUp(e: PointerEvent) {
		if (!this.#brushDrag) return;
		(e.target as Element).releasePointerCapture?.(e.pointerId);
		this.#brushDrag = undefined;
	}
	private onBrushKey(which: "start" | "end", e: KeyboardEvent) {
		const n = this.data.length;
		let [vs, ve] = this.viewRange(n);
		const step = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
		if (step === 0 && e.key !== "Home" && e.key !== "End") return;
		e.preventDefault();
		if (which === "start") {
			if (e.key === "Home") vs = 0;
			else if (e.key === "End") vs = ve;
			else vs = Math.max(0, Math.min(ve, vs + step));
		} else {
			if (e.key === "End") ve = n - 1;
			else if (e.key === "Home") ve = vs;
			else ve = Math.min(n - 1, Math.max(vs, ve + step));
		}
		this.view = { start: vs, end: ve };
	}

	/** The overview strip with two draggable, keyboard-focusable handles. Double-click resets. */
	private renderBrush(): TemplateResult {
		const W = this.w;
		const n = this.data.length;
		if (n < 2) return html``;
		const Hb = 40;
		const innerW = this.brushInnerW(W);
		const xOf = (i: number) => (i / (n - 1)) * innerW;
		const [vs, ve] = this.viewRange(n);
		const first = this.series.find((s) => !this.hiddenKeys.has(s.key)) ?? this.series[0];
		const vals = first ? this.data.map((d) => num(d[first.key])) : [];
		const vmax = Math.max(1, ...vals);
		const vmin = Math.min(0, ...vals);
		const yb = (v: number) => Hb - 6 - ((v - vmin) / (vmax - vmin || 1)) * (Hb - 12);
		const ctx = first && vals.length > 1 ? vals.map((v, i) => `${xOf(i)},${yb(v)}`).join(" ") : "";
		return html`<svg class="brush" viewBox="0 0 ${W} ${Hb}" width="100%" height=${Hb} role="group" aria-label="Visible range"
			@pointermove=${(e: PointerEvent) => this.onBrushMove(e)} @pointerup=${(e: PointerEvent) => this.onBrushUp(e)} @dblclick=${() => { this.view = null; }}>
			<g transform="translate(${MARGIN.left},0)">
				<rect class="brush-track" x="0" y="2" width="${innerW}" height="${Hb - 4}" rx="3"></rect>
				${ctx ? svg`<polyline class="brush-context" points="${ctx}"></polyline>` : nothing}
				<rect class="brush-window" x="${xOf(vs)}" y="2" width="${Math.max(2, xOf(ve) - xOf(vs))}" height="${Hb - 4}"
					@pointerdown=${(e: PointerEvent) => this.onBrushDown("pan", e)}></rect>
				<rect class="brush-handle" part="brush-handle" x="${xOf(vs) - 4}" y="2" width="8" height="${Hb - 4}" rx="2"
					role="slider" tabindex="0" aria-label="Range start" aria-valuemin="0" aria-valuemax="${n - 1}" aria-valuenow="${vs}"
					@pointerdown=${(e: PointerEvent) => this.onBrushDown("start", e)} @keydown=${(e: KeyboardEvent) => this.onBrushKey("start", e)}></rect>
				<rect class="brush-handle" part="brush-handle" x="${xOf(ve) - 4}" y="2" width="8" height="${Hb - 4}" rx="2"
					role="slider" tabindex="0" aria-label="Range end" aria-valuemin="0" aria-valuemax="${n - 1}" aria-valuenow="${ve}"
					@pointerdown=${(e: PointerEvent) => this.onBrushDown("end", e)} @keydown=${(e: KeyboardEvent) => this.onBrushKey("end", e)}></rect>
			</g>
		</svg>`;
	}

	private renderLegend(): TemplateResult {
		// Radial charts have no series; the legend lists categories (slices) instead.
		if (this.group() === "radial") {
			const cats = categories(this.data, this.categoryKey);
			return html`<div class="legend" part="legend">
				${cats.map(
					(c, i) => html`<span class="legend-item"><span class="legend-swatch" style=${`background:${this.sliceColor(i)}`}></span>${this.fmtX(c)}</span>`,
				)}
			</div>`;
		}
		if (this.legendToggle) {
			// Interactive legend: each item is a button that toggles its series' visibility.
			return html`<div class="legend" part="legend">
				${this.series.map((s, i) => {
					const off = this.hiddenKeys.has(s.key);
					return html`<button
						type="button"
						class="legend-item legend-item--button ${off ? "legend-item--off" : ""}"
						part="legend-item"
						aria-pressed=${off ? "false" : "true"}
						@click=${() => this.toggleSeries(s.key)}
					><span class="legend-swatch" style=${`background:${this.color(s, i)}`}></span>${s.label ?? s.key}</button>`;
				})}
			</div>`;
		}
		return html`<div class="legend" part="legend">
			${this.series.map(
				(s, i) => html`<span class="legend-item"><span class="legend-swatch" style=${`background:${this.color(s, i)}`}></span>${s.label ?? s.key}</span>`,
			)}
		</div>`;
	}

	private renderTooltip(scales: ReturnType<typeof buildScales>, innerH: number): TemplateResult {
		if (this.hovered == null) return html`<div class="tooltip" part="tooltip" hidden></div>`;
		const c = this.hovered;
		const row = this.data.find((d) => cat(d, this.categoryKey) === c);
		const left = MARGIN.left + xCenter(scales, c);
		return html`<div
			class="tooltip"
			part="tooltip"
			style=${`left:${left}px; top:${MARGIN.top}px`}
		>
			<strong>${this.fmtX(c)}</strong>
			${this.series.map(
				(s, i) => html`<div class="tooltip-row"><span class="tooltip-swatch" style=${`background:${this.color(s, i)}`}></span>${s.label ?? s.key}: ${this.fmtY(row ? num(row[s.key]) : 0)}</div>`,
			)}
		</div>`;
	}

	private renderTable(cats: string[]): TemplateResult {
		// x/y charts have a numeric x column instead of a category column.
		if (this.group() === "xy") {
			const xk = this.xKey || "x";
			return html`<table class="sr-only">
				<caption>${this.label ?? summary(this.type, this.series, cats)}</caption>
				<thead>
					<tr><th>${xk}</th>${this.series.map((s) => html`<th>${s.label ?? s.key}</th>`)}</tr>
				</thead>
				<tbody>
					${this.data.map(
						(row) => html`<tr><th scope="row">${num(row[seriesX(this.series[0] ?? { key: "" }, this.xKey)])}</th>${this.series.map((s) => html`<td>${num(row[s.key])}</td>`)}</tr>`,
					)}
				</tbody>
			</table>`;
		}
		return html`<table class="sr-only">
			<caption>${this.label ?? summary(this.type, this.series, cats)}</caption>
			<thead>
				<tr><th>${this.categoryKey || "Category"}</th>${this.series.map((s) => html`<th>${s.label ?? s.key}</th>`)}</tr>
			</thead>
			<tbody>
				${this.data.map(
					(row) => html`<tr><th scope="row">${cat(row, this.categoryKey)}</th>${this.series.map((s) => html`<td>${num(row[s.key])}</td>`)}</tr>`,
				)}
			</tbody>
		</table>`;
	}

	private onHover(c: string | null) {
		this.hovered = c;
		this.emit("dj-hover", { detail: { category: c } });
	}
}
export default DjChart;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-hover": CustomEvent<{ category: string | null }>;
		"dj-legend-toggle": CustomEvent<{ key: string; hidden: boolean }>;
	}
}
