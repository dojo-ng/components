import { scaleLinear, scaleBand, scalePoint, scaleSqrt, type ScaleLinear, type ScaleBand, type ScalePoint } from "d3-scale";
import { line as d3line, area as d3area, stack as d3stack, arc as d3arc, pie as d3pie } from "d3-shape";
import { max as d3max, min as d3min, extent as d3extent } from "d3-array";
import type { ChartDatum, ChartSeries, ChartType, ChartRenderer } from "./types.js";

/** Coerce an unknown cell to a finite number (NaN/undefined become 0). */
export function num(v: unknown): number {
	const n = typeof v === "number" ? v : Number(v);
	return Number.isFinite(n) ? n : 0;
}

/** The category (x) label for a row. */
export function cat(row: ChartDatum, categoryKey: string): string {
	return String(row[categoryKey] ?? "");
}

export function categories(data: ChartDatum[], categoryKey: string): string[] {
	return data.map((d) => cat(d, categoryKey));
}

function effectiveType(s: ChartSeries, chartType: ChartType): ChartType {
	return s.type ?? chartType;
}

/** True when any series renders as bars (drives band vs point x-scale). */
export function hasBars(series: ChartSeries[], chartType: ChartType): boolean {
	return series.some((s) => effectiveType(s, chartType) === "bar");
}

export interface Scales {
	x: ScaleBand<string> | ScalePoint<string>;
	xBand: ScaleBand<string>; // always a band, for tick/grid spacing and bar math
	y: ScaleLinear<number, number>; // primary (left) axis
	yRight?: ScaleLinear<number, number>; // secondary (right) axis, when any series opts in
	cats: string[];
	band: boolean;
}

function axisOf(s: ChartSeries): "left" | "right" {
	return s.axis === "right" ? "right" : "left";
}

/** Numeric y domain for a set of series, summing per row when stacked. Always includes zero. */
function yDomain(data: ChartDatum[], series: ChartSeries[], stacked: boolean): [number, number] {
	if (!series.length) return [0, 0];
	let lo = 0;
	let hi = 0;
	if (stacked) {
		for (const row of data) {
			let pos = 0;
			let neg = 0;
			for (const s of series) {
				const v = num(row[s.key]);
				if (v >= 0) pos += v;
				else neg += v;
			}
			hi = Math.max(hi, pos);
			lo = Math.min(lo, neg);
		}
	} else {
		const hiMax = d3max(data, (row) => d3max(series, (s) => num(row[s.key])) ?? 0) ?? 0;
		const loMin = d3min(data, (row) => d3min(series, (s) => num(row[s.key])) ?? 0) ?? 0;
		hi = Math.max(0, hiMax);
		lo = Math.min(0, loMin);
	}
	return [lo, hi];
}

/** Build x and y scales for the plot area (innerW × innerH), accounting for stacking and a
 * secondary (right) y-axis when any series sets `axis: "right"`. */
export function buildScales(
	data: ChartDatum[],
	series: ChartSeries[],
	categoryKey: string,
	chartType: ChartType,
	stacked: boolean,
	innerW: number,
	innerH: number,
	hidden: Set<string> = new Set(),
): Scales {
	const cats = categories(data, categoryKey);
	const visible = series.filter((s) => !hidden.has(s.key));
	const band = hasBars(visible, chartType);
	const xBand = scaleBand<string>().domain(cats).range([0, innerW]).padding(0.2);
	const x = band ? xBand : scalePoint<string>().domain(cats).range([0, innerW]).padding(0.5);

	const left = visible.filter((s) => axisOf(s) === "left");
	const right = visible.filter((s) => axisOf(s) === "right");
	// Left scale spans the visible left-axis series (or all visible series when none are left).
	const y = scaleLinear().domain(yDomain(data, left.length ? left : visible, stacked)).range([innerH, 0]).nice();
	const yRight = right.length
		? scaleLinear().domain(yDomain(data, right, stacked)).range([innerH, 0]).nice()
		: undefined;
	return { x, xBand, y, yRight, cats, band };
}

/** Center x position for a category (works for both band and point scales). */
export function xCenter(scales: Scales, category: string): number {
	if (scales.band) {
		const b = scales.x as ScaleBand<string>;
		return (b(category) ?? 0) + b.bandwidth() / 2;
	}
	return (scales.x as ScalePoint<string>)(category) ?? 0;
}

/** SVG path `d` for a line series (`yScale` defaults to the primary axis). */
export function linePath(
	data: ChartDatum[],
	categoryKey: string,
	key: string,
	scales: Scales,
	yScale: ScaleLinear<number, number> = scales.y,
): string {
	const gen = d3line<ChartDatum>()
		.x((row) => xCenter(scales, cat(row, categoryKey)))
		.y((row) => yScale(num(row[key])));
	return gen(data) ?? "";
}

/** SVG path `d` for an area series (baseline at y=0; `yScale` defaults to the primary axis). */
export function areaPath(
	data: ChartDatum[],
	categoryKey: string,
	key: string,
	scales: Scales,
	yScale: ScaleLinear<number, number> = scales.y,
): string {
	const base = yScale(0);
	const gen = d3area<ChartDatum>()
		.x((row) => xCenter(scales, cat(row, categoryKey)))
		.y0(base)
		.y1((row) => yScale(num(row[key])));
	return gen(data) ?? "";
}

export interface CanvasPoint {
	x: number;
	y: number;
	/** Radius, for a scatter mark's point (ignored by line/area). */
	r?: number;
}

/** Point positions for a cartesian line/area series — the same x/y {@link linePath} plots, as
 * raw points instead of an SVG path string, for the canvas renderer (`yScale` defaults to the
 * primary axis). */
export function seriesPoints(
	data: ChartDatum[],
	categoryKey: string,
	key: string,
	scales: Scales,
	yScale: ScaleLinear<number, number> = scales.y,
): CanvasPoint[] {
	return data.map((row) => ({ x: xCenter(scales, cat(row, categoryKey)), y: yScale(num(row[key])) }));
}

export interface Bar {
	x: number;
	y: number;
	width: number;
	height: number;
	seriesIndex: number;
	category: string;
	value: number;
}

/** Rectangles for grouped (side-by-side) bars. `yOf` maps a series index to its axis y-scale
 * (defaults to the primary axis), so bar series on a secondary axis size correctly. */
export function groupedBars(
	data: ChartDatum[],
	categoryKey: string,
	series: ChartSeries[],
	scales: Scales,
	yOf: (seriesIndex: number) => ScaleLinear<number, number> = () => scales.y,
	hidden: Set<string> = new Set(),
): Bar[] {
	const band = scales.xBand;
	const barKeys = series
		.map((s, i) => ({ s, i }))
		.filter(({ s }) => (s.type ?? "bar") !== "line" && (s.type ?? "bar") !== "area" && !hidden.has(s.key));
	const inner = scaleBand<number>()
		.domain(barKeys.map((_, j) => j))
		.range([0, band.bandwidth()])
		.padding(0.1);
	const out: Bar[] = [];
	for (const row of data) {
		const c = cat(row, categoryKey);
		const gx = band(c) ?? 0;
		barKeys.forEach(({ s, i }, j) => {
			const ys = yOf(i);
			const y0 = ys(0);
			const v = num(row[s.key]);
			const yv = ys(v);
			out.push({
				x: gx + (inner(j) ?? 0),
				y: Math.min(y0, yv),
				width: inner.bandwidth(),
				height: Math.abs(yv - y0),
				seriesIndex: i,
				category: c,
				value: v,
			});
		});
	}
	return out;
}

/** Rectangles for stacked bars (uses d3-stack). Hidden series are dropped from the stack;
 * `seriesIndex` stays the original index so colors and series identity remain stable. */
export function stackedBars(
	data: ChartDatum[],
	categoryKey: string,
	series: ChartSeries[],
	scales: Scales,
	hidden: Set<string> = new Set(),
): Bar[] {
	const visible = series.map((s, i) => ({ s, i })).filter(({ s }) => !hidden.has(s.key));
	const keys = visible.map((v) => v.s.key);
	const layers = d3stack<ChartDatum>().keys(keys)(data);
	const band = scales.xBand;
	const out: Bar[] = [];
	layers.forEach((layer, li) => {
		const seriesIndex = visible[li].i;
		layer.forEach((seg, rowIndex) => {
			const c = cat(data[rowIndex], categoryKey);
			const yTop = scales.y(seg[1]);
			const yBot = scales.y(seg[0]);
			out.push({
				x: band(c) ?? 0,
				y: Math.min(yTop, yBot),
				width: band.bandwidth(),
				height: Math.abs(yBot - yTop),
				seriesIndex,
				category: c,
				value: num(data[rowIndex][visible[li].s.key]),
			});
		});
	});
	return out;
}

// ---- horizontal bars ----
//
// Horizontal is an ORIENTATION of `bar`, not a new chart type: the band scale moves to the
// Y axis (categories run top-to-bottom) and the linear value scale moves to the X axis (bars
// grow rightward from x=0). These are separate pure functions so the vertical path stays
// byte-identical; they return the same `Bar` rect shape with x/y/width/height swapped.

export interface ScalesH {
	/** Band scale over categories, sized to the inner HEIGHT. */
	yBand: ScaleBand<string>;
	/** Linear value scale, sized to the inner WIDTH (always includes zero). */
	x: ScaleLinear<number, number>;
	cats: string[];
}

/** Build horizontal-bar scales: a Y band for categories and an X linear scale for values.
 * Honors `hidden` and the stacked domain exactly as {@link buildScales} does. */
export function buildScalesH(
	data: ChartDatum[],
	series: ChartSeries[],
	categoryKey: string,
	stacked: boolean,
	innerW: number,
	innerH: number,
	hidden: Set<string> = new Set(),
): ScalesH {
	const cats = categories(data, categoryKey);
	const visible = series.filter((s) => !hidden.has(s.key));
	const yBand = scaleBand<string>().domain(cats).range([0, innerH]).padding(0.2);
	const x = scaleLinear().domain(yDomain(data, visible, stacked)).range([0, innerW]).nice();
	return { yBand, x, cats };
}

/** Rectangles for grouped (side-by-side) horizontal bars. Bars grow rightward from x=0;
 * each category band is split among the visible bar series. Mirrors {@link groupedBars}. */
export function horizontalBars(
	data: ChartDatum[],
	categoryKey: string,
	series: ChartSeries[],
	scales: ScalesH,
	hidden: Set<string> = new Set(),
): Bar[] {
	const band = scales.yBand;
	const barKeys = series
		.map((s, i) => ({ s, i }))
		.filter(({ s }) => (s.type ?? "bar") !== "line" && (s.type ?? "bar") !== "area" && !hidden.has(s.key));
	const inner = scaleBand<number>()
		.domain(barKeys.map((_, j) => j))
		.range([0, band.bandwidth()])
		.padding(0.1);
	const x0 = scales.x(0);
	const out: Bar[] = [];
	for (const row of data) {
		const c = cat(row, categoryKey);
		const gy = band(c) ?? 0;
		barKeys.forEach(({ s, i }, j) => {
			const v = num(row[s.key]);
			const xv = scales.x(v);
			out.push({
				x: Math.min(x0, xv),
				y: gy + (inner(j) ?? 0),
				width: Math.abs(xv - x0),
				height: inner.bandwidth(),
				seriesIndex: i,
				category: c,
				value: v,
			});
		});
	}
	return out;
}

/** Rectangles for stacked horizontal bars (uses d3-stack). Hidden series are dropped from the
 * stack; `seriesIndex` stays the original index so colors stay stable. Mirrors {@link stackedBars}. */
export function horizontalStackedBars(
	data: ChartDatum[],
	categoryKey: string,
	series: ChartSeries[],
	scales: ScalesH,
	hidden: Set<string> = new Set(),
): Bar[] {
	const visible = series.map((s, i) => ({ s, i })).filter(({ s }) => !hidden.has(s.key));
	const keys = visible.map((v) => v.s.key);
	const layers = d3stack<ChartDatum>().keys(keys)(data);
	const band = scales.yBand;
	const out: Bar[] = [];
	layers.forEach((layer, li) => {
		const seriesIndex = visible[li].i;
		layer.forEach((seg, rowIndex) => {
			const c = cat(data[rowIndex], categoryKey);
			const xLeft = scales.x(seg[0]);
			const xRight = scales.x(seg[1]);
			out.push({
				x: Math.min(xLeft, xRight),
				y: band(c) ?? 0,
				width: Math.abs(xRight - xLeft),
				height: band.bandwidth(),
				seriesIndex,
				category: c,
				value: num(data[rowIndex][visible[li].s.key]),
			});
		});
	});
	return out;
}

// ---- donut center label ----

/** Font size (px) for a donut center label, scaled to the hole radius and clamped to a
 * legible range. The sub-label is rendered smaller (see {@link centerSubLabelSize}). */
export function centerLabelSize(innerRadius: number): number {
	return Math.max(10, Math.min(28, innerRadius * 0.5));
}

/** Font size (px) for the smaller donut center sub-label. */
export function centerSubLabelSize(innerRadius: number): number {
	return Math.max(9, Math.min(16, innerRadius * 0.28));
}

/** Y-axis tick values from the primary scale. */
export function yTicks(scales: Scales, count = 5): number[] {
	return scales.y.ticks(count);
}

/** Tick values for any linear scale (used for the secondary axis). */
export function ticksOf(scale: ScaleLinear<number, number>, count = 5): number[] {
	return scale.ticks(count);
}

// ---- scatter / bubble (linear x and y) ----

export interface XYScales {
	x: ScaleLinear<number, number>;
	y: ScaleLinear<number, number>;
}

/** The x accessor for a series in an x/y plot: per-series `xKey`, else the chart `xKey`. */
export function seriesX(s: ChartSeries, xKey: string): string {
	return s.xKey ?? xKey;
}

/** Linear x and y scales spanning the data extent (no forced zero, unlike the bar baseline). */
export function buildXYScales(
	data: ChartDatum[],
	series: ChartSeries[],
	xKey: string,
	innerW: number,
	innerH: number,
): XYScales {
	const xs: number[] = [];
	const ys: number[] = [];
	for (const row of data) {
		for (const s of series) {
			xs.push(num(row[seriesX(s, xKey)]));
			ys.push(num(row[s.key]));
		}
	}
	const [x0, x1] = (d3extent(xs) as [number, number] | [undefined, undefined]) ?? [0, 1];
	const [y0, y1] = (d3extent(ys) as [number, number] | [undefined, undefined]) ?? [0, 1];
	const x = scaleLinear().domain([x0 ?? 0, x1 ?? 1]).range([0, innerW]).nice();
	const y = scaleLinear().domain([y0 ?? 0, y1 ?? 1]).range([innerH, 0]).nice();
	return { x, y };
}

/** Point positions for an x/y (scatter) series — the canvas-renderer counterpart of the SVG
 * `<circle>` marks in `renderXY`. `xKey` is the resolved per-series x accessor ({@link seriesX}). */
export function xyPoints(data: ChartDatum[], xKey: string, key: string, scales: XYScales): CanvasPoint[] {
	return data.map((row) => ({ x: scales.x(num(row[xKey])), y: scales.y(num(row[key])) }));
}

/** A radius function for bubbles (area-encoded via sqrt), or a constant when no `sizeKey`. */
export function radiusFor(
	data: ChartDatum[],
	sizeKey: string | undefined,
	range: [number, number] = [4, 18],
): (v: number) => number {
	if (!sizeKey) return () => 4;
	const hi = d3max(data, (row) => num(row[sizeKey])) ?? 1;
	const s = scaleSqrt().domain([0, hi]).range(range);
	return (v: number) => s(v);
}

// ---- pie / donut (radial) ----

export interface PieSlice {
	d: string;
	category: string;
	value: number;
	index: number;
}

/** Arc paths for a pie or donut from one value series (innerRadius > 0 makes a donut). */
export function pieArcs(
	data: ChartDatum[],
	categoryKey: string,
	valueKey: string,
	radius: number,
	innerRadius: number,
): PieSlice[] {
	const layout = d3pie<ChartDatum>().value((d) => Math.max(0, num(d[valueKey]))).sort(null);
	const a = d3arc<ReturnType<typeof layout>[number]>().innerRadius(innerRadius).outerRadius(radius);
	return layout(data).map((seg, i) => ({
		d: a(seg) ?? "",
		category: cat(data[i], categoryKey),
		value: num(data[i][valueKey]),
		index: i,
	}));
}

/** A short text summary for the chart's accessible name. */
export function summary(chartType: ChartType, series: ChartSeries[], cats: string[]): string {
	const cap = chartType[0].toUpperCase() + chartType.slice(1);
	if (chartType === "pie" || chartType === "donut") {
		return `${cap} chart, ${cats.length} slices: ${cats.join(", ")}.`;
	}
	const names = series.map((s) => s.label ?? s.key).join(", ");
	const hasCats = cats.length > 0 && cats[0] !== "";
	const span = hasCats ? ` across ${cats.length} categories (${cats[0]} to ${cats[cats.length - 1]})` : "";
	return `${cap} chart, ${series.length} series: ${names}${span}.`;
}

/** The chart's accessible name: an optional lead-in label, the generated data summary, and an
 * optional center-label (donut) appended so assistive tech hears the highlighted value too. */
export function accessibleName(
	label: string | undefined,
	chartType: ChartType,
	series: ChartSeries[],
	cats: string[],
	centerLabel?: string,
): string {
	const base = `${label ? label + ". " : ""}${summary(chartType, series, cats)}`;
	return centerLabel ? `${base} ${centerLabel}.` : base;
}

// ---- sparkline ----
//
// dj-sparkline is a tiny, axis-less inline chart: one series, no scales shared with dj-chart
// (its data shape — a plain number[], no category/series objects — doesn't fit buildScales).
// These are separate, small, pure functions operating on a fixed internal coordinate space
// (see dj-sparkline.ts), so geometry is layout-independent and unit-testable in happy-dom.

export interface SparklinePoint {
	x: number;
	y: number;
	value: number;
}

/** The [lo, hi] domain for a sparkline: the explicit min/max when given, else the data's own
 * range. A flat domain (lo === hi, e.g. a constant series or a single point) is padded so the
 * line centers vertically instead of collapsing to one edge. */
function sparklineDomain(data: number[], min?: number, max?: number): [number, number] {
	let lo = min ?? Math.min(...data);
	let hi = max ?? Math.max(...data);
	if (lo === hi) {
		const pad = lo === 0 ? 1 : Math.abs(lo) * 0.1;
		lo -= pad;
		hi += pad;
	}
	return [lo, hi];
}

/** Evenly-spaced x, linearly-scaled y (SVG-down: hi maps to y=0) for a sparkline's data, in a
 * `w`×`h` coordinate space. `min`/`max` fix the domain; otherwise it's the data's own range. */
export function sparklinePoints(data: number[], w: number, h: number, min?: number, max?: number): SparklinePoint[] {
	if (data.length === 0) return [];
	const [lo, hi] = sparklineDomain(data, min, max);
	const n = data.length;
	const stepX = n > 1 ? w / (n - 1) : 0;
	return data.map((v, i) => ({
		x: n > 1 ? i * stepX : w / 2,
		y: h - ((v - lo) / (hi - lo)) * h,
		value: v,
	}));
}

/** SVG path `d` for a sparkline line, from points already computed by {@link sparklinePoints}. */
export function sparklineLinePath(points: SparklinePoint[]): string {
	if (points.length === 0) return "";
	return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
}

/** SVG path `d` for a sparkline area: the line closed down to the bottom edge (`h`). */
export function sparklineAreaPath(points: SparklinePoint[], h: number): string {
	if (points.length === 0) return "";
	const first = points[0];
	const last = points[points.length - 1];
	return `${sparklineLinePath(points)} L${last.x},${h} L${first.x},${h} Z`;
}

export interface SparklineBar {
	x: number;
	y: number;
	width: number;
	height: number;
	value: number;
}

/** Bars for a sparkline, one per data point, growing from a zero baseline — or, when zero falls
 * outside the domain (an all-positive or all-negative series), from the domain's near edge to
 * zero (clamped into range), matching dj-chart's own zero-anchored bar convention. */
export function sparklineBars(data: number[], w: number, h: number, min?: number, max?: number): SparklineBar[] {
	if (data.length === 0) return [];
	const [lo, hi] = sparklineDomain(data, min, max);
	const n = data.length;
	const slot = w / n;
	const gap = 0.15; // fraction of each slot left as a gap between bars
	const barW = slot * (1 - gap);
	const yOf = (v: number) => h - ((v - lo) / (hi - lo)) * h;
	const y0 = yOf(Math.min(hi, Math.max(lo, 0)));
	return data.map((v, i) => {
		const y1 = yOf(v);
		return {
			x: i * slot + (slot - barW) / 2,
			y: Math.min(y0, y1),
			width: barW,
			height: Math.abs(y1 - y0),
			value: v,
		};
	});
}

/** The sparkline's accessible name: "<label>: N points, min X, max Y, last Z." `fmt` formats
 * each number (the element passes its locale-aware formatter, mirroring dj-chart's
 * {@link accessibleName}, so this stays a pure function with no i18n import of its own). */
export function sparklineAccessibleName(label: string, data: number[], fmt: (v: number) => string): string {
	if (data.length === 0) return `${label}: no data.`;
	const min = Math.min(...data);
	const max = Math.max(...data);
	const last = data[data.length - 1];
	return `${label}: ${data.length} points, min ${fmt(min)}, max ${fmt(max)}, last ${fmt(last)}.`;
}

// ---- canvas escape hatch ----
//
// The canvas renderer draws SERIES MARKS ONLY (line/area/scatter); axes, grid, legend, tooltip,
// brush, and hit-bands stay SVG/DOM. happy-dom has no real 2D context, so all draw logic goes
// through this pure `drawSeries`, whose `ctx` parameter is only the 2D-context METHODS it calls —
// tests pass a recording fake and assert call shapes, never a real canvas.

/** The subset of `CanvasRenderingContext2D` {@link drawSeries} uses, so it can be driven by a
 * plain recording fake in tests instead of a real (happy-dom-unavailable) 2D context. */
export interface CanvasCtxLike {
	// Typed to match CanvasRenderingContext2D's own fillStyle/strokeStyle (string | CanvasGradient
	// | CanvasPattern) so a real 2D context satisfies this interface structurally; drawSeries only
	// ever assigns plain strings (a subtype of that union).
	fillStyle: string | CanvasGradient | CanvasPattern;
	strokeStyle: string | CanvasGradient | CanvasPattern;
	lineWidth: number;
	globalAlpha: number;
	clearRect(x: number, y: number, w: number, h: number): void;
	beginPath(): void;
	moveTo(x: number, y: number): void;
	lineTo(x: number, y: number): void;
	closePath(): void;
	arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
	fill(): void;
	stroke(): void;
}

/** One series' worth of canvas draw geometry: points already in the plot's pixel space (margin
 * offset included, matching the SVG marks they replace), color already resolved (canvas can't
 * read `var(--dj-*)` itself), and — for `"area"` — the baseline y to close the fill down to. */
export interface CanvasMark {
	type: "line" | "area" | "scatter";
	color: string;
	points: CanvasPoint[];
	baseline?: number;
}

// Matches `.series-area`'s CSS `opacity: 0.25` (dj-chart.styles.ts), so a canvas area fill reads
// the same as its SVG counterpart.
const AREA_FILL_ALPHA = 0.25;

/** Draws every mark onto `ctx`, clearing the `width`×`height` canvas first. Line and area marks
 * stroke one path (`moveTo` + a `lineTo` per remaining point); area additionally fills the path
 * closed down to its `baseline` at `AREA_FILL_ALPHA`. Scatter marks draw one filled `arc` per
 * point. A mark with no points draws nothing beyond the initial clear. */
export function drawSeries(ctx: CanvasCtxLike, marks: CanvasMark[], width: number, height: number): void {
	ctx.clearRect(0, 0, width, height);
	for (const mark of marks) {
		if (mark.points.length === 0) continue;
		if (mark.type === "scatter") {
			ctx.fillStyle = mark.color;
			for (const p of mark.points) {
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.r ?? 4, 0, Math.PI * 2);
				ctx.fill();
			}
			continue;
		}
		if (mark.type === "area") {
			const baseline = mark.baseline ?? height;
			ctx.beginPath();
			ctx.moveTo(mark.points[0].x, baseline);
			for (const p of mark.points) ctx.lineTo(p.x, p.y);
			ctx.lineTo(mark.points[mark.points.length - 1].x, baseline);
			ctx.closePath();
			ctx.fillStyle = mark.color;
			ctx.globalAlpha = AREA_FILL_ALPHA;
			ctx.fill();
			ctx.globalAlpha = 1;
		}
		ctx.beginPath();
		ctx.moveTo(mark.points[0].x, mark.points[0].y);
		for (let i = 1; i < mark.points.length; i++) ctx.lineTo(mark.points[i].x, mark.points[i].y);
		ctx.strokeStyle = mark.color;
		ctx.lineWidth = 2;
		ctx.stroke();
	}
}

/** The renderer `dj-chart` actually uses, given the requested `renderer`, its `type`, and
 * whether `forced-colors: active` is in effect. `svg` always passes through unchanged. `canvas`
 * falls back to `svg` for any type other than `line`/`area`/`scatter` (bar, stacked, pie/donut,
 * bubble, and a combo where any series overrides to `bar` are all reported as `type="bar"` by the
 * caller, which folds those cases in via {@link hasBars} before calling this) — the caller warns
 * once for that fallback. `forced-colors` also falls back to `svg`, silently: a canvas can't
 * honor `CanvasText` the way `forced-colors: active` requires, so this is a documented feature,
 * not a caveat, and gets no warning. */
export function effectiveRenderer(renderer: ChartRenderer, type: ChartType, forcedColors: boolean): ChartRenderer {
	if (renderer !== "canvas") return "svg";
	if (forcedColors) return "svg";
	if (type !== "line" && type !== "area" && type !== "scatter") return "svg";
	return "canvas";
}
