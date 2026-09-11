import type { TemplateResult } from "lit";
import type { ChartDatum, ChartSeries, ValueScale, Scales } from "./types.js";
import type { DjChart } from "./dj-chart.js";

/** A strip of vertical space below the plot, owned by a plugin (volume, an oscillator). */
export interface ChartPane {
	id: string;
	/** Height in px. The core shrinks the plot by the sum of all panes. */
	height: number;
	/** Value domain for this pane's own scale. */
	domain: [number, number];
	/** Accessible name for the pane's own group. */
	label: string;
}

/** What a plugin can see. Rebuilt per render — never hold it past the call. */
export interface ChartContext {
	readonly host: DjChart;
	/** The rows actually being drawn (the brush window's slice, not necessarily all of `data`). */
	readonly data: ChartDatum[];
	readonly series: ChartSeries[];
	readonly categoryKey: string;
	readonly scales: Scales;
	readonly inner: { width: number; height: number };
	readonly locale: string;
	/** The chart's own value formatter (respects `numberFormat` and `formatY`). */
	format(value: number): string;
	/** Center x for a category, band or point scale alike. */
	xCenter(category: string): number;
	/** A pane's own value scale, by pane id. */
	paneScale(id: string): ValueScale | undefined;
	refresh(): void;
}

export interface ChartPlugin {
	name: string;
	/** Extra value-domain reach, merged into the primary axis domain. */
	domain?(ctx: ChartContext): [number, number] | undefined;
	/** Panes to reserve below the plot. Resolved before layout, so this must not read `ctx.inner`. */
	panes?(ctx: ChartContext): ChartPane[];
	/** Marks drawn beneath the core series. */
	renderUnder?(ctx: ChartContext): unknown;
	/** Marks drawn above the core series. */
	renderOver?(ctx: ChartContext): unknown;
	/** Marks inside a pane this plugin declared. */
	renderPane?(pane: ChartPane, ctx: ChartContext): unknown;
	/** Replace the tooltip body for a category. First non-undefined in array order wins. */
	renderTooltip?(category: string, ctx: ChartContext): TemplateResult | undefined;
	/** Legend entries for marks this plugin draws (they are not in `series`). */
	legendItems?(ctx: ChartContext): Array<{ label: string; color: string }>;
	/** Extra columns for the accessible data table: a header and one cell per rendered row. */
	tableRows?(ctx: ChartContext): Array<{ header: string; cells: string[] }>;
	/** Listeners and controllers. Return a disposer. */
	setup?(ctx: ChartContext): (() => void) | void;
}

export const defineChartPlugin = (p: ChartPlugin): ChartPlugin => p;
