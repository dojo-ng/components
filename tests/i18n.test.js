// i18n logic smokes: the locale fallback chain and message resolution. Pure
// functions — no DOM required.
import test from "node:test";
import assert from "node:assert/strict";
import {
	localeChain,
	setDefaultLocale,
	MessageStore,
} from "../packages/i18n/dist/index.js";

test("localeChain builds locale, base, default, en", () => {
	setDefaultLocale("en");
	assert.deepEqual(localeChain("fr-CA", "en"), ["fr-ca", "fr", "en"]);
	assert.deepEqual(localeChain("en-US"), ["en-us", "en"]);
	// De-duplicates and lower-cases; default folds in.
	assert.deepEqual(localeChain("de", "de"), ["de", "en"]);
});

test("MessageStore.resolve walks the fallback chain", () => {
	setDefaultLocale("en");
	const store = new MessageStore();
	store.register("ns", "en", { hi: "Hello", greet: "Hi {name}" });
	store.register("ns", "fr", { hi: "Bonjour" });

	// Exact/base-language hit: fr-CA falls back to fr.
	assert.equal(store.resolve("ns", "fr-CA", "hi"), "Bonjour");
	// No German bundle → falls through to en.
	assert.equal(store.resolve("ns", "de", "hi"), "Hello");
	// Missing key returns undefined, not a placeholder.
	assert.equal(store.resolve("ns", "fr", "missing"), undefined);
	// Interpolation of {placeholder} params.
	assert.equal(store.resolve("ns", "en", "greet", { name: "Bill" }), "Hi Bill");
});

test("MessageStore.has and version track registration", () => {
	const store = new MessageStore();
	assert.equal(store.has("ns", "en"), false);
	const v0 = store.version;
	store.register("ns", "en", { a: "A" });
	assert.equal(store.has("ns", "EN"), true); // case-insensitive
	assert.ok(store.version > v0);
});
