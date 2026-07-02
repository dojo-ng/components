// Form-participation smokes (review task 2.4): formDisabledCallback makes an
// ancestor <fieldset>/<form> disable reach the control (via isDisabled), and
// formStateRestoreCallback restores value/checked on bfcache/autofill.
//
// happy-dom does not propagate <fieldset disabled> to a custom element's
// formDisabledCallback, so we invoke the callback directly — that's the exact
// hook the browser calls. The rendered-input assertion uses dj-checkbox (its
// template renders cleanly under happy-dom; dj-text-input has a known Lit/
// happy-dom desync, so we assert its state/restore, not its rendered input).
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/checkbox/dist/index.js";
import "../packages/text-input/dist/index.js";

test("formDisabledCallback disables the inner control and ORs with own disabled", async () => {
	const el = await mount("dj-checkbox");
	const input = () => el.renderRoot.querySelector("input");
	assert.equal(el.isDisabled, false);
	assert.equal(input().disabled, false);

	el.formDisabledCallback(true); // ancestor fieldset/form disabled
	await settled(el);
	assert.equal(el.isDisabled, true);
	assert.equal(input().disabled, true, "form disable reaches the native input");

	el.formDisabledCallback(false);
	await settled(el);
	assert.equal(input().disabled, false);

	// isDisabled is the OR: own disabled keeps it disabled even when the form re-enables.
	el.disabled = true;
	await settled(el);
	assert.equal(el.isDisabled, true);
	assert.equal(input().disabled, true);
});

test("text-input tracks formDisabled state", async () => {
	const el = await mount("dj-text-input");
	assert.equal(el.isDisabled, false);
	el.formDisabledCallback(true);
	assert.equal(el.isDisabled, true);
	el.formDisabledCallback(false);
	el.disabled = true;
	assert.equal(el.isDisabled, true, "own disabled still counts");
});

test("formStateRestoreCallback restores a text control's value and form value", async () => {
	const el = await mount("dj-text-input", { name: "email" });
	el.formStateRestoreCallback("hi@example.com", "restore");
	await settled(el);
	assert.equal(el.value, "hi@example.com", "value restored");
	assert.equal(el.__formValue, "hi@example.com", "form value restored via setFormValue");
});

test("checkbox restores checked (not value) from form state", async () => {
	const el = await mount("dj-checkbox", { value: "on" });
	assert.equal(el.checked, false);
	el.formStateRestoreCallback("on", "restore"); // non-null → it was checked
	await settled(el);
	assert.equal(el.checked, true);
	assert.equal(el.__formValue, "on", "checked control submits its value");

	el.formStateRestoreCallback(null, "restore"); // null → unchecked
	await settled(el);
	assert.equal(el.checked, false);
});
