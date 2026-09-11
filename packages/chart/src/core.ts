import { scaleLinear, scaleLog, scaleBand, scalePoint, scaleSqrt, type ScaleLinear, type ScaleBand, type ScalePoint } from "d3-scale";
import { line as d3line, area as d3area, stack as d3stack, arc as d3arc, pie as d3pie } from "d3-shape";
import { max as d3max, extent as d3extent } from "d3-array";
import type { ChartDatum, ChartSeries, ChartType, ChartRenderer, MissingMode, ValueScale, ScaleKind } from "./types.js";

/** Coerce an unknown cell to a finite number, or `null` when it isn't one — a missing value stays
 * missing instead of becoming a false zero. `null`, `undefined`, and `""` are checked explicitly
 * before the `Number()` coercion because JS coerces all three to `0` (`Number(null) === 0`), which
 * would otherwise sail straight through `Number.isFinite` as a false "real" zero — the exact bug
 * Track V exists to fix. */
export function val(v: unknown): number | null {
	if (v === null || v === undefined || v === "") return null;
	const n = typeof v === "number" ? v : Number(v);
	return Number.isFinite(n) ? n : null;
}

/** Coerce an unknown cell to a finite number (a missing value becomes 0). Kept for the call sites
 * where zero genuinely is the right answer (decision 21); everywhere else uses {@link val}. */
export function num(v: unknown): number {
	return val(v) ?? 0;
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
	y: ValueScale; // primary (left) axis
	yRight?: ValueScale; // secondary (right) axis, when any series opts in
	cats: string[];
	band: boolean;
}

function axisOf(s: ChartSeries): "left" | "right" {
	return s.axis === "right" ? "right" : "left";
}

/** True when `scale` is logarithmic — duck-typed via d3-scale's own `.base()` accessor, which only
 * `scaleLog` defines, since {@link ValueScale} itself doesn't distinguish the two at the type level. */
export function isLogScale(scale: ValueScale): boolean {
	return typeof (scale as { base?: unknown }).base === "function";
}

/** Whether a resolved cell counts as a "gap" — the one place Track V's missing-value rule and
 * Track L's log-axis rule both funnel through, so nothing downstream has to know there are two
 * reasons a point might not be there. `raw` is the already-{@link val}-resolved cell. A missing
 * cell (`null`) respects `missing` (`"zero"` draws it as a real 0); a non-positive cell on a
 * logarithmic scale is ALWAYS a gap (decision 3) — `missing="zero"` does not resurrect it (L3),
 * because there is no position on a log axis for zero or a negative number to occupy. */
export function isGapValue(raw: number | null, missing: MissingMode, isLog: boolean): boolean {
	if (raw === null) return missing !== "zero";
	return isLog && raw <= 0;
}

/** The zero-equivalent baseline a bar or area's fill grows from. Linear returns `scale(0)`, the
 * literal zero line (which may sit outside the visible range for a `"gap"`-excluded all-positive
 * domain — see {@link yDomain} — exactly as it should: nothing to anchor to). Log has no position
 * for zero at all, so it returns the axis floor instead — `scale.range()[0]`, the pixel a log
 * scale's smallest (positive) domain value maps to, which is the correct "floor" for either a
 * vertical y-range (`[innerH, 0]`, so index 0 is the bottom) or a horizontal x-range (`[0, innerW]`,
 * so index 0 is the left edge) without needing to know which orientation called it. */
export function baselineOf(scale: ValueScale): number {
	if (isLogScale(scale)) return scale.range()[0];
	return scale(0);
}

/** Numeric y domain for a set of series, summing per row when stacked. A cell {@link val} can't
 * parse is excluded rather than coerced to zero, UNLESS the resolved `missing` mode for its series
 * is `"zero"` (decision 21/22). Zero is still folded into the domain for ordinary, fully-present
 * data — that long-standing convention only lifts once a real cell was actually excluded, so an
 * honest gap doesn't get a dishonest floor drawn under it (a series of `[10, null, 30]` under
 * `gap`/`connect` domains to `[10, 30]`, not `[0, 30]`; under `zero` it's `[0, 30]` as before).
 *
 * `scaleKind` (Track L) — `stacked` never reaches here as `"log"`: the caller downgrades to
 * `"linear"` first (decision 4), so only the non-stacked branch needs log awareness. There, a
 * non-positive value is excluded from the domain unconditionally (decision 3, L3 — `missing="zero"`
 * does not resurrect it, so `isGapValue` rather than a bare `<= 0` check is what decides this), and
 * the domain never gets the zero-folding a linear axis gets: it is exactly `[smallest positive
 * value, largest value]` per decision 2, because log has no position for zero to fold in AT. */
function yDomain(data: ChartDatum[], series: ChartSeries[], stacked: boolean, defaultMissing: MissingMode = "zero", scaleKind: ScaleKind = "linear"): [number, number] {
	if (!series.length) return [0, 0];
	const modeOf = (s: ChartSeries) => s.missing ?? defaultMissing;
	if (stacked) {
		// Stacks always treat a missing series as absent, never as zero (decision 24): the row's
		// other series still stack normally and the missing one contributes nothing.
		let lo = 0;
		let hi = 0;
		for (const row of data) {
			let pos = 0;
			let neg = 0;
			for (const s of series) {
				const raw = val(row[s.key]);
				const v = raw ?? (modeOf(s) === "zero" ? 0 : undefined);
				if (v === undefined) continue;
				if (v >= 0) pos += v;
				else neg += v;
			}
			hi = Math.max(hi, pos);
			lo = Math.min(lo, neg);
		}
		return [lo, hi];
	}
	const isLog = scaleKind === "log";
	let lo: number | undefined;
	let hi: number | undefined;
	let excluded = false;
	for (const row of data) {
		for (const s of series) {
			const raw = val(row[s.key]);
			const mode = modeOf(s);
			if (isGapValue(raw, mode, isLog)) {
				excluded = true;
				continue;
			}
			const v = raw ?? 0; // raw is non-null here (isGapValue already handled the null case)
			lo = lo === undefined ? v : Math.min(lo, v);
			hi = hi === undefined ? v : Math.max(hi, v);
		}
	}
	if (lo === undefined || hi === undefined) return isLog ? [1, 10] : [0, 0];
	if (!isLog && !excluded) {
		lo = Math.min(lo, 0);
		hi = Math.max(hi, 0);
	}
	return [lo, hi];
}

/** Build x and y scales for the plot area (innerW × innerH), accounting for stacking and a
 * secondary (right) y-axis when any series sets `axis: "right"`. `yScaleKind`/`yScaleRightKind`
 * (Track L) pick `scaleLog` for the named axis — downgraded to `"linear"` internally whenever
 * `stacked` is true, regardless of what was asked for, so the stacked-plus-log refusal (decision 4)
 * holds even if a caller forgets to check first; `dj-chart.ts` still owns the actual `warnOnce`. */
export function buildScales(
	data: ChartDatum[],
	series: ChartSeries[],
	categoryKey: string,
	chartType: ChartType,
	stacked: boolean,
	innerW: number,
	innerH: number,
	hidden: Set<string> = new Set(),
	missing: MissingMode = "gap",
	yScaleKind: ScaleKind = "linear",
	yScaleRightKind: ScaleKind = "linear",
): Scales {
	const cats = categories(data, categoryKey);
	const visible = series.filter((s) => !hidden.has(s.key));
	const band = hasBars(visible, chartType);
	const xBand = scaleBand<string>().domain(cats).range([0, innerW]).padding(0.2);
	const x = band ? xBand : scalePoint<string>().domain(cats).range([0, innerW]).padding(0.5);

	const left = visible.filter((s) => axisOf(s) === "left");
	const right = visible.filter((s) => axisOf(s) === "right");
	const leftKind: ScaleKind = stacked ? "linear" : yScaleKind;
	const rightKind: ScaleKind = stacked ? "linear" : yScaleRightKind;
	// Left scale spans the visible left-axis series (or all visible series when none are left).
	const y = (leftKind === "log" ? scaleLog() : scaleLinear())
		.domain(yDomain(data, left.length ? left : visible, stacked, missing, leftKind))
		.range([innerH, 0])
		.nice();
	const yRight = right.length
		? (rightKind === "log" ? scaleLog() : scaleLinear())
				.domain(yDomain(data, right, stacked, missing, rightKind))
				.range([innerH, 0])
				.nice()
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

/** A safe input for `yScale(...)`: `raw` itself, unless it's non-positive on a log scale, where
 * `Math.log` of it would be `NaN`/`-Infinity` — the caller has already marked that point as a gap
 * ({@link isGapValue}), so the exact substitute value never actually reaches the screen; it only
 * has to keep the generator from choking on it. */
function safeYInput(raw: number, yScale: ValueScale, isLog: boolean): number {
	return isLog && raw <= 0 ? yScale.domain()[0] : raw;
}

/** SVG path `d` for a line series (`yScale` defaults to the primary axis). `missing` controls a
 * non-finite cell: `"gap"` breaks the path there (`.defined()`); `"connect"` drops the row before
 * the generator runs, so the line spans the hole with one continuous segment; `"zero"` treats it
 * as a real zero, unchanged from before Track V — except on a logarithmic `yScale`, where a
 * non-positive value is ALWAYS a gap regardless of `missing` (decision 3, L3): {@link isGapValue}
 * is the one place both rules are decided, so `linePath` itself never re-derives either. */
export function linePath(
	data: ChartDatum[],
	categoryKey: string,
	key: string,
	scales: Scales,
	yScale: ValueScale = scales.y,
	missing: MissingMode = "zero",
): string {
	const isLog = isLogScale(yScale);
	const rows = missing === "connect" ? data.filter((row) => !isGapValue(val(row[key]), missing, isLog)) : data;
	const gen = d3line<ChartDatum>()
		.defined((row) => !isGapValue(val(row[key]), missing, isLog))
		.x((row) => xCenter(scales, cat(row, categoryKey)))
		.y((row) => yScale(safeYInput(val(row[key]) ?? 0, yScale, isLog)));
	return gen(rows) ?? "";
}

/** SVG path `d` for an area series (baseline at {@link baselineOf}; `yScale` defaults to the
 * primary axis). `missing` behaves exactly as it does for {@link linePath}, including the
 * logarithmic non-positive-is-always-a-gap rule, applied to both edges of the fill. */
export function areaPath(
	data: ChartDatum[],
	categoryKey: string,
	key: string,
	scales: Scales,
	yScale: ValueScale = scales.y,
	missing: MissingMode = "zero",
): string {
	const isLog = isLogScale(yScale);
	const rows = missing === "connect" ? data.filter((row) => !isGapValue(val(row[key]), missing, isLog)) : data;
	const base = baselineOf(yScale);
	const gen = d3area<ChartDatum>()
		.defined((row) => !isGapValue(val(row[key]), missing, isLog))
		.x((row) => xCenter(scales, cat(row, categoryKey)))
		.y0(base)
		.y1((row) => yScale(safeYInput(val(row[key]) ?? 0, yScale, isLog)));
	return gen(rows) ?? "";
}

export interface CanvasPoint {
	x: number;
	y: number;
	/** Radius, for a scatter mark's point (ignored by line/area). */
	r?: number;
}

/** Point positions for a cartesian line/area series — the same x/y {@link linePath} plots, as
 * raw points instead of an SVG path string, for the canvas renderer (`yScale` defaults to the
 * primary axis). Omits a gapped row entirely — missing (per `missing`) or, on a logarithmic
 * `yScale`, non-positive (decision 3) — from the returned points: the canvas draw protocol is a
 * single polyline with no `.defined()` equivalent, so `"gap"` and `"connect"` (and a log gap)
 * render the same way here: the line runs straight through to the next real point rather than
 * breaking, which is the documented limit of the canvas renderer for gaps. */
export function seriesPoints(
	data: ChartDatum[],
	categoryKey: string,
	key: string,
	scales: Scales,
	yScale: ValueScale = scales.y,
	missing: MissingMode = "zero",
): CanvasPoint[] {
	const isLog = isLogScale(yScale);
	const rows = data.filter((row) => !isGapValue(val(row[key]), missing, isLog));
	return rows.map((row) => ({ x: xCenter(scales, cat(row, categoryKey)), y: yScale(val(row[key]) ?? 0) }));
}

export interface Bar {
	x: number;
	y: number;
	width: number;
	height: number;
	seriesIndex: number;
	category: string;
	value: number;
	/** The row's index in `data`, for point labels to look up the original row (Track M). */
	rowIndex: number;
}

/** Rectangles for grouped (side-by-side) bars. `yOf` maps a series index to its axis y-scale
 * (defaults to the primary axis), so bar series on a secondary axis size correctly. `defaultMissing`
 * (per-series override on `ChartSeries.missing`) omits a bar entirely for a non-finite cell unless
 * the resolved mode is `"zero"` — the bar slot stays reserved (`inner`'s domain is the full series
 * list, built before this loop), so the remaining bars in the group keep their x positions. On a
 * logarithmic axis a non-positive value is omitted the same way, unconditionally (decision 3): bars
 * ARE allowed on log (decision 4), but a bar's length there reads as a ratio to the axis floor, not
 * a quantity, and there is no floor for zero or a negative number to grow from. */
export function groupedBars(
	data: ChartDatum[],
	categoryKey: string,
	series: ChartSeries[],
	scales: Scales,
	yOf: (seriesIndex: number) => ValueScale = () => scales.y,
	hidden: Set<string> = new Set(),
	defaultMissing: MissingMode = "zero",
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
	data.forEach((row, rowIndex) => {
		const c = cat(row, categoryKey);
		const gx = band(c) ?? 0;
		barKeys.forEach(({ s, i }, j) => {
			const ys = yOf(i);
			const raw = val(row[s.key]);
			if (isGapValue(raw, s.missing ?? defaultMissing, isLogScale(ys))) return;
			const y0 = baselineOf(ys);
			const v = raw ?? 0;
			const yv = ys(v);
			out.push({
				x: gx + (inner(j) ?? 0),
				y: Math.min(y0, yv),
				width: inner.bandwidth(),
				height: Math.abs(yv - y0),
				seriesIndex: i,
				category: c,
				value: v,
				rowIndex,
			});
		});
	});
	return out;
}

/** Rectangles for stacked bars (uses d3-stack). Hidden series are dropped from the stack;
 * `seriesIndex` stays the original index so colors and series identity remain stable. A missing
 * cell (per the resolved `missing` mode, decision 24) contributes no segment — not a zero-height
 * one, which is a rect with no height that would still consume a color and a tooltip row — while
 * the row's other series still stack normally: d3-stack's own value accessor is overridden to
 * `val(...) ?? 0` (rather than its default unary-plus coercion) so an `undefined` cell can't turn
 * the whole stack's running sum into `NaN`, the same failure mode a `null` cell used to risk. */
export function stackedBars(
	data: ChartDatum[],
	categoryKey: string,
	series: ChartSeries[],
	scales: Scales,
	hidden: Set<string> = new Set(),
	defaultMissing: MissingMode = "zero",
): Bar[] {
	const visible = series.map((s, i) => ({ s, i })).filter(({ s }) => !hidden.has(s.key));
	const keys = visible.map((v) => v.s.key);
	const layers = d3stack<ChartDatum>()
		.keys(keys)
		.value((d, key) => val(d[key]) ?? 0)(data);
	const band = scales.xBand;
	const out: Bar[] = [];
	layers.forEach((layer, li) => {
		const { s, i: seriesIndex } = visible[li];
		layer.forEach((seg, rowIndex) => {
			const raw = val(data[rowIndex][s.key]);
			if (raw === null && (s.missing ?? defaultMissing) !== "zero") return;
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
				value: raw ?? 0,
				rowIndex,
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
	/** The value axis, sized to the inner WIDTH — linear (always includes zero) or, per `y-scale`
	 * (decision 1: it names the value axis "regardless of orientation"), logarithmic. */
	x: ValueScale;
	cats: string[];
}

/** Build horizontal-bar scales: a Y band for categories and an X value scale. Honors `hidden` and
 * the stacked domain exactly as {@link buildScales} does, including the stacked-plus-log downgrade
 * to `"linear"` (decision 4) — enforced here too, not just in the vertical path. */
export function buildScalesH(
	data: ChartDatum[],
	series: ChartSeries[],
	categoryKey: string,
	stacked: boolean,
	innerW: number,
	innerH: number,
	hidden: Set<string> = new Set(),
	missing: MissingMode = "gap",
	xScaleKind: ScaleKind = "linear",
): ScalesH {
	const cats = categories(data, categoryKey);
	const visible = series.filter((s) => !hidden.has(s.key));
	const yBand = scaleBand<string>().domain(cats).range([0, innerH]).padding(0.2);
	const kind: ScaleKind = stacked ? "linear" : xScaleKind;
	const x = (kind === "log" ? scaleLog() : scaleLinear())
		.domain(yDomain(data, visible, stacked, missing, kind))
		.range([0, innerW])
		.nice();
	return { yBand, x, cats };
}

/** Rectangles for grouped (side-by-side) horizontal bars. Bars grow rightward from the baseline
 * ({@link baselineOf}); each category band is split among the visible bar series. Mirrors
 * {@link groupedBars}, including the same `defaultMissing` and logarithmic bar-omission rules. */
export function horizontalBars(
	data: ChartDatum[],
	categoryKey: string,
	series: ChartSeries[],
	scales: ScalesH,
	hidden: Set<string> = new Set(),
	defaultMissing: MissingMode = "zero",
): Bar[] {
	const band = scales.yBand;
	const barKeys = series
		.map((s, i) => ({ s, i }))
		.filter(({ s }) => (s.type ?? "bar") !== "line" && (s.type ?? "bar") !== "area" && !hidden.has(s.key));
	const inner = scaleBand<number>()
		.domain(barKeys.map((_, j) => j))
		.range([0, band.bandwidth()])
		.padding(0.1);
	const isLog = isLogScale(scales.x);
	const x0 = baselineOf(scales.x);
	const out: Bar[] = [];
	data.forEach((row, rowIndex) => {
		const c = cat(row, categoryKey);
		const gy = band(c) ?? 0;
		barKeys.forEach(({ s, i }, j) => {
			const raw = val(row[s.key]);
			if (isGapValue(raw, s.missing ?? defaultMissing, isLog)) return;
			const v = raw ?? 0;
			const xv = scales.x(v);
			out.push({
				x: Math.min(x0, xv),
				y: gy + (inner(j) ?? 0),
				width: Math.abs(xv - x0),
				height: inner.bandwidth(),
				seriesIndex: i,
				category: c,
				value: v,
				rowIndex,
			});
		});
	});
	return out;
}

/** Rectangles for stacked horizontal bars (uses d3-stack). Hidden series are dropped from the
 * stack; `seriesIndex` stays the original index so colors stay stable. Mirrors {@link stackedBars},
 * including the same missing-cell omission and the `undefined`-safe value accessor. */
export function horizontalStackedBars(
	data: ChartDatum[],
	categoryKey: string,
	series: ChartSeries[],
	scales: ScalesH,
	hidden: Set<string> = new Set(),
	defaultMissing: MissingMode = "zero",
): Bar[] {
	const visible = series.map((s, i) => ({ s, i })).filter(({ s }) => !hidden.has(s.key));
	const keys = visible.map((v) => v.s.key);
	const layers = d3stack<ChartDatum>()
		.keys(keys)
		.value((d, key) => val(d[key]) ?? 0)(data);
	const band = scales.yBand;
	const out: Bar[] = [];
	layers.forEach((layer, li) => {
		const { s, i: seriesIndex } = visible[li];
		layer.forEach((seg, rowIndex) => {
			const raw = val(data[rowIndex][s.key]);
			if (raw === null && (s.missing ?? defaultMissing) !== "zero") return;
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
				value: raw ?? 0,
				rowIndex,
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

/** Y-axis tick values from the primary scale. On a logarithmic scale, `pixels` (the axis length)
 * routes through {@link logTicks} instead of the raw `count` — passing no `pixels` falls back to
 * the scale's own (potentially crowded) default, so existing callers that haven't been updated yet
 * still get a sane, if untidied, answer rather than a thrown error. */
export function yTicks(scales: Scales, count = 5, pixels?: number): number[] {
	if (isLogScale(scales.y)) return pixels !== undefined ? logTicks(scales.y, pixels) : scales.y.ticks();
	return scales.y.ticks(count);
}

/** Tick values for any value scale (used for the secondary axis and the horizontal path) — the
 * same log-aware behavior as {@link yTicks}, for a scale that isn't necessarily `scales.y` itself. */
export function ticksOf(scale: ValueScale, count = 5, pixels?: number): number[] {
	if (isLogScale(scale)) return pixels !== undefined ? logTicks(scale, pixels) : scale.ticks();
	return scale.ticks(count);
}

/** Decade-first tick thinning for a logarithmic value scale (decision 6): `scaleLog().ticks()`
 * yields decade boundaries plus their 1-through-9 multiples, which at a typical chart height
 * overprints into an unreadable stripe. This takes the decades within the domain first and, only
 * while every tick still clears `minGapPx` (default 24, matching decision 6) from its pixel
 * neighbor, adds each decade's 2× and 5× multiple. If the bare decades themselves don't clear the
 * gap (a domain spanning many decades in very little `pixels`), they're thinned by an even stride
 * until they do, rather than returning an overcrowded set. Labels format through the caller's own
 * `fmtY`, so `numberFormat`/`formatY` keep working unchanged — this only decides WHICH values get a
 * tick, never how one is printed. */
export function logTicks(scale: ValueScale, pixels: number, minGapPx = 24): number[] {
	const [lo, hi] = scale.domain();
	if (!(lo > 0) || !(hi > lo)) return scale.ticks();
	const loExp = Math.floor(Math.log10(lo));
	const hiExp = Math.ceil(Math.log10(hi));
	const decades: number[] = [];
	for (let e = loExp; e <= hiExp; e++) {
		const v = 10 ** e;
		if (v >= lo && v <= hi) decades.push(v);
	}
	if (decades.length === 0) return scale.ticks();
	const clearsGap = (ticks: number[]): boolean => {
		const positions = ticks.map((t) => scale(t)).sort((a, b) => a - b);
		for (let i = 1; i < positions.length; i++) {
			if (Math.abs(positions[i] - positions[i - 1]) < minGapPx) return false;
		}
		return true;
	};
	if (!clearsGap(decades)) {
		for (let stride = 2; stride <= decades.length; stride++) {
			const thinned = decades.filter((_, i) => i % stride === 0);
			if (clearsGap(thinned)) return thinned;
		}
		return [decades[0], decades[decades.length - 1]];
	}
	const withMultiples = [...decades];
	for (const d of decades) {
		for (const m of [2, 5]) {
			const v = d * m;
			if (v > lo && v < hi) withMultiples.push(v);
		}
	}
	withMultiples.sort((a, b) => a - b);
	return clearsGap(withMultiples) ? withMultiples : decades;
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
			xs.push(val(row[seriesX(s, xKey)]) ?? 0);
			ys.push(val(row[s.key]) ?? 0);
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
	return data.map((row) => ({ x: scales.x(val(row[xKey]) ?? 0), y: scales.y(val(row[key]) ?? 0) }));
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
	/** The row's index in the ORIGINAL (unfiltered) data array — stable even when a missing value
	 * omits its own row from the layout, so slice color stays aligned with the legend's, which
	 * colors by that same original index. */
	index: number;
	/** The slice's angular midpoint in radians, d3-arc's convention (0 at 12 o'clock, clockwise) —
	 * for a point label placed outside the arc (Track M). */
	midAngle: number;
}

/** Arc paths for a pie or donut from one value series (innerRadius > 0 makes a donut). A row whose
 * value is missing is omitted from the layout entirely (decision 24) — not drawn as a zero-value
 * sliver — unless the resolved `missing` mode is `"zero"`. */
export function pieArcs(
	data: ChartDatum[],
	categoryKey: string,
	valueKey: string,
	radius: number,
	innerRadius: number,
	missing: MissingMode = "zero",
): PieSlice[] {
	const rows = data
		.map((d, i) => ({ d, i }))
		.filter(({ d }) => missing === "zero" || val(d[valueKey]) !== null);
	const layout = d3pie<(typeof rows)[number]>().value(({ d }) => Math.max(0, val(d[valueKey]) ?? 0)).sort(null);
	const a = d3arc<ReturnType<typeof layout>[number]>().innerRadius(innerRadius).outerRadius(radius);
	return layout(rows).map((seg) => ({
		d: a(seg) ?? "",
		category: cat(seg.data.d, categoryKey),
		value: val(seg.data.d[valueKey]) ?? 0,
		index: seg.data.i,
		midAngle: (seg.startAngle + seg.endAngle) / 2,
	}));
}

// ---- point labels (Track M) ----
//
// Real text measurement means `getBBox`, a per-label layout that doesn't exist in happy-dom, so
// collision avoidance here is an ESTIMATE by construction (decision 28): width from character
// count times a per-character factor derived from the font size, placed in a fixed order, skipping
// any candidate whose estimated box overlaps one already kept. Above a density cap the whole set is
// dropped rather than drawing an unreadable smear of overlapping numbers (the CV2 hazard: one more
// `<text>` node per point, and text layout is exactly what froze a tab at 20,000 categories).

/** A candidate point label before collision placement: its position, text, and a stable sort key
 * ("category order" — decision 28) that also breaks ties deterministically so re-rendering the same
 * data never flickers between which label of an overlapping pair wins. */
export interface PointLabel {
	x: number;
	y: number;
	text: string;
	order: number;
}

/** Average glyph width as a fraction of font size, for the numeral- and letter-heavy text a chart
 * label actually carries — not a general-purpose text metric. */
const LABEL_CHAR_WIDTH_FACTOR = 0.6;
/** Above this many candidates, decision 28 skips the whole set rather than placing any — the same
 * per-node-cost hazard CV2 found in tick labels and hit-bands. */
export const LABEL_DENSITY_CAP = 150;

/** Estimated pixel width of a label's text at the given font size (see the section note — this is
 * deliberately approximate, not `getBBox`). */
export function estimateLabelWidth(text: string, fontSize: number): number {
	return text.length * fontSize * LABEL_CHAR_WIDTH_FACTOR;
}

/** Greedily places label candidates in `order`, skipping any whose estimated box overlaps one
 * already kept — so of any overlapping pair, the first in category order always wins, the same
 * result on every render. `capped` is true (and `kept` empty) once `candidates.length` exceeds
 * {@link LABEL_DENSITY_CAP}; the caller is expected to `warnOnce` on that. */
export function placeLabels(candidates: PointLabel[], fontSize: number): { kept: PointLabel[]; capped: boolean } {
	if (candidates.length > LABEL_DENSITY_CAP) return { kept: [], capped: true };
	const ordered = [...candidates].sort((a, b) => a.order - b.order);
	const kept: PointLabel[] = [];
	for (const c of ordered) {
		const cw = estimateLabelWidth(c.text, fontSize);
		const overlaps = kept.some((k) => {
			const kw = estimateLabelWidth(k.text, fontSize);
			return Math.abs(c.x - k.x) < (cw + kw) / 2 + 4 && Math.abs(c.y - k.y) < fontSize + 4;
		});
		if (!overlaps) kept.push(c);
	}
	return { kept, capped: false };
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

// ---- image export (toSvg / toPng) ----

/** Resolves a CSS value that may be `var(--token, fallback)` against a resolved-token lookup —
 * read once via `getComputedStyle` on the chart host, the same technique {@link resolveCanvasColor}
 * (dj-chart.ts) already uses for series colors, generalized here to every token the SVG export
 * needs. A value that isn't a `var()` reference passes through unchanged. A token missing from the
 * map falls back to the `var()` expression's own fallback (or `""` if it has none). */
export function resolveVar(value: string, tokens: Record<string, string>): string {
	const m = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(value);
	if (!m) return value;
	const [, token, fallback] = m;
	return tokens[token] ?? fallback?.trim() ?? "";
}
