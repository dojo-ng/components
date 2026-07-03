// Element-registration smoke: importing each package's built entry must register
// its <dj-*> custom element. Catches a package whose index.ts forgot to call
// `define()`, a broken build (missing dist), or a tag-name typo.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";

// Every package that registers a custom element. Tag name is always `dj-<pkg>`.
const ELEMENT_PACKAGES = [
	"accordion",
	"action-button",
	"avatar",
	"breadcrumb-group",
	"button",
	"calendar",
	"card",
	"chart",
	"checkbox",
	"checkbox-group",
	"chip",
	"chip-typeahead",
	"constrained-input",
	"context-menu",
	"context-popup",
	"data-grid",
	"date-input",
	"dialog",
	"email-input",
	"floating-action-button",
	"form",
	"global-event",
	"grid",
	"header",
	"header-card",
	"helper-text",
	"icon",
	"label",
	"list",
	"loading-indicator",
	"native-select",
	"number-input",
	"pagination",
	"password-input",
	"popup",
	"popup-confirmation",
	"progress",
	"radio",
	"radio-group",
	"range-slider",
	"rate",
	"result",
	"rich-text",
	"select",
	"slide-pane",
	"slider",
	"snackbar",
	"speed-dial",
	"stack",
	"switch",
	"tab-container",
	"text",
	"text-area",
	"text-input",
	"theme",
	"three-column-layout",
	"time-picker",
	"title-pane",
	"toolbar",
	"tooltip",
	"tree",
	"trigger-popup",
	"two-column-layout",
	"typeahead",
	"wizard",
];

for (const pkg of ELEMENT_PACKAGES) {
	const tag = `dj-${pkg}`;
	test(`${pkg} registers <${tag}>`, async () => {
		await import(`../packages/${pkg}/dist/index.js`);
		const ctor = customElements.get(tag);
		assert.equal(typeof ctor, "function", `${tag} was not registered`);
	});
}

// The non-element packages must at least import without throwing.
const SUPPORT_PACKAGES = [
	"dojo-element",
	"context",
	"i18n",
	"store",
	"pubsub",
	"rich-text-headings",
	"rich-text-lists",
	"data-grid-formats",
	"data-grid-cell-components",
	"data-grid-filter",
	"data-grid-pagination",
];

for (const pkg of SUPPORT_PACKAGES) {
	test(`${pkg} imports cleanly`, async () => {
		const mod = await import(`../packages/${pkg}/dist/index.js`);
		assert.ok(mod, `${pkg} produced no module namespace`);
	});
}
