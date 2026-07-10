// vue.mjs — the Vue 3 host (esm-browser build, in-browser template). The two
// interop points:
//   1. :options="roles" — Vue sees "options" exists on the custom element and
//      binds the array as a DOM PROPERTY.
//   2. @change on the form — Vue attaches a native listener, so the bubbling
//      dj-* CustomEvents need nothing special at all.
// isCustomElement tells Vue's compiler that dj-* tags are not Vue components.

import { createApp } from "vue";
import "@dojo-ng/button";
import "@dojo-ng/text-input";
import "@dojo-ng/select";
import "@dojo-ng/switch";
import {
	ROLES, LOCALES, strings, currentLocale, setLocale, currentTheme, toggleTheme,
	printFormData, formattedSample, describeEvent,
} from "./shared/app.js";

const app = createApp({
	data: () => ({
		roles: ROLES,
		locales: LOCALES,
		theme: currentTheme(),
		locale: currentLocale(),
		output: "",
		lastEvent: "",
	}),
	computed: {
		t() { return strings(this.locale); },
		sample() { return formattedSample(this.locale); },
	},
	methods: {
		onToggleTheme() { this.theme = toggleTheme(); },
		onLocale(e) { this.locale = e.target.value; setLocale(this.locale); },
		onSubmit(e) { this.output = printFormData(new FormData(e.target)); },
		onComponentChange(e) {
			if (e.target.tagName.startsWith("DJ-")) this.lastEvent = describeEvent(e);
		},
	},
	template: `
		<div class="toolbar">
			<dj-button kind="outlined" @click="onToggleTheme">{{ t.theme }}</dj-button>
			<label for="locale">{{ t.locale }}</label>
			<select id="locale" class="locale-select" :value="locale" @change="onLocale">
				<option v-for="l in locales" :key="l.value" :value="l.value">{{ l.label }}</option>
			</select>
			<span class="state">theme: {{ theme }}</span>
		</div>
		<form class="card" @submit.prevent="onSubmit" @change="onComponentChange">
			<h1>{{ t.title }}</h1>
			<dj-text-input name="name" :label="t.name" required></dj-text-input>
			<dj-select name="role" :label="t.role" :options="roles"></dj-select>
			<dj-switch name="newsletter">{{ t.newsletter }}</dj-switch>
			<dj-button type="submit">{{ t.submit }}</dj-button>
			<pre class="output">{{ output || t.none }}</pre>
			<p class="sample">{{ sample }}</p>
			<p class="event">{{ lastEvent || t.noEvent }}</p>
		</form>
	`,
});

app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith("dj-");
app.mount("#app");
