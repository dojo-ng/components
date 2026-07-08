// i18n edge cases the ported smokes miss (qa-requirements names formatters, the
// resolver, and the locale chain): locale-chain construction, MessageStore fallback
// corners, and the pure formatters. Pure — no DOM.
import { test, expect, afterEach } from "vitest";
import {
	localeChain,
	setDefaultLocale,
	MessageStore,
	format,
	plural,
	formatNumber,
	formatList,
	formatDate,
} from "../../packages/i18n/dist/index.js";

// setDefaultLocale mutates shared module state; reset so tests stay independent.
afterEach(() => setDefaultLocale("en"));

// --- localeChain ---

test("localeChain strips region to the base language for 3-part tags", () => {
	expect(localeChain("zh-Hant-CN", "en")).toEqual(["zh-hant-cn", "zh", "en"]);
});

test("localeChain lower-cases and de-duplicates", () => {
	expect(localeChain("FR-ca", "en")).toEqual(["fr-ca", "fr", "en"]);
});

test("localeChain folds the fallback and its base in before en", () => {
	expect(localeChain("es", "pt-BR")).toEqual(["es", "pt-br", "pt", "en"]);
});

test("localeChain always ends with en even when unrequested", () => {
	expect(localeChain("fr", "fr")).toEqual(["fr", "en"]);
});

test("localeChain uses the configured default when no fallback is passed", () => {
	setDefaultLocale("de");
	expect(localeChain("fr")).toEqual(["fr", "de", "en"]);
});

// --- MessageStore fallback ---

test("get returns undefined for an unknown namespace", () => {
	const s = new MessageStore();
	expect(s.get("nope", "en", "k")).toBeUndefined();
});

test("resolves via base-language fallback when only the base is registered", () => {
	const s = new MessageStore();
	s.register("ns", "fr", { hi: "Bonjour" });
	expect(s.resolve("ns", "fr-CA", "hi")).toBe("Bonjour");
	expect(s.resolve("ns", "de", "hi")).toBeUndefined(); // no de, no en bundle
});

test("falls through to the configured default locale", () => {
	setDefaultLocale("fr");
	const s = new MessageStore();
	s.register("ns", "fr", { hi: "Bonjour" });
	expect(s.resolve("ns", "de", "hi")).toBe("Bonjour");
});

test("register merges into an existing locale bundle instead of replacing it", () => {
	const s = new MessageStore();
	s.register("ns", "en", { a: "A" });
	s.register("ns", "en", { b: "B" });
	expect(s.get("ns", "en", "a")).toBe("A");
	expect(s.get("ns", "en", "b")).toBe("B");
});

test("resolve leaves unknown placeholders untouched", () => {
	const s = new MessageStore();
	s.register("ns", "en", { greet: "Hi {name}" });
	expect(s.resolve("ns", "en", "greet")).toBe("Hi {name}");
});

// --- pure formatters ---

test("format interpolates known params and leaves unknown ones", () => {
	expect(format("{a} {b}", { a: "x" })).toBe("x {b}");
	expect(format("no params")).toBe("no params");
});

test("plural selects the CLDR form and interpolates count", () => {
	const forms = { one: "{count} item", other: "{count} items" };
	expect(plural("en", 1, forms)).toBe("1 item");
	expect(plural("en", 2, forms)).toBe("2 items");
	// Missing exact category falls back to `other`.
	expect(plural("en", 5, { other: "{count} things" })).toBe("5 things");
});

test("formatNumber and formatList use Intl for the locale", () => {
	expect(formatNumber(1234.5, "en-US")).toBe("1,234.5");
	expect(formatList(["a", "b", "c"], "en-US")).toBe("a, b, and c");
});

test("formatDate is deterministic with an explicit UTC time zone", () => {
	const out = formatDate(Date.UTC(2020, 0, 15), "en-US", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		timeZone: "UTC",
	});
	expect(out).toBe("01/15/2020");
});
