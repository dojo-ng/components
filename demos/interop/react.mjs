// react.mjs — the React 19 host (htm tagged templates, no JSX build). The two
// interop points:
//   1. options=${ROLES} — React 19 sees "options" exists on the custom element
//      and assigns the array as a DOM PROPERTY, not a stringified attribute.
//   2. dj-* components emit plain bubbling CustomEvents. React's synthetic
//      system doesn't manage those, so the exemplar pattern is a ref +
//      addEventListener — ordinary DOM, which is the point.

import { createElement as h, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import htm from "htm";
import "@dojo-ng/button";
import "@dojo-ng/text-input";
import "@dojo-ng/select";
import "@dojo-ng/switch";
import {
	ROLES, LOCALES, strings, currentLocale, setLocale, currentTheme, toggleTheme,
	printFormData, formattedSample, describeEvent,
} from "./shared/app.js";

const html = htm.bind(h);

function App() {
	const [theme, setTheme] = useState(currentTheme());
	const [locale, setLoc] = useState(currentLocale());
	const [output, setOutput] = useState("");
	const [lastEvent, setLastEvent] = useState("");
	const formRef = useRef(null);
	const themeRef = useRef(null);
	const t = strings(locale);

	// Interop point 2: one DOM listener on the form hears every dj-* change.
	useEffect(() => {
		const form = formRef.current;
		const onChange = (e) => {
			if (e.target.tagName.startsWith("DJ-")) setLastEvent(describeEvent(e));
		};
		form.addEventListener("change", onChange);
		return () => form.removeEventListener("change", onChange);
	}, []);

	// dj-button's activation is a plain click; a ref listener keeps the same
	// DOM-first pattern for it too.
	useEffect(() => {
		const btn = themeRef.current;
		const onClick = () => setTheme(toggleTheme());
		btn.addEventListener("click", onClick);
		return () => btn.removeEventListener("click", onClick);
	}, []);

	const onSubmit = (e) => {
		e.preventDefault();
		setOutput(printFormData(new FormData(e.target)));
	};

	const onLocale = (e) => {
		setLocale(e.target.value);
		setLoc(e.target.value);
	};

	return html`
		<div class="toolbar">
			<dj-button ref=${themeRef} kind="outlined">${t.theme}</dj-button>
			<label for="locale">${t.locale}</label>
			<select id="locale" class="locale-select" value=${locale} onChange=${onLocale}>
				${LOCALES.map((l) => html`<option key=${l.value} value=${l.value}>${l.label}</option>`)}
			</select>
			<span class="state">theme: ${theme}</span>
		</div>
		<form ref=${formRef} class="card" onSubmit=${onSubmit}>
			<h1>${t.title}</h1>
			<dj-text-input name="name" label=${t.name} required></dj-text-input>
			<dj-select name="role" label=${t.role} options=${ROLES}></dj-select>
			<dj-switch name="newsletter">${t.newsletter}</dj-switch>
			<dj-button type="submit">${t.submit}</dj-button>
			<pre class="output">${output || t.none}</pre>
			<p class="sample">${formattedSample(locale)}</p>
			<p class="event">${lastEvent || t.noEvent}</p>
		</form>
	`;
}

createRoot(document.getElementById("app")).render(h(App));
