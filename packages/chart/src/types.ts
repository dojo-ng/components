/**
 * Chart mark type. `line`/`area`/`bar` are cartesian (category x, linear y); `scatter`/`bubble`
 * are an x/y plot (linear x and y); `pie`/`donut` are radial. A series can override the
 * chart-level `type` to build combos.
 */
export type ChartType = "line" | "area" | "bar" | "scatter" | "bubble" | "pie" | "donut";

/** How `dj-chart` draws series marks. `"canvas"` is an opt-in escape hatch for very large series
 * (axes, grid, legend, and tooltip stay SVG/DOM either way). */
export type ChartRenderer = "svg" | "canvas";

/** How a non-finite (missing) cell is drawn. `"gap"` (the default) breaks the line/area and omits
 * the marker, bar, and point — the honest reading, since the alternative silently plots a zero the
 * data never gave. `"connect"` spans the hole in a line/area instead of breaking it (bars, markers,
 * and points are still omitted, since there's no value to place one at). `"zero"` treats it as a
 * real zero — today's pre-Track-V behavior, kept as an escape hatch for a consumer relying on it. */
export type MissingMode = "gap" | "connect" | "zero";

/** One plotted series, reading its y value from `key` on each data row. */
export interface ChartSeries {
	/** Accessor key into each data row for this series' numeric value. */
	key: string;
	/** Legend and data-table label; defaults to `key`. */
	label?: string;
	/** Per-series mark type; defaults to the chart's `type`. */
	type?: ChartType;
	/** Explicit color; otherwise assigned from the theme ramp by index. */
	color?: string;
	/** Per-series numeric x accessor for scatter/bubble; defaults to the chart's `xKey`. */
	xKey?: string;
	/** Numeric accessor for bubble radius (area-encoded); defaults to the chart's `sizeKey`. */
	sizeKey?: string;
	/** Which y-axis this series uses. `"right"` adds a secondary axis with its own scale. Defaults to `"left"`. */
	axis?: "left" | "right";
	/** Override the chart's `missing` handling for this series. */
	missing?: MissingMode;
	/** Override the chart's `pointLabels` for this series. */
	pointLabels?: boolean;
}

/** A row of data. Values are read by `categoryKey` (x) and each series `key` (y). */
export type ChartDatum = Record<string, unknown>;

export interface ChartMargin {
	top: number;
	right: number;
	bottom: number;
	left: number;
}
