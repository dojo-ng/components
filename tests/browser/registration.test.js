// Registration sweep, in a real browser: importing each package's built entry must register
// its <dj-*> custom element (and each non-element package must import without throwing). The
// node:test smoke (tests/registration.test.js) does the same under happy-dom; this runs it in
// Chromium/Firefox/WebKit, where a package that fails to parse or resolve under real ESM (not
// just happy-dom) surfaces. Both share the list in ../element-packages.js.
import { ELEMENT_PACKAGES, SUPPORT_PACKAGES } from "../element-packages.js";

// A couple of bundler-targeted deps reference process.env.*; define a minimal shim so importing
// every package is safe on the unbundled test page. WTR isolates this file to its own page.
if (!globalThis.process) globalThis.process = { env: { NODE_ENV: "production" } };

describe("registration sweep (real browser)", () => {
	for (const pkg of ELEMENT_PACKAGES) {
		const tag = `dj-${pkg}`;
		it(`${pkg} registers <${tag}>`, async () => {
			await import(`../../packages/${pkg}/dist/index.js`);
			const ctor = customElements.get(tag);
			if (typeof ctor !== "function") throw new Error(`${tag} was not registered`);
		});
	}

	for (const pkg of SUPPORT_PACKAGES) {
		it(`${pkg} imports cleanly`, async () => {
			const mod = await import(`../../packages/${pkg}/dist/index.js`);
			if (!mod) throw new Error(`${pkg} produced no module namespace`);
		});
	}
});
