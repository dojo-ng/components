// plain.mjs — the vanilla host. No framework: static dj-* markup in plain.html,
// DOM properties and listeners wired here. Compare with framework.mjs,
// react.mjs, and vue.mjs; all four behave identically.

import "@dojo-ng/button";
import "@dojo-ng/text-input";
import "@dojo-ng/select";
import "@dojo-ng/switch";
import {
	ROLES, strings, currentLocale, setLocale, currentTheme, toggleTheme,
	printFormData, formattedSample, describeEvent,
} from "./shared/app.js";

const $ = (id) => document.getElementById(id);

// Interop point 1: the options array is set as a DOM PROPERTY.
$("role").options = ROLES;

// Interop point 2: dj-* components emit plain bubbling CustomEvents, so one
// listener on the form hears them all.
$("signup").addEventListener("change", (e) => {
	$("event").textContent = describeEvent(e);
});

$("signup").addEventListener("submit", (e) => {
	e.preventDefault();
	$("output").textContent = printFormData(new FormData(e.target));
});

$("theme").addEventListener("click", () => {
	$("state").textContent = `theme: ${toggleTheme()}`;
});

// Locale: setting lang on <html> re-renders the components through the i18n
// MutationObserver; the page's own strings are updated here.
function applyStrings() {
	const t = strings();
	$("title").textContent = t.title;
	$("name").label = t.name;
	$("role").label = t.role;
	$("newsletter").textContent = t.newsletter;
	$("submit").textContent = t.submit;
	$("locale-label").textContent = t.locale;
	$("theme").textContent = t.theme;
	$("sample").textContent = formattedSample();
}

$("locale").value = currentLocale();
$("locale").addEventListener("change", (e) => {
	setLocale(e.target.value);
	applyStrings();
});

$("state").textContent = `theme: ${currentTheme()}`;
applyStrings();
