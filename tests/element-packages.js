// The canonical package lists, shared by the node:test registration smoke
// (tests/registration.test.js, happy-dom) and the real-browser registration sweep
// (tests/browser/registration.test.js). One source of truth so the two never drift.

/** Every package that registers a custom element. Its tag name is always `dj-<pkg>`. */
export const ELEMENT_PACKAGES = [
	"accordion",
	"action-button",
	"alert",
	"audio",
	"avatar",
	"badge",
	"board",
	"breadcrumb-group",
	"button",
	"calendar",
	"card",
	"carousel",
	"chart",
	"checkbox",
	"checkbox-group",
	"chip",
	"chip-typeahead",
	"color-picker",
	"constrained-input",
	"context-menu",
	"context-popup",
	"copy-button",
	"data-grid",
	"date-input",
	"dialog",
	"dropdown",
	"email-input",
	"file-input",
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
	"search-box",
	"select",
	"skeleton",
	"slide-pane",
	"slider",
	"snackbar",
	"speed-dial",
	"split-panel",
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
	"video",
	"wizard",
];

/** Packages whose index registers more than one tag. Key: package name; value: the ADDITIONAL
 * tags beyond the default `dj-<pkg>` (which every entry in ELEMENT_PACKAGES already checks).
 * `chart` registers `dj-sparkline` alongside `dj-chart` — a separate small element sharing the
 * package's `core.ts` math rather than a package of its own. */
export const EXTRA_TAGS = {
	chart: ["dj-sparkline"],
};

/** Non-element packages: they must at least import without throwing. */
export const SUPPORT_PACKAGES = [
	"dojo-element",
	"context",
	"i18n",
	"store",
	"rich-text-headings",
	"rich-text-lists",
	"rich-text-table",
	"rich-text-menu",
	"rich-text-mentions",
	"rich-text-markdown",
	"rich-text-color",
	"rich-text-image",
	"data-grid-formats",
	"data-grid-cell-components",
	"data-grid-filter",
	"data-grid-pagination",
	"data-grid-edit",
	"data-grid-tree",
	"data-grid-groups",
	"data-grid-export",
	"data-grid-detail",
	"data-grid-rowstate",
	"data-grid-select",
];

/** Where a listed package's built entry lives, keyed by name — `packages/<name>` for every
 * FOSS entry above, `enterprise/packages/<name>` for anything the merge below adds. The
 * registration smokes need this because "packages/<pkg>" stops being a safe assumption the
 * moment a package can come from the overlay. */
export const PACKAGE_ROOT = {};
for (const pkg of [...ELEMENT_PACKAGES, ...SUPPORT_PACKAGES]) PACKAGE_ROOT[pkg] = "packages";

// Optional overlay merge: a public-only clone has no ../enterprise/tests/element-packages.js,
// so the import rejects and the catch leaves the three lists exactly as FOSS declared them
// above — no enterprise name ever has to appear in this file. When the overlay IS present, its
// module is expected to export the same three names in the same shape.
try {
	const overlay = await import("../enterprise/tests/element-packages.js");
	for (const pkg of overlay.ELEMENT_PACKAGES ?? []) {
		ELEMENT_PACKAGES.push(pkg);
		PACKAGE_ROOT[pkg] = "enterprise/packages";
	}
	Object.assign(EXTRA_TAGS, overlay.EXTRA_TAGS ?? {});
	for (const pkg of overlay.SUPPORT_PACKAGES ?? []) {
		SUPPORT_PACKAGES.push(pkg);
		PACKAGE_ROOT[pkg] = "enterprise/packages";
	}
} catch {
	// no overlay present
}
