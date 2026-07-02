import type { FormatParams } from "./types.js";

/**
 * Formatting over native `Intl`. The `Intl` constructors are expensive, so each is memoized by
 * kind, locale, and options. Helpers take an explicit locale; a component passes its
 * `LocaleController.locale`.
 */

const intlCache = new Map<string, unknown>();
function memo<T>(kind: string, locale: string, opts: unknown, make: () => T): T {
	const key = `${kind}|${locale}|${opts ? JSON.stringify(opts) : ""}`;
	let v = intlCache.get(key) as T | undefined;
	if (v === undefined) {
		v = make();
		intlCache.set(key, v);
	}
	return v;
}

export const dateTimeFormat = (locale: string, opts?: Intl.DateTimeFormatOptions) =>
	memo("dt", locale, opts, () => new Intl.DateTimeFormat(locale, opts));
export const numberFormat = (locale: string, opts?: Intl.NumberFormatOptions) =>
	memo("n", locale, opts, () => new Intl.NumberFormat(locale, opts));
export const relativeTimeFormat = (locale: string, opts?: Intl.RelativeTimeFormatOptions) =>
	memo("rt", locale, opts, () => new Intl.RelativeTimeFormat(locale, opts));
export const pluralRules = (locale: string, opts?: Intl.PluralRulesOptions) =>
	memo("p", locale, opts, () => new Intl.PluralRules(locale, opts));
export const listFormat = (locale: string, opts?: Intl.ListFormatOptions) =>
	memo("l", locale, opts, () => new Intl.ListFormat(locale, opts));
export const collator = (locale: string, opts?: Intl.CollatorOptions) =>
	memo("c", locale, opts, () => new Intl.Collator(locale, opts));
export const displayNames = (locale: string, opts: Intl.DisplayNamesOptions) =>
	memo("dn", locale, opts, () => new Intl.DisplayNames([locale], opts));

const toDate = (value: Date | number | string): Date => (value instanceof Date ? value : new Date(value));

export const formatDate = (value: Date | number | string, locale: string, opts?: Intl.DateTimeFormatOptions) =>
	dateTimeFormat(locale, opts).format(toDate(value));
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
