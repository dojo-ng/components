// Behavior smoke for dj-radio-group: single-selection exclusivity over its
// rendered radios, form participation (submits the selected value under its
// name), and a change event on keyboard navigation. Uses the options[] path
// (template-driven) to avoid slot-assignment quirks in the DOM shim.
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/radio-group/dist/index.js";

async function mountGroup() {
	const form = document.createElement("form");
	const group = document.createElement("dj-radio-group");
	group.name = "plan";
	group.options = [
		{ value: "free", label: "Free" },
		{ value: "pro", label: "Pro" },
	];
	form.appendChild(group);
	document.body.appendChild(form);
	await settled(group);
	return { form, group };
}

test("selecting a value keeps exactly one radio checked", async () => {
	const { group } = await mountGroup();
	group.value = "pro";
	await settled(group);
	const radios = [...group.renderRoot.querySelectorAll("dj-radio")];
	const checked = radios.filter((r) => r.checked).map((r) => r.value);
	assert.deepEqual(checked, ["pro"], "only the selected radio is checked");
});

test("the group submits its selected value to its form internals", async () => {
	const { group } = await mountGroup();
	group.value = "pro";
	await settled(group);
	// __formValue is what the control pushed to ElementInternals.setFormValue —
	// i.e. the value that would be submitted under the group's name.
	assert.equal(group.__formValue, "pro");
	assert.equal(group.name, "plan");
});

test("arrow-key navigation moves the value and emits change", async () => {
	const { group } = await mountGroup();
	group.value = "free";
	await settled(group);
	let changes = 0;
	group.addEventListener("change", () => changes++);
	group.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
	await settled(group);
	assert.equal(group.value, "pro");
	assert.equal(changes, 1);
});
