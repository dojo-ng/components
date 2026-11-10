import type { FormatParams } from "./types.js";
import { normalizeLocale, getDefaultLocale } from "./locale.js";

/**
 * Formatting over native `Intl`. The `Intl` constructors are expensive, so each is memoized by
 * kind, locale, and options. Helpers take an explicit locale; a component passes its
 * `LocaleController.locale`.
 */

const intlCache = new Map<string, unknown>();
function memo<T>(kind: string, tag: string, opts: unknown, make: (locale: string) => T): T {
	// A bad tag (`en_US`, `""`) would make the Intl constructors throw; fall back instead.
	const locale = normalizeLocale(tag) ?? normalizeLocale(getDefaultLocale()) ?? "en";
	const key = `${kind}|${locale}|${opts ? JSON.stringify(opts) : ""}`;
	let v = intlCache.get(key) as T | undefined;
	if (v === undefined) {
		v = make(locale);
		intlCache.set(key, v);
	}
	return v;
}

export const dateTimeFormat = (locale: string, opts?: Intl.DateTimeFormatOptions) =>
	memo("dt", locale, opts, (l) => new Intl.DateTimeFormat(l, opts));
export const numberFormat = (locale: string, opts?: Intl.NumberFormatOptions) =>
	memo("n", locale, opts, (l) => new Intl.NumberFormat(l, opts));
export const relativeTimeFormat = (locale: string, opts?: Intl.RelativeTimeFormatOptions) =>
	memo("rt", locale, opts, (l) => new Intl.RelativeTimeFormat(l, opts));
export const pluralRules = (locale: string, opts?: Intl.PluralRulesOptions) =>
	memo("p", locale, opts, (l) => new Intl.PluralRules(l, opts));
export const listFormat = (locale: string, opts?: Intl.ListFormatOptions) =>
	memo("l", locale, opts, (l) => new Intl.ListFormat(l, opts));
export const collator = (locale: string, opts?: Intl.CollatorOptions) =>
	memo("c", locale, opts, (l) => new Intl.Collator(l, opts));
export const displayNames = (locale: string, opts: Intl.DisplayNamesOptions) =>
	memo("dn", locale, opts, (l) => new Intl.DisplayNames([l], opts));

const toDate = (value: Date | number | string): Date => (value instanceof Date ? value : new Date(value));
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Format a date. A date-only string (`"2026-11-10"`) is a calendar day, not an instant, so it is
 * shown as that day in every time zone. (`new Date("2026-11-10")` is UTC midnight, which is the
 * previous day west of UTC.)
 */
export const formatDate = (value: Date | number | string, locale: string, opts?: Intl.DateTimeFormatOptions) => {
	const day = typeof value === "string" ? DATE_ONLY.exec(value) : null;
	if (day) {
		const utc = new Date(Date.UTC(+day[1], +day[2] - 1, +day[3]));
		return dateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(utc);
	}
	return dateTimeFormat(locale, opts).format(toDate(value));
};
export const formatNumber = (value: number, locale: string, opts?: Intl.NumberFormatOptions) =>
	numberFormat(locale, opts).format(value);
export const formatList = (items: string[], locale: string, opts?: Intl.ListFormatOptions) =>
	listFormat(locale, opts).format(items);

/** Replace `{name}` placeholders in a template. Unknown placeholders are left untouched. */
const PLACEHOLDER = /\{(\w+)\}/g;
export function format(template: string, params?: FormatParams): string {
	if (!params) return template;
	return template.replace(PLACEHOLDER, (whole, key) => (key in params ? String(params[key]) : whole));
}

/**
 * Select a plural form for `count` using the locale's CLDR rules, then interpolate. `forms`
 * keys are CLDR categories ("one", "other", and so on); `{count}` is available in each form.
 *
 * ```ts
 * plural("en", n, { one: "{count} item", other: "{count} items" });
 * ```
 */
export function plural(
	locale: string,
	count: number,
	forms: Partial<Record<Intl.LDMLPluralRule, string>>,
): string {
	const rule = pluralRules(locale).select(count);
	const template = forms[rule] ?? forms.other ?? "";
	return format(template, { count });
}

/** Clear the memoized `Intl` instances. Rarely needed outside tests. */
export function clearIntlCache(): void {
	intlCache.clear();
}
