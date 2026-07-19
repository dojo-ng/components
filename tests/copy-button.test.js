// dj-copy-button (spec task CB): copies text via navigator.clipboard and flashes feedback.
// happy-dom has no real clipboard, so we stub navigator.clipboard: resolve -> success state
// + dj-copy + revert; reject -> error state + dj-error. `from` resolves value-bearing and
// text elements.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/copy-button/dist/index.js";

function stubClipboard(impl) {
	Object.defineProperty(navigator, "clipboard", { configurable: true, value: impl });
}
const tick = () => new Promise((r) => setTimeout(r, 0));
const djButton = (el) => el.renderRoot.querySelector("dj-button");

test("copies the literal value: success state + dj-copy + revert", async () => {
	let written;
	stubClipboard({ writeText: async (t) => { written = t; } });
	const el = await mount("dj-copy-button", { value: "hello", feedbackDuration: 20 });

	let copied;
	el.addEventListener("dj-copy", (e) => (copied = e.detail.value));
	djButton(el).click();
	await tick();
	await settled(el);

	assert.equal(written, "hello", "wrote the value to the clipboard");
	assert.equal(el.copyState, "success");
	assert.equal(copied, "hello", "dj-copy carries the copied value");
	assert.equal(djButton(el).getAttribute("label"), "Copied", "accessible name updates");

	await new Promise((r) => setTimeout(r, 40));
	await settled(el);
	assert.equal(el.copyState, "idle", "reverts after feedback-duration");
	assert.equal(djButton(el).getAttribute("label"), "Copy");
});

test("copies from a value-bearing element and a text element via `from`", async () => {
	stubClipboard({ writeText: async () => {} });

	const input = document.createElement("input");
	input.id = "src-input";
	input.value = "from-input";
	document.body.appendChild(input);
	const el = await mount("dj-copy-button", { from: "src-input" });
	let copied;
	el.addEventListener("dj-copy", (e) => (copied = e.detail.value));
	djButton(el).click();
	await tick();
	assert.equal(copied, "from-input", "reads the target's value");

	const span = document.createElement("span");
	span.id = "src-text";
	span.textContent = "from-text";
	document.body.appendChild(span);
	const el2 = await mount("dj-copy-button", { from: "src-text" });
	let copied2;
	el2.addEventListener("dj-copy", (e) => (copied2 = e.detail.value));
	djButton(el2).click();
	await tick();
	assert.equal(copied2, "from-text", "falls back to textContent");
});

test("value wins over from when both are set", async () => {
	stubClipboard({ writeText: async () => {} });
	const span = document.createElement("span");
	span.id = "both-src";
	span.textContent = "text-value";
	document.body.appendChild(span);
	const el = await mount("dj-copy-button", { value: "literal", from: "both-src" });
	let copied;
	el.addEventListener("dj-copy", (e) => (copied = e.detail.value));
	djButton(el).click();
	await tick();
	assert.equal(copied, "literal");
});

test("rejected / unavailable clipboard -> error state + dj-error", async () => {
	stubClipboard({ writeText: async () => { throw new Error("denied"); } });
	const el = await mount("dj-copy-button", { value: "x", feedbackDuration: 20 });
	let errored = 0;
	el.addEventListener("dj-error", () => errored++);
	djButton(el).click();
	await tick();
	await settled(el);
	assert.equal(el.copyState, "error");
	assert.equal(errored, 1);
	assert.equal(djButton(el).getAttribute("label"), "Copy failed");
});
