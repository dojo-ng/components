// data.js — deterministic sample data plus the locale/theme/format helpers the
// records demo shares. The row set is generated from a seeded PRNG so every load
// produces the identical 500 rows (the demo's "deterministic data" requirement).
// Nothing here touches the DOM except the <html> attribute setters.

import { messages, formatDate, formatNumber } from "@dojo-ng/i18n";

// --- Seeded PRNG (mulberry32). Fixed seed → identical sequence every load. ---
function mulberry32(seed) {
	let a = seed >>> 0;
	return function () {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const FIRST = ["Ada", "Bo", "Cy", "Dee", "Eli", "Fay", "Gus", "Hana", "Ivy", "Jo",
	"Kai", "Lena", "Mo", "Nia", "Omar", "Pia", "Quinn", "Rae", "Sol", "Tess",
	"Uma", "Vic", "Wen", "Xan", "Yara", "Zane"];
const LAST = ["Ahmed", "Berg", "Cruz", "Diaz", "Evans", "Fischer", "Gupta", "Haas",
	"Ito", "Jones", "Khan", "Lopez", "Moore", "Novak", "Ortiz", "Park", "Reed",
	"Singh", "Tran", "Ullman", "Vogel", "Weiss", "Yoon", "Zhang"];
const ROLES = ["Member", "Editor", "Reviewer", "Administrator"];
const DEPARTMENTS = ["Engineering", "Research", "Education", "Operations", "Finance"];
const STATUSES = ["active", "pending", "suspended"];

// The select control in the edit dialog needs {value,label} option objects. Both
// roles and departments are single-word, so value === label works fine here.
export const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: r }));
export const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: s }));

// Generate the canonical row set. Called once per load; deterministic.
export function generateRecords(count = 500) {
	const rand = mulberry32(0x1a2b3c4d);
	const pick = (arr) => arr[Math.floor(rand() * arr.length)];
	const rows = [];
	for (let i = 0; i < count; i++) {
		const first = pick(FIRST);
		const last = pick(LAST);
		const year = 2018 + Math.floor(rand() * 8);
		const month = Math.floor(rand() * 12);
		const day = 1 + Math.floor(rand() * 28);
		rows.push({
			id: i + 1,
			name: `${first} ${last}`,
			email: `${first}.${last}${i + 1}@example.org`.toLowerCase(),
			role: pick(ROLES),
			department: pick(DEPARTMENTS),
			status: pick(STATUSES),
			joined: new Date(Date.UTC(year, month, day)).toISOString(),
			balance: Math.round(rand() * 500000) / 100, // 0–5000.00
		});
	}
	return rows;
}

// --- Page strings, keyed by base language. ---
export const STRINGS = {
	en: {
		title: "Members",
		add: "Add member",
		addTitle: "Add member",
		editTitle: "Edit member",
		edit: "Edit",
		delete: "Delete",
		deleteSelected: "Delete selected",
		save: "Save",
		cancel: "Cancel",
		name: "Name",
		email: "Email",
		role: "Role",
		department: "Department",
		status: "Status",
		joined: "Joined",
		balance: "Balance",
		actions: "Actions",
		theme: "Toggle theme",
		locale: "Locale",
		confirmDelete: (n) => `Delete ${n}?`,
		added: (n) => `Added ${n}`,
		saved: (n) => `Saved ${n}`,
		deleted: (n) => `Deleted ${n}`,
		loading: "Loading members…",
	},
	de: {
		title: "Mitglieder",
		add: "Mitglied hinzufügen",
		addTitle: "Mitglied hinzufügen",
		editTitle: "Mitglied bearbeiten",
		edit: "Bearbeiten",
		delete: "Löschen",
		deleteSelected: "Ausgewählte löschen",
		save: "Speichern",
		cancel: "Abbrechen",
		name: "Name",
		email: "E-Mail",
		role: "Rolle",
		department: "Abteilung",
		status: "Status",
		joined: "Beigetreten",
		balance: "Saldo",
		actions: "Aktionen",
		theme: "Thema wechseln",
		locale: "Sprache",
		confirmDelete: (n) => `${n} löschen?`,
		added: (n) => `${n} hinzugefügt`,
		saved: (n) => `${n} gespeichert`,
		deleted: (n) => `${n} gelöscht`,
		loading: "Mitglieder werden geladen…",
	},
};

// German for the components' own built-in strings (dj-select placeholder), so
// the controls localize along with the page.
messages.register("dj", "de", { selectPlaceholder: "Auswählen…" });

export const LOCALES = [
	{ value: "en-US", label: "English" },
	{ value: "de-DE", label: "Deutsch" },
];

export function currentLocale() {
	return document.documentElement.lang || "en-US";
}

export function strings(locale = currentLocale()) {
	return STRINGS[locale.split("-")[0]] ?? STRINGS.en;
}

// The i18n mechanism is the platform lang attribute: set it on <html> and the
// shared observer inside @dojo-ng/i18n re-renders every component (and the
// formats plugin re-formats grid cells).
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

// Format a balance for the plain-text snackbar messages (the grid cells use the
// formats plugin; this is only for toast text, which is outside the grid).
export function formatMoney(value, locale = currentLocale()) {
	return formatNumber(value, locale, { style: "currency", currency: "USD" });
}

export { formatDate };
