import { html, svg, nothing, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { ref } from "lit/directives/ref.js";
import DojoElement, { reducedMotion } from "@dojo-ng/dojo-element";
import { LocaleController, formatNumber, messages, registerDefaults } from "@dojo-ng/i18n";
import styles from "./dj-chart.styles.js";
import type { ChartDatum, ChartSeries, ChartType, ChartMargin, ChartRenderer, MissingMode } from "./types.js";
import {
	buildScales,
	buildXYScales,
	radiusFor,
	pieArcs,
	seriesX,
	categories,
	cat,
	num,
	val,
	xCenter,
	linePath,
	areaPath,
	groupedBars,
	stackedBars,
	buildScalesH,
	horizontalBars,
	horizontalStackedBars,
	centerLabelSize,
	centerSubLabelSize,
	yTicks,
	ticksOf,
	summary,
	accessibleName,
	hasBars,
	seriesPoints,
	xyPoints,
	drawSeries,
	effectiveRenderer,
	type CanvasMark,
} from "./core.js";
import { serializeChartSvg, rasterizeSvg } from "./export.js";

registerDefaults("dj", { noValue: "No value" });

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
 * {@link appendData} appends rows for cheap live updates without rebuilding the `data` array;
 * `max-points` bounds how much history it keeps.
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
	/** Bar orientation. `"horizontal"` puts categories on the Y axis and values on the X axis;
	 * it applies only to `bar` charts and ignores `brush` and a secondary (right) axis (v1). */
	@property({ reflect: true }) orientation: "vertical" | "horizontal" = "vertical";
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
	/** Text centered in a donut hole (ignored for other types). Also appended to the aria-label. */
	@property({ attribute: "center-label" }) centerLabel?: string;
	/** Smaller text below the donut center label. */
	@property({ attribute: "center-sub-label" }) centerSubLabel?: string;
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
	/** Cap on `data` rows kept after {@link appendData} appends; 0 (default) is unbounded. Old
	 * rows are trimmed from the front, so the chart shows a sliding window of the most recent data. */
	@property({ attribute: "max-points", type: Number }) maxPoints = 0;
	/** Opt-in escape hatch for very large series: `"canvas"` draws series marks on a `<canvas>`
	 * instead of SVG nodes (axes, grid, legend, and tooltip stay SVG/DOM either way). Honored only
	 * for `line`/`area`/`scatter` (not `bar`, `stacked`, pie/donut, `bubble`, or a combo where any
	 * series overrides to `bar`) and only outside `forced-colors: active`; unsupported combinations
	 * fall back to `svg` (a console warning for an unsupported type, none for forced-colors — see
	 * the CV decisions). */
	@property({ reflect: true }) renderer: ChartRenderer = "svg";
	/** How a missing (non-finite) cell is drawn. `"gap"` (the default) breaks the line/area and
	 * omits the marker, bar, and point — the honest reading, since the alternative silently plots
	 * a zero the data never gave. `"connect"` spans the hole in a line/area instead of breaking it
	 * (bars, markers, and points are still omitted). `"zero"` treats it as a real zero — the
	 * pre-Track-V behavior, kept as an escape hatch. Per-series override on `ChartSeries.missing`. */
	@property({ reflect: true }) missing: MissingMode = "gap";

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
	// Keys of already-emitted console.warn messages, so each is logged at most once per element.
	#warned = new Set<string>();
	// Rows queued by appendData() awaiting the next scheduled flush.
	#pendingAppend: ChartDatum[] = [];
	#appendFlushScheduled = false;
	// True only for the render that commits an appendData flush, so that render can suppress
	// the bar y/height transition and the series-enter animation (both pure CSS, driven off the
	// "no-transition" class below) — a streamed append should snap into place, not animate.
	#streaming = false;
	// The canvas element, when the canvas renderer is active; set/cleared by the `ref()` in
	// renderCanvas() as the element mounts/unmounts.
	#canvasEl?: HTMLCanvasElement;

	/** Log a message once per element (keyed), for unsupported option combinations. */
	private warnOnce(key: string, message: string) {
		if (this.#warned.has(key)) return;
		this.#warned.add(key);
		console.warn(message);
	}

	/** True when this chart should render as horizontal bars (orientation set AND a bar chart). */
	private get isHBar(): boolean {
		return this.orientation === "horizontal" && this.type === "bar";
	}

	// Warn once (and ignore) for the documented horizontal-orientation and canvas-renderer limitations.
	override willUpdate() {
		if (this.orientation === "horizontal") {
			if (this.type !== "bar") {
				this.warnOnce("h-nonbar", `dj-chart: orientation="horizontal" applies only to bar charts; ignoring orientation for type="${this.type}".`);
			} else {
				if (this.brush) this.warnOnce("h-brush", `dj-chart: brush is not supported with orientation="horizontal"; ignoring brush.`);
				if (this.series.some((s) => s.axis === "right")) this.warnOnce("h-right-axis", `dj-chart: a secondary (right) axis is not supported with orientation="horizontal"; ignoring it.`);
			}
		}
		if (this.renderer === "canvas" && !this.canvasEligibleType) {
			this.warnOnce("canvas-unsupported", `dj-chart: renderer="canvas" is not supported for type="${this.type}" with the current configuration (bar, stacked, pie/donut, bubble, and a series overriding to "bar" all stay svg); falling back to svg.`);
		}
	}

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
	/** The resolved missing-value mode for a series: its own override, else the chart's `missing`. */
	private missingOf(s: ChartSeries): MissingMode {
		return s.missing ?? this.missing;
	}
	/** The localized "no value" string (decision 23), for a missing cell's `aria-label`. */
	private noValueLabel(): string {
		return messages.resolve("dj", this.#i18n.locale, "noValue") ?? "No value";
	}
	/** A tooltip/table cell's content for one series' value: the em dash with a localized
	 * "no value" `aria-label` when the cell is missing under a non-`"zero"` mode, else the raw
	 * value (`fmt` formats it — `this.fmtY` for a tooltip, identity for the raw table cell). */
	private valueCell(raw: number | null, s: ChartSeries, fmt: (v: number) => unknown = (v) => v) {
		if (raw === null && this.missingOf(s) !== "zero") {
			return html`<span aria-label=${this.noValueLabel()}>&mdash;</span>`;
		}
		return fmt(raw ?? 0);
	}
	/** Which rendering family the chart type belongs to. */
	private group(): "cartesian" | "xy" | "radial" {
		if (this.type === "pie" || this.type === "donut") return "radial";
		if (this.type === "scatter" || this.type === "bubble") return "xy";
		return "cartesian";
	}

	/** Whether this chart's TYPE (independent of `renderer`) could ever use the canvas mark path:
	 * `line`/`area`/`scatter` only. `stacked` and any series resolving to `bar` (a plain bar chart
	 * or a combo where one series overrides to `bar`) are folded in here as an effective `"bar"`,
	 * reusing {@link hasBars} rather than re-deriving series-override logic. */
	private get canvasEligibleType(): boolean {
		const t = this.stacked || hasBars(this.series, this.type) ? "bar" : this.type;
		return t === "line" || t === "area" || t === "scatter";
	}

	/** The renderer actually in effect for this render: `canvas` only when requested, eligible,
	 * and `forced-colors: active` isn't (a canvas can't honor `CanvasText` on its own). */
	private get effectiveRendererNow(): ChartRenderer {
		const t = this.stacked || hasBars(this.series, this.type) ? "bar" : this.type;
		const forcedColors = typeof matchMedia === "function" && matchMedia("(forced-colors: active)").matches;
		return effectiveRenderer(this.renderer, t, forcedColors);
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

	/** Schedule `fn` for the next animation frame (a microtask when rAF is unavailable, e.g. a
	 * non-browser test runner). Kept as one small, overridable seam — tests replace this method
	 * to drive the scheduling deterministically instead of waiting on real frame timing. */
	protected scheduleFrame(fn: () => void): void {
		if (typeof requestAnimationFrame === "function") requestAnimationFrame(fn);
		else queueMicrotask(fn);
	}

	/** Append rows without rebuilding `data` yourself: cheap live updates for streaming sources.
	 * Multiple calls within the same animation frame coalesce into a single `data` assignment.
	 * Trims from the front to `max-points` when set, and clears an active brush selection (its
	 * indices are into the pre-append data and would otherwise point at the wrong window). */
	appendData(rows: ChartDatum[]): void {
		if (!rows.length) return;
		this.#pendingAppend.push(...rows);
		if (this.#appendFlushScheduled) return;
		this.#appendFlushScheduled = true;
		this.scheduleFrame(() => this.#flushAppend());
	}

	#flushAppend(): void {
		this.#appendFlushScheduled = false;
		const rows = this.#pendingAppend;
		this.#pendingAppend = [];
		if (!rows.length) return;
		let next = this.data.concat(rows);
		if (this.maxPoints > 0 && next.length > this.maxPoints) {
			next = next.slice(next.length - this.maxPoints);
		}
		if (this.brush && this.view) this.view = null;
		this.#streaming = true;
		this.data = next;
		// The streamed render above commits with transitions suppressed; clear the marker on the
		// next frame so it never lingers over a later, ordinary `data` assignment.
		void this.updateComplete.then(() => {
			this.scheduleFrame(() => {
				this.#streaming = false;
				this.requestUpdate();
			});
		});
	}

	/** Whether the chart has a measured plot box and something to draw — shared by `render()` (the
	 *  placeholder-vs-plot choice) and `toSvg()` (its own early-return: exporting before this is
	 *  true would just serialize the `sr-only` placeholder, or find no `svg[part="plot"]` at all). */
	private get ready(): boolean {
		return this.w > 0 && this.h > 0 && this.data.length > 0 && this.series.length > 0;
	}

	override render() {
		const cats = categories(this.data, this.categoryKey);
		// Donut center label rides along in the accessible name so AT users hear the highlighted value.
		const centerForAria = this.type === "donut" ? this.centerLabel : undefined;
		const accName = accessibleName(this.label, this.type, this.series, cats, centerForAria);
		const ready = this.ready;
		const showLegend = this.showLegend && this.series.length > 0;
		// The .plot box is ALWAYS this same node (only its contents vary), so the
		// ResizeObserver target stays stable across renders. The accessible table is always
		// present, so content is never missing before first paint.
		const canvasNow = ready && this.effectiveRendererNow === "canvas";
		return html`
			<div class="plot">
				${ready ? this.renderPlot(cats, accName) : html`<div class="sr-only" role="img" aria-label=${accName}></div>`}
				${canvasNow ? this.renderCanvas() : nothing}
			</div>
			${ready && this.brush && this.group() === "cartesian" && !this.isHBar ? this.renderBrush() : nothing}
			${ready && showLegend ? this.renderLegend() : nothing}
			${this.renderTable(cats)}
		`;
	}

	/** The `<canvas>` overlay for series marks (see the CV decisions). Absolutely positioned over
	 * the plot rect via CSS (`pointer-events: none`, so the SVG hit-bands beneath it keep handling
	 * hover/tooltip). Sized and drawn in `#drawCanvas`, called from `updated()`. */
	private renderCanvas(): TemplateResult {
		return html`<canvas part="plot-canvas" class="plot-canvas" ${ref((el) => (this.#canvasEl = el as HTMLCanvasElement | undefined))}></canvas>`;
	}

	private renderPlot(cats: string[], accName: string): TemplateResult {
		const W = this.w;
		const H = this.h;
		const fam = this.group();
		if (fam === "radial") return this.renderRadial(W, H, cats, accName);
		const innerH = Math.max(0, H - MARGIN.top - MARGIN.bottom);
		if (fam === "xy") return this.renderXY(W, H, Math.max(0, W - MARGIN.left - MARGIN.right), innerH, accName);
		// Horizontal bars are a separate render so the vertical path below stays byte-identical.
		if (this.isHBar) return this.renderCartesianH(W, H, innerH, accName);
		// Cartesian. A secondary axis needs extra right margin for its tick labels.
		const hasRight = this.series.some((s) => s.axis === "right");
		const innerW = Math.max(0, W - MARGIN.left - (hasRight ? RIGHT_AXIS_MARGIN : MARGIN.right));
		// The brush window narrows the rendered data to a category range; the table keeps full data.
		const [vs, ve] = this.viewRange(this.data.length);
		const data = this.brush && this.view ? this.data.slice(vs, ve + 1) : this.data;
		const cats2 = categories(data, this.categoryKey);
		const scales = buildScales(data, this.series, this.categoryKey, this.type, this.stacked, innerW, innerH, this.hiddenKeys, this.missing);
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
				? stackedBars(data, this.categoryKey, this.series, scales, this.hiddenKeys, this.missing)
				: groupedBars(data, this.categoryKey, this.series, scales, yOf, this.hiddenKeys, this.missing)
			: [];

		return html`
			<svg viewBox="0 0 ${W} ${H}" role="img" aria-label=${accName} part="plot" class="${this.#streaming ? "no-transition" : ""}">
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
			${this.renderTooltip(scales)}
		`;
	}

	private renderSeries(s: ChartSeries, i: number, scales: ReturnType<typeof buildScales>, bars: ReturnType<typeof groupedBars>, yScale: ReturnType<typeof buildScales>["y"], data: ChartDatum[]) {
		const t = this.seriesType(s);
		const c = this.color(s, i);
		const missing = this.missingOf(s);
		// The canvas renderer draws the line/area path itself (see #cartesianCanvasMarks);
		// markers stay SVG regardless (an opt-in decoration, not the node-count-heavy default path).
		const onCanvas = this.effectiveRendererNow === "canvas";
		if (t === "line") {
			if (onCanvas) return this.renderMarkers(data, s.key, c, scales, yScale, missing);
			return svg`<path class="series-line" part="line" d=${linePath(data, this.categoryKey, s.key, scales, yScale, missing)} stroke=${c}></path>${this.renderMarkers(data, s.key, c, scales, yScale, missing)}`;
		}
		if (t === "area") {
			if (onCanvas) return this.renderMarkers(data, s.key, c, scales, yScale, missing);
			return svg`<path class="series-area" d=${areaPath(data, this.categoryKey, s.key, scales, yScale, missing)} fill=${c}></path>
				<path class="series-line" part="line" d=${linePath(data, this.categoryKey, s.key, scales, yScale, missing)} stroke=${c}></path>${this.renderMarkers(data, s.key, c, scales, yScale, missing)}`;
		}
		// bar: render the rects belonging to this series index (already on its axis via groupedBars)
		return svg`${bars
			.filter((b) => b.seriesIndex === i)
			.map((b) => svg`<rect class="bar" part="bar" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill=${c}></rect>`)}`;
	}

	/** Point markers at each datum for line/area series, shown when `markers` is set. A row whose
	 * value is missing draws no marker unless `missing` resolves to `"zero"`. */
	private renderMarkers(data: ChartDatum[], key: string, color: string, scales: ReturnType<typeof buildScales>, yScale: ReturnType<typeof buildScales>["y"] = scales.y, missing: MissingMode = "zero") {
		if (!this.markers) return nothing;
		return svg`${data.map((row) => {
			const raw = val(row[key]);
			if (raw === null && missing !== "zero") return nothing;
			const c = cat(row, this.categoryKey);
			return svg`<circle class="marker" part="point" cx="${xCenter(scales, c)}" cy="${yScale(raw ?? 0)}" r="3.5" fill=${color}></circle>`;
		})}`;
	}

	/** Horizontal bars: categories on the left (Y) axis, values on the bottom (X) axis, bars
	 * growing rightward from zero. Grouped and stacked both supported. Brush and a secondary
	 * axis are unsupported here (warned in willUpdate); axis labels track their DATA dimension,
	 * so `x-label` names the category axis and `y-label` the value axis in both orientations. */
	private renderCartesianH(W: number, H: number, innerH: number, accName: string): TemplateResult {
		const cats = categories(this.data, this.categoryKey);
		// Widen the left margin to fit category labels (no text metrics available; estimate from
		// the longest label, clamped so it never eats more than ~40% of the width).
		const longest = cats.reduce((m, c) => Math.max(m, this.fmtX(c).length), 0);
		const hLeft = Math.min(Math.max(MARGIN.left, longest * 7 + 14), Math.floor(W * 0.4));
		const innerW = Math.max(0, W - hLeft - MARGIN.right);
		const scales = buildScalesH(this.data, this.series, this.categoryKey, this.stacked, innerW, innerH, this.hiddenKeys, this.missing);
		const band = scales.yBand;
		const xticks = ticksOf(scales.x, 5);
		const bars = this.stacked
			? horizontalStackedBars(this.data, this.categoryKey, this.series, scales, this.hiddenKeys, this.missing)
			: horizontalBars(this.data, this.categoryKey, this.series, scales, this.hiddenKeys, this.missing);
		return html`
			<svg viewBox="0 0 ${W} ${H}" role="img" aria-label=${accName} part="plot" class="${this.#streaming ? "no-transition" : ""}">
				<g transform="translate(${hLeft},${MARGIN.top})">
					${this.showGrid
						? svg`<g class="grid" part="grid">${xticks.map(
								(t) => svg`<line x1="${scales.x(t)}" x2="${scales.x(t)}" y1="0" y2="${innerH}"></line>`,
							)}</g>`
						: nothing}
					<g class="axis" part="axis">
						<line x1="0" y1="0" x2="0" y2="${innerH}"></line>
						${cats.map(
							(c) => svg`<text x="-8" y="${(band(c) ?? 0) + band.bandwidth() / 2}" text-anchor="end" dominant-baseline="middle">${this.fmtX(c)}</text>`,
						)}
						<line x1="0" y1="${innerH}" x2="${innerW}" y2="${innerH}"></line>
						${xticks.map(
							(t) => svg`<text x="${scales.x(t)}" y="${innerH + 18}" text-anchor="middle">${this.fmtY(t)}</text>`,
						)}
						${this.xLabel
							? svg`<text class="axis-title" transform="translate(${-hLeft + 12},${innerH / 2}) rotate(-90)" text-anchor="middle">${this.xLabel}</text>`
							: nothing}
						${this.yLabel
							? svg`<text class="axis-title" x="${innerW / 2}" y="${innerH + MARGIN.bottom}" text-anchor="middle">${this.yLabel}</text>`
							: nothing}
					</g>
					<g part="series">
						${this.series.map((s, i) =>
							this.hiddenKeys.has(s.key)
								? nothing
								: svg`${bars
										.filter((b) => b.seriesIndex === i)
										.map((b) => svg`<rect class="bar" part="bar" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill=${this.color(s, i)}></rect>`)}`,
						)}
					</g>
					<g>
						${cats.map(
							(c) => svg`<rect class="hit" x="0" y="${band(c) ?? 0}" width="${innerW}" height="${band.bandwidth()}" @pointerenter=${() => this.onHover(c)} @pointerleave=${() => this.onHover(null)}></rect>`,
						)}
					</g>
				</g>
			</svg>
			${this.renderTooltipH(scales, hLeft, innerW)}
		`;
	}

	private renderTooltipH(scales: ReturnType<typeof buildScalesH>, hLeft: number, innerW: number): TemplateResult {
		if (this.hovered == null) return html`<div class="tooltip" part="tooltip" hidden></div>`;
		const c = this.hovered;
		const row = this.data.find((d) => cat(d, this.categoryKey) === c);
		const band = scales.yBand;
		const left = hLeft + innerW / 2;
		const top = MARGIN.top + (band(c) ?? 0) + band.bandwidth() / 2;
		return html`<div class="tooltip" part="tooltip" style=${`left:${left}px; top:${top}px`}>
			<strong>${this.fmtX(c)}</strong>
			${this.series.map((s, i) => {
				const raw = row ? val(row[s.key]) : 0;
				return html`<div class="tooltip-row"><span class="tooltip-swatch" style=${`background:${this.color(s, i)}`}></span>${s.label ?? s.key}: ${this.valueCell(raw, s, (v) => this.fmtY(v))}</div>`;
			})}
		</div>`;
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
							// Canvas draws the visible scatter dots (#xyCanvasMarks); these circles stay as
							// invisible hit targets, since hover here is per-point (unlike cartesian's
							// separate per-category hit-band rects, there's no other hit-testing layer).
							const onCanvas = this.effectiveRendererNow === "canvas";
							const missing = this.missingOf(s);
							return svg`${this.data.map((row, ri) => {
								const xv = val(row[xk]);
								const yv = val(row[s.key]);
								if ((xv === null || yv === null) && missing !== "zero") return nothing;
								return svg`<circle class="point-mark" part="point" cx="${scales.x(xv ?? 0)}" cy="${scales.y(yv ?? 0)}" r="${this.type === "bubble" ? r(num(row[s.sizeKey ?? this.sizeKey ?? ""])) : 4}" fill=${onCanvas ? "transparent" : c}
									@pointerenter=${() => (this.hoverPt = { si, ri })} @pointerleave=${() => (this.hoverPt = null)}></circle>`;
							})}`;
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
		const xv = val(row[xk]) ?? 0;
		const yv = val(row[s.key]) ?? 0;
		const left = MARGIN.left + scales.x(xv);
		const top = MARGIN.top + scales.y(yv);
		const sizeKey = s.sizeKey ?? this.sizeKey;
		void r;
		return html`<div class="tooltip" part="tooltip" style=${`left:${left}px; top:${top}px`}>
			<strong>${s.label ?? s.key}</strong>
			<div class="tooltip-row">${this.xLabel ?? xk}: ${this.fmtY(xv)}</div>
			<div class="tooltip-row">${this.yLabel ?? s.key}: ${this.fmtY(yv)}</div>
			${this.type === "bubble" && sizeKey ? html`<div class="tooltip-row">${sizeKey}: ${this.fmtY(val(row[sizeKey]) ?? 0)}</div>` : nothing}
		</div>`;
	}

	/** Pie and donut: arc slices from the first series, with a category legend and slice tooltip. */
	private renderRadial(W: number, H: number, cats: string[], accName: string): TemplateResult {
		const valueKey = this.series[0]?.key ?? "";
		const R = Math.max(0, Math.min(W, H) / 2 - 4);
		const ratio = this.type === "donut" ? this.innerRadius ?? 0.6 : this.innerRadius ?? 0;
		const innerR = Math.max(0, Math.min(0.95, ratio)) * R;
		const slices = pieArcs(this.data, this.categoryKey, valueKey, R, innerR, this.missingOf(this.series[0] ?? { key: valueKey }));
		// Center label: only for donut (a pie has no hole); sized from the hole radius, token-colored.
		const showCenter = this.type === "donut" && !!this.centerLabel;
		const labelSize = centerLabelSize(innerR);
		const subSize = centerSubLabelSize(innerR);
		const hasSub = !!this.centerSubLabel;
		// Render the value and sub-label as two INDEPENDENT, middle-anchored <text> elements — not
		// one <text> with a <tspan>. A shared text element puts the value run and the sub-label run
		// in one bidi paragraph under one text-anchor, which in RTL (e.g. ar-EG) reorders the runs
		// and clips the label. Separate, bidi-isolated runs each center on x=0 in any direction.
		return html`
			<svg viewBox="0 0 ${W} ${H}" role="img" aria-label=${accName} part="plot">
				<g transform="translate(${W / 2},${H / 2})" part="series">
					${slices.map(
						(sl) => svg`<path class="slice" part="slice" d=${sl.d} fill=${this.sliceColor(sl.index)}
							@pointerenter=${() => this.onHover(sl.category)} @pointerleave=${() => this.onHover(null)}></path>`,
					)}
					${showCenter
						? svg`<text class="center-label" part="center-label" x="0" y="${hasSub ? -subSize * 0.7 : 0}" text-anchor="middle" dominant-baseline="central" font-size="${labelSize}">${this.centerLabel}</text>${hasSub
								? svg`<text class="center-sub-label" part="center-sub-label" x="0" y="${labelSize * 0.55}" text-anchor="middle" dominant-baseline="central" font-size="${subSize}">${this.centerSubLabel}</text>`
								: nothing}`
						: nothing}
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
			<div class="tooltip-row">${this.fmtY(row ? (val(row[valueKey]) ?? 0) : 0)}</div>
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

	private renderTooltip(scales: ReturnType<typeof buildScales>): TemplateResult {
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
			${this.series.map((s, i) => {
				const raw = row ? val(row[s.key]) : 0;
				return html`<div class="tooltip-row"><span class="tooltip-swatch" style=${`background:${this.color(s, i)}`}></span>${s.label ?? s.key}: ${this.valueCell(raw, s, (v) => this.fmtY(v))}</div>`;
			})}
		</div>`;
	}

	private renderTable(cats: string[]): TemplateResult {
		// x/y charts have a numeric x column instead of a category column.
		if (this.group() === "xy") {
			const xk = this.xKey || "x";
			const first = this.series[0] ?? { key: "" };
			return html`<table class="sr-only">
				<caption>${this.label ?? summary(this.type, this.series, cats)}</caption>
				<thead>
					<tr><th>${xk}</th>${this.series.map((s) => html`<th>${s.label ?? s.key}</th>`)}</tr>
				</thead>
				<tbody>
					${this.data.map(
						(row) => html`<tr><th scope="row">${this.valueCell(val(row[seriesX(first, this.xKey)]), first)}</th>${this.series.map((s) => html`<td>${this.valueCell(val(row[s.key]), s)}</td>`)}</tr>`,
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
					(row) => html`<tr><th scope="row">${cat(row, this.categoryKey)}</th>${this.series.map((s) => html`<td>${this.valueCell(val(row[s.key]), s)}</td>`)}</tr>`,
				)}
			</tbody>
		</table>`;
	}

	private onHover(c: string | null) {
		this.hovered = c;
		this.emit("dj-hover", { detail: { category: c } });
	}

	// ---- canvas escape hatch (see the CV decisions) ----

	// Redraws whenever the canvas is active and ANY property change re-renders (data, resize,
	// legend toggle, and streamed appends all already go through a reactive property, so this
	// alone covers those triggers). A theme swap that changes NO other property has nothing to
	// hook here — call `requestUpdate()` (inherited from LitElement) after swapping `<dj-theme>`
	// or CSS custom properties to force a redraw with freshly-resolved colors.
	override updated() {
		if (this.#canvasEl && this.effectiveRendererNow === "canvas") this.drawCanvas();
	}

	/** Resolves a series' display color to a concrete value: canvas can't read `var(--dj-*)`
	 * itself, so this reads the same token {@link color} embeds via `getComputedStyle` on the
	 * host, falling back to the theme ramp exactly as `color` does when the token isn't set. */
	private resolveCanvasColor(s: ChartSeries, i: number, style: CSSStyleDeclaration): string {
		if (s.color) return s.color;
		const v = style.getPropertyValue(`--dj-chart-${(i % 8) + 1}`).trim();
		return v || RAMP[i % RAMP.length];
	}

	/** Canvas marks for a cartesian (line/area) chart: mirrors `renderPlot`'s own scale-building
	 * (brush window, secondary-axis margin) so the canvas geometry always lines up with the SVG
	 * axes it's drawn inside. */
	private cartesianCanvasMarks(W: number, H: number): CanvasMark[] {
		const innerH = Math.max(0, H - MARGIN.top - MARGIN.bottom);
		const hasRight = this.series.some((s) => s.axis === "right");
		const innerW = Math.max(0, W - MARGIN.left - (hasRight ? RIGHT_AXIS_MARGIN : MARGIN.right));
		const [vs, ve] = this.viewRange(this.data.length);
		const data = this.brush && this.view ? this.data.slice(vs, ve + 1) : this.data;
		const scales = buildScales(data, this.series, this.categoryKey, this.type, this.stacked, innerW, innerH, this.hiddenKeys, this.missing);
		const style = getComputedStyle(this);
		const marks: CanvasMark[] = [];
		this.series.forEach((s, i) => {
			if (this.hiddenKeys.has(s.key)) return;
			const t = this.seriesType(s);
			if (t !== "line" && t !== "area") return;
			const yScale = s.axis === "right" && scales.yRight ? scales.yRight : scales.y;
			const points = seriesPoints(data, this.categoryKey, s.key, scales, yScale, this.missingOf(s)).map((p) => ({ x: p.x + MARGIN.left, y: p.y + MARGIN.top }));
			marks.push({ type: t, color: this.resolveCanvasColor(s, i, style), points, baseline: yScale(0) + MARGIN.top });
		});
		return marks;
	}

	/** Canvas marks for an x/y (scatter) chart: mirrors `renderXY`'s own scale-building. */
	private xyCanvasMarks(W: number, H: number): CanvasMark[] {
		const innerH = Math.max(0, H - MARGIN.top - MARGIN.bottom);
		const innerW = Math.max(0, W - MARGIN.left - MARGIN.right);
		const vis = this.series.filter((s) => !this.hiddenKeys.has(s.key));
		const scales = buildXYScales(this.data, vis.length ? vis : this.series, this.xKey, innerW, innerH);
		const style = getComputedStyle(this);
		const marks: CanvasMark[] = [];
		this.series.forEach((s, i) => {
			if (this.hiddenKeys.has(s.key)) return;
			const xk = seriesX(s, this.xKey);
			const points = xyPoints(this.data, xk, s.key, scales).map((p) => ({ x: p.x + MARGIN.left, y: p.y + MARGIN.top, r: 4 }));
			marks.push({ type: "scatter", color: this.resolveCanvasColor(s, i, style), points });
		});
		return marks;
	}

	/** Sizes the canvas bitmap ×devicePixelRatio for retina crispness (unverifiable in happy-dom;
	 * confirmed in the browser per CV3) and draws the current marks via the pure {@link drawSeries}. */
	private drawCanvas(): void {
		const canvas = this.#canvasEl;
		if (!canvas || this.w <= 0 || this.h <= 0) return;
		const W = this.w;
		const H = this.h;
		const dpr = typeof devicePixelRatio === "number" && devicePixelRatio > 0 ? devicePixelRatio : 1;
		const bw = Math.round(W * dpr);
		const bh = Math.round(H * dpr);
		if (canvas.width !== bw) canvas.width = bw;
		if (canvas.height !== bh) canvas.height = bh;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		const marks = this.group() === "xy" ? this.xyCanvasMarks(W, H) : this.cartesianCanvasMarks(W, H);
		drawSeries(ctx, marks, W, H);
	}

	// ---- image export (toSvg / toPng) ----

	/** The resolved-token lookup {@link toSvg} needs: every `--dj-*` custom property
	 * `EXPORT_STYLE_RULES` (export.ts) or a series color could reference, read once via
	 * `getComputedStyle` on the host — the same technique {@link resolveCanvasColor} already uses
	 * for series colors, generalized to the full set the SVG export needs. */
	private exportTokens(): Record<string, string> {
		const style = getComputedStyle(this);
		const names = [
			"--dj-color-border", "--dj-color-text-muted", "--dj-color-neutral-200", "--dj-color-text", "--dj-color-background",
			...RAMP.map((_, i) => `--dj-chart-${i + 1}`),
		];
		const out: Record<string, string> = {};
		for (const name of names) {
			const v = style.getPropertyValue(name).trim();
			if (v) out[name] = v;
		}
		return out;
	}

	/**
	 * Serializes the current plot as a standalone SVG string: presentational styles inlined (no
	 * external stylesheet or theme tokens needed to render it correctly elsewhere) and, when the
	 * canvas renderer is actually in effect (`effectiveRendererNow`, never the raw `renderer`
	 * property — they differ whenever a fallback applies, and a chart that asked for canvas but
	 * fell back must not get an empty bitmap composited over it), its drawn bitmap composited in at
	 * the same position and stacking it renders on screen. `""` when the chart isn't {@link ready}
	 * (no data, zero measured size) — the same gate `render()` uses for its placeholder.
	 */
	toSvg(): string {
		if (!this.ready) return "";
		const svgEl = this.renderRoot?.querySelector('svg[part="plot"]') as SVGSVGElement | null;
		if (!svgEl) return "";
		const canvasImage = this.effectiveRendererNow === "canvas" && this.#canvasEl
			? this.#canvasEl.toDataURL("image/png")
			: undefined;
		return serializeChartSvg(svgEl, this.exportTokens(), { width: this.w, height: this.h, canvasImage });
	}

	/** Rasterizes {@link toSvg}'s output to a PNG `Blob` at `scale`× (default 2, for retina and for
	 * print). Rejects if the chart isn't {@link ready} ({@link toSvg} would return `""`). */
	async toPng(scale = 2): Promise<Blob> {
		const svgString = this.toSvg();
		if (!svgString) throw new Error("dj-chart: toPng() called before the chart is ready (no data or zero size).");
		return rasterizeSvg(svgString, this.w, this.h, scale);
	}
}
export default DjChart;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-hover": CustomEvent<{ category: string | null }>;
		"dj-legend-toggle": CustomEvent<{ key: string; hidden: boolean }>;
	}
}
