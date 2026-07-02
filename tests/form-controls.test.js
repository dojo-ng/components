// Behavior smokes for the boolean form controls: checkbox, radio, switch.
// Covers checked reflection, the re-dispatched change event, and radio
// exclusivity within a shared name. Requires the happy-dom DOM (setup.js).
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/checkbox/dist/index.js";
import "../packages/radio/dist/index.js";
import "../packages/switch/dist/index.js";

// Fire the native <input>'s change the way a user click would, so the
// component's onChange handler runs.
function fireNativeChange(el, checked) {
	const input = el.renderRoot.querySelector("input");
	assert.ok(input, "expected a native <input> in the shadow root");
	input.checked = checked;
	input.dispatchEvent(new Event("change", { bubbles: true }));
}

test("checkbox reflects checked to an attribute", async () => {
	const el = await mount("dj-checkbox", { checked: true });
	assert.equal(el.hasAttribute("checked"), true);
	el.checked = false;
	await settled(el);
	assert.equal(el.hasAttribute("checked"), false);
});

test("checkbox re-dispatches change and tracks the native state", async () => {
	const el = await mount("dj-checkbox");
	let changes = 0;
	el.addEventListener("change", () => changes++);
	fireNativeChange(el, true);
	assert.equal(el.checked, true);
	assert.equal(changes, 1);
});

test("switch re-dispatches change and tracks the native state", async () => {
	const el = await mount("dj-switch");
	let changes = 0;
	el.addEventListener("change", () => changes++);
	fireNativeChange(el, true);
	assert.equal(el.checked, true);
	assert.equal(changes, 1);
});

test("radios sharing a name are mutually exclusive", async () => {
	const a = await mount("dj-radio", { name: "grp", value: "a" });
	const b = await mount("dj-radio", { name: "grp", value: "b" });
	// Check A.
	fireNativeChange(a, true);
	assert.equal(a.checked, true);
	// Checking B unchecks A.
	fireNativeChange(b, true);
	await settled(a);
	assert.equal(b.checked, true);
	assert.equal(a.checked, false, "checking one radio should uncheck the other");
});
