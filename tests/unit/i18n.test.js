// i18n logic: locale fallback chain and message resolution. Pure functions — no
// DOM. Ported from tests/i18n.test.js (node:test) to Vitest; every case preserved.
import { test, expect } from "vitest";
import {
	localeChain,
	setDefaultLocale,
	MessageStore,
} from "../../packages/i18n/dist/index.js";

test("localeChain builds locale, base, default, en", () => {
	setDefaultLocale("en");
	expect(localeChain("fr-CA", "en")).toEqual(["fr-ca", "fr", "en"]);
	expect(localeChain("en-US")).toEqual(["en-us", "en"]);
	// De-duplicates and lower-cases; default folds in.
	expect(localeChain("de", "de")).toEqual(["de", "en"]);
});

test("MessageStore.resolve walks the fallback chain", () => {
	setDefaultLocale("en");
	const store = new MessageStore();
	store.register("ns", "en", { hi: "Hello", greet: "Hi {name}" });
	store.register("ns", "fr", { hi: "Bonjour" });

	// Exact/base-language hit: fr-CA falls back to fr.
	expect(store.resolve("ns", "fr-CA", "hi")).toBe("Bonjour");
	// No German bundle → falls through to en.
	expect(store.resolve("ns", "de", "hi")).toBe("Hello");
	// Missing key returns undefined, not a placeholder.
	expect(store.resolve("ns", "fr", "missing")).toBeUndefined();
	// Interpolation of {placeholder} params.
	expect(store.resolve("ns", "en", "greet", { name: "Bill" })).toBe("Hi Bill");
});

test("MessageStore.has and version track registration", () => {
	const store = new MessageStore();
	expect(store.has("ns", "en")).toBe(false);
	const v0 = store.version;
	store.register("ns", "en", { a: "A" });
	expect(store.has("ns", "EN")).toBe(true); // case-insensitive
	expect(store.version).toBeGreaterThan(v0);
});
