// framework.mjs — the @dojo-ng/framework host. The same mini-app rendered with
// the v()-only VDOM renderer: closure state + invalidate(). The renderer is
// property-first for custom elements, so the options array below lands as a
// DOM property (interop point 1); on* props become event listeners, and dj-*
// CustomEvents bubble to them like any DOM event (interop point 2).

import { renderer, v } from "@dojo-ng/framework";
import "@dojo-ng/button";
import "@dojo-ng/text-input";
import "@dojo-ng/select";
import "@dojo-ng/switch";
import {
	ROLES, LOCALES, strings, currentLocale, setLocale, currentTheme, toggleTheme,
	printFormData, formattedSample, describeEvent,
} from "./shared/app.js";

let output = "";
let lastEvent = "";
let theme = currentTheme();
let locale = currentLocale();

function view() {
	const t = strings(locale);
	return v("div", {}, [
		v("div", { class: "toolbar" }, [
			v("dj-button", { kind: "outlined", onclick: () => { theme = toggleTheme(); app.invalidate(); } }, [t.theme]),
			v("label", { for: "locale" }, [t.locale]),
			v("select", {
				id: "locale", class: "locale-select", value: locale,
				onchange: (e) => { locale = e.target.value; setLocale(locale); app.invalidate(); },
			}, LOCALES.map((l) => v("option", { key: l.value, value: l.value, selected: l.value === locale }, [l.label]))),
			v("span", { class: "state" }, [`theme: ${theme}`]),
		]),
		v("form", {
			class: "card",
			onsubmit: (e) => { e.preventDefault(); output = printFormData(new FormData(e.target)); app.invalidate(); },
			onchange: (e) => {
				if (e.target.tagName.startsWith("DJ-")) { lastEvent = describeEvent(e); app.invalidate(); }
			},
		}, [
			v("h1", {}, [t.title]),
			v("dj-text-input", { name: "name", label: t.name, required: true }),
			v("dj-select", { name: "role", label: t.role, options: ROLES }),
			v("dj-switch", { name: "newsletter" }, [t.newsletter]),
			v("dj-button", { type: "submit" }, [t.submit]),
			v("pre", { class: "output" }, [output || t.none]),
			v("p", { class: "sample" }, [formattedSample(locale)]),
			v("p", { class: "event" }, [lastEvent || t.noEvent]),
		]),
	]);
}

const app = renderer(view);
app.mount({ domNode: document.getElementById("app") });
