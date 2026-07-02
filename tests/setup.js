// DOM environment for tests that touch the DOM.
//
// Registers a happy-dom environment on Node's globalThis so Lit web components
// can be imported, upgraded, and exercised under `node --test`. Import this
// FIRST — before any component or `lit` import — in any test file that mounts
// elements. Pure-logic tests (i18n, store, pubsub) don't need it.
//
// Two things make Lit work here:
//   1. The test script runs node with `--conditions=browser`, so Lit resolves
//      its browser build (real rendering) instead of the SSR "node" build
//      (which references `Document` at load and never renders).
//   2. We install happy-dom's window globals on globalThis. The DOM-ish names
//      Node predefines (Event, CustomEvent, KeyboardEvent, FormData, …) are
//      OVERRIDDEN with happy-dom's so component code and happy-dom share one
//      implementation — a Node-built CustomEvent can't dispatch on a happy-dom
//      node, and Node's FormData can't read a happy-dom form.
//
// Install with: npm install  (happy-dom is a root devDependency).

// Load happy-dom SYNCHRONOUSLY (via its CJS build) — not `await import`. With a
// top-level await here, statically-imported components (and Lit) could evaluate
// before the globals are installed, and Lit's `class extends HTMLElement` would
// throw "HTMLElement is not defined". A synchronous require guarantees this file
// finishes before any sibling import runs.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

let Window;
try {
	({ Window } = require("happy-dom"));
} catch {
	throw new Error(
		"happy-dom is not installed. Run `npm install` in Dojo NG/components " +
			"(it is a root devDependency) before running the DOM tests.",
	);
}

const window = new Window({ url: "http://localhost/" });

globalThis.window = window;
globalThis.document = window.document;

// The globals Lit's browser build and these components read, at module-eval and
// at runtime. Explicit (not a blanket window copy) to avoid touching happy-dom
// getters that crash when rebound onto globalThis.
const GLOBALS = [
	"Document",
	"DocumentFragment",
	"Node",
	"NodeFilter",
	"Element",
	"ShadowRoot",
	"Text",
	"Comment",
	"HTMLElement",
	"HTMLInputElement",
	"HTMLSelectElement",
	"HTMLTextAreaElement",
	"HTMLTemplateElement",
	"HTMLSlotElement",
	"customElements",
	"CustomEvent",
	"Event",
	"EventTarget",
	"KeyboardEvent",
	"MouseEvent",
	"PointerEvent",
	"InputEvent",
	"FocusEvent",
	"MutationObserver",
	"ResizeObserver",
	"IntersectionObserver",
	"getComputedStyle",
	"requestAnimationFrame",
	"cancelAnimationFrame",
	"CSSStyleSheet",
	"ElementInternals",
	"FormData",
	"DOMParser",
];
for (const name of GLOBALS) {
	if (window[name] === undefined) continue;
	try {
		Object.defineProperty(globalThis, name, {
			configurable: true,
			writable: true,
			value: window[name],
		});
	} catch {
		// A few globals are non-configurable in Node; happy-dom's isn't required for them.
	}
}

// happy-dom 15 ships no ElementInternals / attachInternals, which every
// form-associated dj- control needs. In production the app loads
// element-internals-polyfill; for tests we install a minimal shim that is
// enough for these smokes: it records the submitted form value on the host (as
// `__formValue`, which tests read instead of FormData — asserting what the
// component pushed to its internals, not what a form polyfill does with it),
// tracks validity, and resolves the containing <form>.
function makeValidity(flags = {}) {
	const state = {
		valueMissing: false,
		typeMismatch: false,
		patternMismatch: false,
		tooLong: false,
		tooShort: false,
		rangeUnderflow: false,
		rangeOverflow: false,
		stepMismatch: false,
		badInput: false,
		customError: false,
		...flags,
	};
	state.valid = !Object.entries(state).some(([k, v]) => k !== "valid" && v);
	return state;
}

if (typeof window.HTMLElement.prototype.attachInternals !== "function") {
	window.HTMLElement.prototype.attachInternals = function attachInternals() {
		const host = this;
		const internals = {
			validity: makeValidity(),
			validationMessage: "",
			setFormValue(value) {
				host.__formValue = value;
			},
			setValidity(flags = {}, message = "", _anchor) {
				internals.validity = makeValidity(flags);
				internals.validationMessage = internals.validity.valid ? "" : message || "";
			},
			checkValidity() {
				return internals.validity.valid;
			},
			reportValidity() {
				return internals.validity.valid;
			},
		};
		Object.defineProperty(internals, "form", {
			get: () => (typeof host.closest === "function" ? host.closest("form") : null),
		});
		return internals;
	};
}

/** Create an element, apply properties, mount it, and wait for the first render. */
export async function mount(tag, props = {}) {
	const el = document.createElement(tag);
	Object.assign(el, props);
	document.body.appendChild(el);
	if (el.updateComplete) await el.updateComplete;
	return el;
}

/** Resolve once the element has finished its next render. */
export async function settled(el) {
	if (el.updateComplete) await el.updateComplete;
	return el;
}
