// Element-registration smoke: importing each package's built entry must register
// its <dj-*> custom element. Catches a package whose index.ts forgot to call
// `define()`, a broken build (missing dist), or a tag-name typo.
//
// The package lists live in ./element-packages.js so this node:test smoke and the
// real-browser sweep (tests/browser/registration.test.js) stay in sync.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { ELEMENT_PACKAGES, SUPPORT_PACKAGES } from "./element-packages.js";

for (const pkg of ELEMENT_PACKAGES) {
	const tag = `dj-${pkg}`;
	test(`${pkg} registers <${tag}>`, async () => {
		await import(`../packages/${pkg}/dist/index.js`);
		const ctor = customElements.get(tag);
		assert.equal(typeof ctor, "function", `${tag} was not registered`);
	});
}

for (const pkg of SUPPORT_PACKAGES) {
	test(`${pkg} imports cleanly`, async () => {
		const mod = await import(`../packages/${pkg}/dist/index.js`);
		assert.ok(mod, `${pkg} produced no module namespace`);
	});
}
