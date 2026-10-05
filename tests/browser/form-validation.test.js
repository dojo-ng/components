// Form validation across the controls, in a real browser. Each case here is a bug found while
// testing the Forms & validation guide (dojo-ng.com/docs/forms/) against the released packages:
// dj-form submitting invalid data, an unchecked checkbox, and Enter in a text area; a checkbox
// that a form reset left checked; setCustomValidity() that had no effect; a checkbox group whose
// value set from code never reached the form; empty validationMessage on several controls; and a
// text input that stayed unmarked after a failed submit.
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import "../../packages/form/dist/index.js";
import "../../packages/text-input/dist/index.js";
import "../../packages/text-area/dist/index.js";
import "../../packages/checkbox/dist/index.js";
import "../../packages/switch/dist/index.js";
import "../../packages/checkbox-group/dist/index.js";
import "../../packages/radio-group/dist/index.js";
import "../../packages/select/dist/index.js";
import "../../packages/native-select/dist/index.js";
import "../../packages/typeahead/dist/index.js";
import "../../packages/date-input/dist/index.js";

const OPTIONS = [
	{ value: "a", label: "Alpha" },
	{ value: "b", label: "Beta" },
];

async function settle(...els) {
	for (const el of els) await el.updateComplete;
}

describe("dj-form submit()", () => {
	afterEach(cleanup);

	it("does not emit dj-submit while a named control is invalid, and returns false", async () => {
		const form = make("dj-form");
		const name = make("dj-text-input", { name: "name", label: "Name", required: true });
		form.append(name);
		await mount(form);
		await settle(name);
		let submits = 0;
		form.addEventListener("dj-submit", () => submits++);
		assertEqual(form.submit(), false, "submit() reports the invalid form");
		assertEqual(submits, 0, "no dj-submit for an invalid form");
		assert(name.hasAttribute("data-dj-user-invalid"), "the invalid control is marked user-invalid");
		name.value = "Ada";
		await settle(name);
		assertEqual(form.submit(), true, "submit() succeeds once the control is valid");
		assertEqual(submits, 1, "one dj-submit for the valid form");
	});

	it("skips the check with novalidate", async () => {
		const form = make("dj-form", { noValidate: true });
		form.append(make("dj-text-input", { name: "name", label: "Name", required: true }));
		await mount(form);
		let submits = 0;
		form.addEventListener("dj-submit", () => submits++);
		form.submit();
		assertEqual(submits, 1, "novalidate submits without checking");
	});

	it("counts a checkbox or switch only when checked, and leaves out disabled controls", async () => {
		const form = make("dj-form");
		const box = make("dj-checkbox", { name: "terms" }, "Terms");
		const sw = make("dj-switch", { name: "news", checked: true }, "News");
		const off = make("dj-text-input", { name: "off", label: "Off", value: "x", disabled: true });
		form.append(box, sw, off);
		await mount(form);
		await settle(box, sw, off);
		let data;
		form.addEventListener("dj-submit", (e) => { data = e.detail.data; });
		form.submit();
		assert(!("terms" in data), "an unchecked checkbox is left out");
		assertEqual(data.news, "on", "a checked switch submits its value");
		assert(!("off" in data), "a disabled control is left out");
	});

	it("gives an array for a name used by several checked controls", async () => {
		const form = make("dj-form");
		const a = make("dj-checkbox", { name: "tag", value: "a", checked: true }, "A");
		const b = make("dj-checkbox", { name: "tag", value: "b", checked: true }, "B");
		form.append(a, b);
		await mount(form);
		await settle(a, b);
		let data;
		form.addEventListener("dj-submit", (e) => { data = e.detail.data; });
		form.submit();
		assert(Array.isArray(data.tag) && data.tag.join() === "a,b", "both values, in order");
	});

	it("does not submit on Enter in a text area", async () => {
		const form = make("dj-form");
		const area = make("dj-text-area", { name: "notes", label: "Notes" });
		form.append(area);
		await mount(form);
		await settle(area);
		let submits = 0;
		form.addEventListener("dj-submit", () => submits++);
		const inner = area.shadowRoot.querySelector("textarea");
		inner.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }));
		assertEqual(submits, 0, "Enter in a text area adds a line, it does not submit");
	});
});

describe("form reset", () => {
	afterEach(cleanup);

	it("returns a checkbox and a switch to their markup state", async () => {
		const form = make("form");
		form.innerHTML = `<dj-checkbox name="a">A</dj-checkbox><dj-checkbox name="b" checked>B</dj-checkbox><dj-switch name="c">C</dj-switch>`;
		await mount(form);
		const [a, b] = form.querySelectorAll("dj-checkbox");
		const c = form.querySelector("dj-switch");
		await settle(a, b, c);
		a.checked = true;
		b.checked = false;
		c.checked = true;
		await settle(a, b, c);
		form.reset();
		await settle(a, b, c);
		assertEqual(a.checked, false, "a box that started unchecked is unchecked again");
		assertEqual(b.checked, true, "a box that started checked is checked again");
		assertEqual(c.checked, false, "a switch that started off is off again");
	});
});

describe("text input validity", () => {
	afterEach(cleanup);

	it("setCustomValidity() makes the field invalid until it is cleared", async () => {
		const form = make("form");
		const el = make("dj-text-input", { name: "user", label: "User", value: "ada" });
		form.append(el);
		await mount(form);
		await settle(el);
		el.setCustomValidity("That name is taken.");
		assertEqual(el.validity.customError, true, "a custom error is set");
		assertEqual(el.validationMessage, "That name is taken.", "the custom message is the message");
		assertEqual(form.checkValidity(), false, "the form is invalid");
		el.value = "ada2";
		await settle(el);
		assertEqual(el.validity.customError, true, "the custom error stays when the value changes, as on a native input");
		el.setCustomValidity("");
		assertEqual(el.validity.valid, true, "an empty message clears it");
	});

	it("shows its error state after a failed submit, with no edit", async () => {
		const form = make("form");
		const el = make("dj-text-input", { name: "name", label: "Name", required: true });
		form.append(el);
		await mount(form);
		await settle(el);
		form.checkValidity();
		await settle(el);
		const input = el.shadowRoot.querySelector("input");
		assertEqual(input.getAttribute("aria-invalid"), "true", "the field is marked invalid");
		const helper = el.shadowRoot.querySelector("dj-helper-text");
		assert(helper.text && helper.text === el.validationMessage, "the message shows under the field");
	});
});

describe("dj-checkbox-group in a form", () => {
	afterEach(cleanup);

	it("submits a value set from code", async () => {
		const form = make("form");
		const el = make("dj-checkbox-group", { name: "tags", options: OPTIONS, label: "Tags" });
		form.append(el);
		await mount(form);
		await settle(el);
		el.value = ["a", "b"];
		await settle(el);
		assertEqual(new FormData(form).getAll("tags").join(), "a,b", "both values reach the form");
	});

	it("is invalid when required and nothing is checked", async () => {
		const form = make("form");
		const el = make("dj-checkbox-group", { name: "tags", options: OPTIONS, label: "Tags", required: true });
		form.append(el);
		await mount(form);
		await settle(el);
		assertEqual(el.validity.valueMissing, true, "required with nothing checked is invalid");
		assert(el.validationMessage, "there is a message");
		el.value = ["a"];
		await settle(el);
		assertEqual(el.validity.valid, true, "one checked option makes it valid");
	});
});

describe("validationMessage on every required control", () => {
	afterEach(cleanup);

	for (const tag of ["dj-select", "dj-native-select", "dj-radio-group", "dj-typeahead", "dj-date-input", "dj-checkbox"]) {
		it(`${tag} has a message while required and empty`, async () => {
			const form = make("form");
			const props = { name: "f", label: "Field", required: true };
			if (tag !== "dj-date-input" && tag !== "dj-checkbox") props.options = OPTIONS;
			const el = make(tag, props, tag === "dj-checkbox" ? "Agree" : undefined);
			form.append(el);
			await mount(form);
			await settle(el);
			assertEqual(el.validity.valid, false, "required and empty is invalid");
			assert(typeof el.validationMessage === "string" && el.validationMessage.length > 0, "validationMessage is not empty");
		});
	}
});
