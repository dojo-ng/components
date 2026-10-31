/** Minimum pixel gap between two kept ticks before a tighter grouping is rejected — reusing
 * `@dojo-ng/chart`'s own `logTicks` default rather than inventing a second "how crowded
 * is too crowded" number for the same kind of decision. */
export const MIN_TICK_GAP_PX = 24;

/** `(year, month)` grouping key for one category, via `Intl.DateTimeFormat.formatToParts` rather
 * than `Date.getUTCFullYear()`/`getUTCMonth()` — locale-aware (it uses
 * Intl.DateTimeFormat with the chart's locale) and calendar-aware for a locale whose default
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

function halfKey(date: Date, locale: string): string {
	const { year, month } = monthPartsOf(date, locale);
	return `${year}-H${Number(month) <= 6 ? 1 : 2}`;
}

function yearKey(date: Date, locale: string): string {
	return monthPartsOf(date, locale).year;
}

/** Every `n`th year (by the year number, so the kept years are round: 2020, 2025, ...). */
function yearsEvery(n: number): (date: Date, locale: string) => string {
	return (date, locale) => String(Math.floor(Number(monthPartsOf(date, locale).year) / n));
}

/** The first category in each distinct `keyFn` group, in category order. */
function boundaries(categories: string[], dates: Date[], keyFn: (d: Date, locale: string) => string, locale: string): number[] {
	const seen = new Set<string>();
	const out: number[] = [];
	categories.forEach((_, i) => {
		const k = keyFn(dates[i], locale);
		if (!seen.has(k)) {
			seen.add(k);
			out.push(i);
		}
	});
	return out;
}

/** Whether every pair of neighboring kept indices sits at least `MIN_TICK_GAP_PX` apart, given
 * `pxPer` pixels between adjacent categories (the axis is ordinal, so position is index × pxPer). */
function fits(indices: number[], pxPer: number): boolean {
	for (let i = 1; i < indices.length; i++) if ((indices[i] - indices[i - 1]) * pxPer < MIN_TICK_GAP_PX) return false;
	return true;
}

/** Thins ordinal date categories to month, quarter, half-year, or year starts (then every 2, 5, or
 * 10 years), whichever is the finest grouping that fits the available pixels, for a consumer to
 * wire through `dj-chart`'s existing `formatX` — the core needs no change at all:
 * `formatX = (c) => tradingDayTicksSet.has(c) ? label(c) : ""`. Fit is judged on actual positions
 * (index spacing × pixels per category), not on a count, so uneven groups (a partial first month)
 * can't sneak two labels into one slot. The first and last category are always kept, even when
 * they don't themselves fall on a boundary, so the visible date range's edges are never silently
 * dropped; a boundary too close to either edge gives way to it instead. */
export function tradingDayTicks(categories: string[], pixels: number, locale: string): string[] {
	if (categories.length <= 2) return categories;
	const n = categories.length;
	const pxPer = pixels / (n - 1);
	const dates = categories.map((c) => new Date(c));
	const levels = [monthKey, quarterKey, halfKey, yearKey, yearsEvery(2), yearsEvery(5), yearsEvery(10)];
	let picked: number[] = [];
	for (const keyFn of levels) {
		// Index 0 is always the first "boundary" found (the earliest date opens its own group),
		// but it is an endpoint, kept below regardless, not a real group start; judging fit on it
		// would let a partial first month push the whole axis to a coarser grouping.
		picked = boundaries(categories, dates, keyFn, locale).filter((i) => i !== 0);
		if (fits(picked, pxPer)) break;
	}
	const minIdxGap = MIN_TICK_GAP_PX / (pxPer || 1);
	const keep = new Set<number>([0, n - 1]);
	for (const i of picked) {
		if (i - 0 >= minIdxGap && n - 1 - i >= minIdxGap) keep.add(i);
	}
	return categories.filter((_, i) => keep.has(i));
}
