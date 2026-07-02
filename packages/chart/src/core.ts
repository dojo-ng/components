import { scaleLinear, scaleBand, scalePoint, scaleSqrt, type ScaleLinear, type ScaleBand, type ScalePoint } from "d3-scale";
import { line as d3line, area as d3area, stack as d3stack, arc as d3arc, pie as d3pie } from "d3-shape";
import { max as d3max, min as d3min, extent as d3extent } from "d3-array";
import type { ChartDatum, ChartSeries, ChartType } from "./types.js";

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
