/** Minimum pixel gap between two kept ticks before a tighter grouping is rejected — reusing
 * `@dojo-ng/chart`'s own `logTicks` default (Track L) rather than inventing a second "how crowded
 * is too crowded" number for the same kind of decision. */
export const MIN_TICK_GAP_PX = 24;

/** `(year, month)` grouping key for one category, via `Intl.DateTimeFormat.formatToParts` rather
 * than `Date.getUTCFullYear()`/`getUTCMonth()` — locale-aware (decision, F4: "using
 * Intl.DateTimeFormat through the chart's locale") and calendar-aware for a locale whose default
 * calendar isn't Gregorian, not just a timezone-safe way to read the same two numbers. */
function monthPartsOf(date: Date, locale: string): { year: string; month: string } {
	const parts = new Intl.DateTimeFormat(locale, { year: "numeric", month: "numeric", timeZone: "UTC" }).formatToParts(date);
	return {
		year: parts.find((p) => p.type === "year")?.value ?? "",
		month: parts.find((p) => p.type === "month")?.value ?? "",
	};
}

function monthKey(date: Date, locale: string): string {
	const { year, month } = monthPartsOf(date, locale);
	return `${year}-${month}`;
}

function quarterKey(date: Date, locale: string): string {
	const { year, month } = monthPartsOf(date, locale);
	const q = Math.floor((Number(month) - 1) / 3);
	return `${year}-Q${q}`;
}

/** The first category in each distinct `keyFn` group, in category order. */
function boundaries(categories: string[], dates: Date[], keyFn: (d: Date, locale: string) => string, locale: string): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	categories.forEach((c, i) => {
		const k = keyFn(dates[i], locale);
		if (!seen.has(k)) {
			seen.add(k);
			out.push(c);
		}
	});
	return out;
}

/** Whether `n` ticks fit across `pixels` at `MIN_TICK_GAP_PX` apart — n-1 gaps for n ticks, and a
 * single tick always "fits" (nothing to crowd against). */
function fits(n: number, pixels: number): boolean {
	return n <= 1 || pixels / (n - 1) >= MIN_TICK_GAP_PX;
}

/** Thins ordinal date categories to month or quarter starts (decision 16), by available pixels,
 * for a consumer to wire through `dj-chart`'s existing `formatX` — the core needs no change at
 * all: `formatX = (c) => tradingDayTicksSet.has(c) ? label(c) : ""`. The first and last category
 * are always kept regardless of grouping, even when they don't themselves fall on a boundary, so
 * the visible date range's edges are never silently dropped. */
export function tradingDayTicks(categories: string[], pixels: number, locale: string): string[] {
	if (categories.length <= 2) return categories;
	const dates = categories.map((c) => new Date(c));
	const monthTicks = boundaries(categories, dates, monthKey, locale);
	const picked = fits(monthTicks.length, pixels) ? monthTicks : boundaries(categories, dates, quarterKey, locale);
	const keep = new Set(picked);
	keep.add(categories[0]);
	keep.add(categories[categories.length - 1]);
	return categories.filter((c) => keep.has(c));
}
