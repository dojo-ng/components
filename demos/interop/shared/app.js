// shared/app.js — data and helpers shared by all four hosts, so behavior stays
// identical everywhere. Each host owns its own rendering; nothing here touches
// the DOM except the <html> attribute setters.

import { messages, formatDate, formatNumber } from "@dojo-ng/i18n";

// Passed to <dj-select> as a DOM PROPERTY in every host (interop point 1: rich
// data can't ride an attribute string).
export const ROLES = [
	{ value: "member", label: "Member" },
	{ value: "editor", label: "Editor" },
	{ value: "admin", label: "Administrator" },
];

export const LOCALES = [
	{ value: "en-US", label: "English" },
	{ value: "de-DE", label: "Deutsch" },
];

// Page strings, keyed by base language.
export const STRINGS = {
	en: {
		title: "Member signup",
		name: "Name",
		role: "Role",
		newsletter: "Newsletter",
		submit: "Sign up",
		theme: "Toggle theme",
		locale: "Locale",
		none: "(nothing submitted yet)",
		noEvent: "(no component event yet)",
	},
	de: {
		title: "Mitgliederanmeldung",
		name: "Name",
		role: "Rolle",
		newsletter: "Newsletter",
		submit: "Anmelden",
		theme: "Thema wechseln",
		locale: "Sprache",
		none: "(noch nichts gesendet)",
		noEvent: "(noch kein Komponenten-Ereignis)",
	},
};

// German for the components' own built-in strings, so dj-select's default
// placeholder localizes along with the page.
messages.register("dj", "de", { selectPlaceholder: "Auswählen…" });

export function currentLocale() {
	return document.documentElement.lang || "en-US";
}

export function strings(locale = currentLocale()) {
	return STRINGS[locale.split("-")[0]] ?? STRINGS.en;
}

// The i18n mechanism is the platform's lang attribute: set it on <html> and a
// shared MutationObserver inside @dojo-ng/i18n re-renders every component.
export function setLocale(locale) {
	document.documentElement.lang = locale;
}

export function currentTheme() {
	return document.documentElement.dataset.djTheme || "light";
}

export function toggleTheme() {
	const html = document.documentElement;
	html.dataset.djTheme = html.dataset.djTheme === "dark" ? "light" : "dark";
	return html.dataset.djTheme;
}

// One line per FormData entry. Every host prints exactly this.
export function printFormData(fd) {
	const lines = [...fd.entries()].map(([k, v]) => `${k}=${v}`);
	return lines.length ? lines.join("\n") : "(empty)";
}

// Locale-sensitive sample proving Intl formatting follows the lang switch:
// en-US "July 10, 2026 · 1,234.56" vs de-DE "10. Juli 2026 · 1.234,56".
export function formattedSample(locale = currentLocale()) {
	return `${formatDate(new Date(2026, 6, 10), locale, { dateStyle: "long" })} · ${formatNumber(1234.56, locale)}`;
}

// Describes a component event for the "last component event" line
// (interop point 2: dj-* components emit plain bubbling, composed CustomEvents).
export function describeEvent(e) {
	const t = e.target;
	const detail = t.tagName === "DJ-SWITCH" ? String(t.checked) : (t.value ?? "");
	return `${t.tagName.toLowerCase()} → ${e.type}${detail !== "" ? ` (${detail})` : ""}`;
}
