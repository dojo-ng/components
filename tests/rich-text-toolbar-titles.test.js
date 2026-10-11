// CB12: the default toolbar renderer gives every item hover text. It used to set only
// `aria-label`, so icon buttons (Bold, Italic, and any plugin item without its own `render`) had
// no tooltip at all. The title has to land on the native <button> inside dj-button's shadow root,
// which is what the browser hovers, and not on the host, which would put a second `title` on an
// element with no role.
import { mount } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/rich-text/dist/index.js";

const settle = async (el) => {
	await el.updateComplete;
	for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
	await el.updateComplete;
};

const toolbarButtons = (el) => [...el.querySelectorAll(".dj-rt-toolbar dj-button")];

test("every default toolbar item shows its label as hover text on the native button", async () => {
	const el = await mount("dj-rich-text", { label: "Body" });
	await settle(el);
	const buttons = toolbarButtons(el);
	assert.ok(buttons.length > 0, "the default toolbar rendered");
	for (const b of buttons) {
		await b.updateComplete;
		const label = b.getAttribute("aria-label");
		const native = b.shadowRoot.querySelector("button");
		assert.ok(label, "each default item is named");
		assert.equal(native.getAttribute("title"), label, `${label}: the native button carries the label as its title`);
		assert.equal(native.getAttribute("aria-label"), label, `${label}: the accessible name is still the label`);
		assert.equal(b.hasAttribute("title"), false, `${label}: no title on the role-less host`);
	}
});

test("a plugin item without its own render gets the same hover text", async () => {
	const plugin = { name: "titled", toolbar: [{ id: "x", label: "Do the thing", icon: "X", run: () => {} }] };
	const el = await mount("dj-rich-text", { label: "Body", plugins: [plugin] });
	await settle(el);
	const b = toolbarButtons(el).find((x) => x.getAttribute("aria-label") === "Do the thing");
	assert.ok(b, "the plugin item rendered");
	await b.updateComplete;
	assert.equal(b.shadowRoot.querySelector("button").getAttribute("title"), "Do the thing");
});
