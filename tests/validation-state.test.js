// Validation-state styling hook (spec task VH): the FormControl mixin mirrors the
// control's current validity onto the host as data attributes so consumers can style
// invalid/valid states from outside the shadow root. Shoelace semantics, `dj-` names.
//
// dj-checkbox is the vehicle: its template renders cleanly under happy-dom and its
// required-validity path (required + unchecked -> valueMissing) is simple to drive.
// The mixin never calls setValidity itself — it reflects what the control reports.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/checkbox/dist/index.js";

test("data-dj-required reflects the control's required flag", async () => {
	const el = await mount("dj-checkbox", { required: true });
	assert.ok(el.hasAttribute("data-dj-required"), "required control gets data-dj-required");
	el.required = false;
	await settled(el);
	assert.ok(!el.hasAttribute("data-dj-required"), "clearing required removes it");
});

test("invalid control gets data-dj-invalid but not user-invalid before interaction", async () => {
	const el = await mount("dj-checkbox", { required: true }); // unchecked -> valueMissing
	assert.ok(el.hasAttribute("data-dj-invalid"), "invalid state reflected");
	assert.ok(!el.hasAttribute("data-dj-valid"), "not valid");
	assert.ok(!el.hasAttribute("data-dj-user-invalid"), "user-invalid waits for interaction");
});

test("blur after input flips user-invalid on", async () => {
	const el = await mount("dj-checkbox", { required: true });
	el.dispatchEvent(new Event("change")); // input happened
	el.dispatchEvent(new Event("focusout")); // blurred after input -> interacted
	assert.ok(el.hasAttribute("data-dj-user-invalid"), "user-invalid turns on after blur");
	assert.ok(!el.hasAttribute("data-dj-user-valid"));
});

test("fixing the value flips to valid and user-valid", async () => {
	const el = await mount("dj-checkbox", { required: true });
	el.dispatchEvent(new Event("change"));
	el.dispatchEvent(new Event("focusout"));
	assert.ok(el.hasAttribute("data-dj-user-invalid"));

	el.checked = true; // satisfies the required constraint
	await settled(el);
	assert.ok(el.hasAttribute("data-dj-valid"), "now valid");
	assert.ok(el.hasAttribute("data-dj-user-valid"), "and user-valid (still interacted)");
	assert.ok(!el.hasAttribute("data-dj-invalid"));
	assert.ok(!el.hasAttribute("data-dj-user-invalid"));
});

test("form submit marks interacted; form reset clears it", async () => {
	const form = document.createElement("form");
	const el = document.createElement("dj-checkbox");
	el.required = true;
	form.appendChild(el);
	document.body.appendChild(form);
	await el.updateComplete;

	assert.ok(el.hasAttribute("data-dj-invalid"));
	assert.ok(!el.hasAttribute("data-dj-user-invalid"), "no interaction yet");

	form.dispatchEvent(new Event("submit"));
	assert.ok(el.hasAttribute("data-dj-user-invalid"), "submit counts as interaction");

	form.dispatchEvent(new Event("reset"));
	assert.ok(!el.hasAttribute("data-dj-user-invalid"), "reset clears the interacted flag");
	assert.ok(el.hasAttribute("data-dj-invalid"), "but the field is still invalid");
});
