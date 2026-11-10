// CB23: i18n fixes. Locale tags with underscores, the zh-Hant script fallback, date-only
// strings west of UTC, load() walking the fallback chain, and the change notification that
// lets LocaleController re-render after translations arrive. Pure, no DOM.
import { test, expect, afterEach } from "vitest";
import {
	localeChain,
	loadChain,
	normalizeLocale,
	setDefaultLocale,
	MessageStore,
	formatDate,
	formatNumber,
	plural,
	clearIntlCache,
} from "../../packages/i18n/dist/index.js";

const TZ = process.env.TZ;
afterEach(() => {
	setDefaultLocale("en");
	if (TZ === undefined) delete process.env.TZ;
	else process.env.TZ = TZ;
	clearIntlCache();
});

test("normalizeLocale turns underscores into hyphens and rejects junk", () => {
	expect(normalizeLocale("en_US")).toBe("en-US");
	expect(normalizeLocale(" zh_hant_tw ")).toBe("zh-Hant-TW");
	expect(normalizeLocale("")).toBeUndefined();
	expect(normalizeLocale("not a locale!")).toBeUndefined();
});

test("Intl helpers accept en_US instead of throwing", () => {
	expect(formatNumber(1234.5, "en_US")).toBe("1,234.5");
	expect(plural("en_US", 2, { one: "{count} item", other: "{count} items" })).toBe("2 items");
	expect(formatDate(Date.UTC(2020, 0, 15), "en_US", { timeZone: "UTC" })).toBe("1/15/2020");
});

test("Intl helpers fall back to the default locale for an invalid tag", () => {
	setDefaultLocale("de");
	expect(formatNumber(1234.5, "not a locale!")).toBe("1.234,5");
});

test("localeChain includes the script subtag and skips extensions", () => {
	expect(localeChain("zh-Hant-TW", "en")).toEqual(["zh-hant-tw", "zh-hant", "zh", "en"]);
	expect(localeChain("zh_Hant", "en")).toEqual(["zh-hant", "zh", "en"]);
	expect(localeChain("en-US-u-ca-buddhist", "en")).toEqual(["en-us", "en"]);
	expect(localeChain("es", "zh-Hant-TW")).toEqual(["es", "zh-hant-tw", "zh-hant", "zh", "en"]);
});

test("loadChain keeps the original case for case-sensitive loaders", () => {
	expect(loadChain("fr-CA", "pt-BR")).toEqual(["fr-CA", "fr", "pt-BR", "pt", "en"]);
});

test("formatDate shows a date-only string as that day west of UTC", () => {
	process.env.TZ = "America/Los_Angeles";
	expect(formatDate("2026-11-10", "en-US")).toBe("11/10/2026");
	expect(formatDate("2026-01-01", "en-US", { dateStyle: "long" })).toBe("January 1, 2026");
});

test("formatDate shows a date-only string as that day east of UTC, even with a timeZone", () => {
	process.env.TZ = "Pacific/Auckland";
	expect(formatDate("2026-11-10", "en-US")).toBe("11/10/2026");
	expect(formatDate("2026-11-10", "en-US", { timeZone: "America/New_York" })).toBe("11/10/2026");
});

test("formatDate still treats a full ISO timestamp as an instant", () => {
	expect(formatDate("2026-11-10T03:00:00Z", "en-US", { timeZone: "America/Los_Angeles" })).toBe("11/9/2026");
});

test("load walks the fallback chain and keeps the tag's case", async () => {
	const asked = [];
	const store = new MessageStore({
		async load(ns, locale) {
			asked.push(locale);
			return locale === "fr" ? { hi: "Bonjour" } : {};
		},
	});
	store.register("ns", "en", { hi: "Hello" });
	await store.load("ns", "fr-CA");
	expect(asked).toEqual(["fr-CA", "fr"]); // en is already registered
	expect(store.resolve("ns", "fr-CA", "hi")).toBe("Bonjour");
	await store.load("ns", "fr-CA");
	expect(asked).toEqual(["fr-CA", "fr"]); // nothing fetched twice
});

test("load de-duplicates concurrent requests for the same locale", async () => {
	let calls = 0;
	const store = new MessageStore({
		async load() {
			calls++;
			return {};
		},
	});
	await Promise.all([store.load("ns", "de"), store.load("ns", "de-AT")]);
	expect(calls).toBe(3); // de-AT, de, en: each once
});

test("subscribe batches changes in one task into one call", async () => {
	const store = new MessageStore();
	let calls = 0;
	const off = store.subscribe(() => calls++);
	store.register("ns", "fr", { a: "A" });
	store.register("ns", "de", { a: "A" });
	expect(calls).toBe(0);
	await Promise.resolve();
	expect(calls).toBe(1);
	off();
	store.register("ns", "es", { a: "A" });
	await Promise.resolve();
	expect(calls).toBe(1);
});

test("a loaded bundle notifies subscribers", async () => {
	const store = new MessageStore({ load: async () => ({ hi: "Hallo" }) });
	let calls = 0;
	store.subscribe(() => calls++);
	await store.load("ns", "de");
	await Promise.resolve();
	expect(calls).toBeGreaterThan(0);
});
