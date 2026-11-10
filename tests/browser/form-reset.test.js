// CB30, in a real browser: form reset returns every control to its default (the `value`
// attribute, exposed as `defaultValue`), dj-form only treats form controls as fields, resets
// native controls the native way, and clears the user-valid/user-invalid states; and a
// required radio group selected from the keyboard shows as valid.
import { mount, cleanup, make, assertEqual } from "./helpers.js";
import "../../packages/form/dist/index.js";
import "../../packages/text-input/dist/index.js";
import "../../packages/select/dist/index.js";
import "../../packages/list/dist/index.js";
import "../../packages/time-picker/dist/index.js";
import "../../packages/rate/dist/index.js";
import "../../packages/checkbox-group/dist/index.js";
import "../../packages/radio-group/dist/index.js";
import "../../packages/title-pane/dist/index.js";
import "../../packages/button/dist/index.js";

const OPTIONS = [
	{ value: "a", label: "Alpha" },
	{ value: "b", label: "Beta" },
];

/** Build an element from markup, so attributes (the defaults) are set as a page would. */
function html(markup) {
	const t = document.createElement("template");
	t.innerHTML = markup.trim();
	return t.content.firstElementChild;
}

async function settle(...els) {
	for (const el of els) await el.updateComplete;
}

describe("defaultValue and reset (CB30)", () => {
	afterEach(cleanup);

	it("defaultValue reads and writes the value attribute", async () => {
		const el = await mount(html(`<dj-text-input value="hi" label="X"></dj-text-input>`));
		assertEqual(el.defaultValue, "hi", "defaultValue is the attribute");
		el.value = "changed";
		assertEqual(el.defaultValue, "hi", "changing value does not change defaultValue");
		el.defaultValue = "new";
		assertEqual(el.getAttribute("value"), "new", "setting defaultValue sets the attribute");
		const bare = await mount(make("dj-text-input", { label: "Y" }));
		assertEqual(bare.defaultValue, "", "no attribute gives an empty default");
	});

	it("a native form reset returns each control to its value attribute", async () => {
		const form = document.createElement("form");
		const select = html(`<dj-select name="s" value="b" label="S"></dj-select>`);
		select.options = OPTIONS;
		const list = html(`<dj-list name="l" value="a"></dj-list>`);
		list.options = OPTIONS;
		const time = html(`<dj-time-picker name="t" value="09:30" label="T"></dj-time-picker>`);
		const rate = html(`<dj-rate name="r" value="3"></dj-rate>`);
		const group = html(`<dj-checkbox-group name="g" value='["a"]' label="G"></dj-checkbox-group>`);
		group.options = OPTIONS;
		const radios = html(`<dj-radio-group name="rg" value="a" label="RG"></dj-radio-group>`);
		radios.options = OPTIONS;
		form.append(select, list, time, rate, group, radios);
		await mount(form);
		await settle(select, list, time, rate, group, radios);

		select.value = "a";
		list.value = "b";
		time.value = "10:00";
		rate.value = 5;
		group.value = ["a", "b"];
		radios.value = "b";
		form.reset();
		await settle(select, list, time, rate, group, radios);

		assertEqual(select.value, "b", "dj-select resets to its value attribute");
		assertEqual(list.value, "a", "dj-list resets to its value attribute");
		assertEqual(time.value, "09:30", "dj-time-picker resets to its value attribute");
		assertEqual(rate.value, 3, "dj-rate resets to its value attribute");
		assertEqual(JSON.stringify(group.value), '["a"]', "dj-checkbox-group resets to its value attribute");
		assertEqual(radios.value, "a", "dj-radio-group resets to its value attribute");
	});
});

describe("dj-form fields, submit and reset (CB30)", () => {
	afterEach(cleanup);

	it("only form controls are fields: named title panes and buttons are left out", async () => {
		const form = html(`<dj-form>
			<dj-text-input name="first" value="Ada" label="First"></dj-text-input>
			<dj-title-pane name="pane" title="More"></dj-title-pane>
			<dj-button name="go">Go</dj-button>
			<button name="native-go" value="x">Go</button>
			<input type="submit" name="native-submit" value="y">
		</dj-form>`);
		await mount(form);
		let data;
		form.addEventListener("dj-submit", (e) => { data = e.detail.data; });
		assertEqual(form.submit(), true, "submits");
		assertEqual(JSON.stringify(Object.keys(data)), '["first"]', "only the text input is gathered");
	});

	it("native inputs submit like a native form: text always, checkbox only when checked", async () => {
		const form = html(`<dj-form>
			<input name="city" value="Oslo" aria-label="City">
			<input type="checkbox" name="news" value="yes" aria-label="News">
			<input type="checkbox" name="terms" value="ok" checked aria-label="Terms">
			<select name="tags" multiple aria-label="Tags"><option value="x" selected>X</option><option value="y" selected>Y</option><option value="z">Z</option></select>
		</dj-form>`);
		await mount(form);
		let data;
		form.addEventListener("dj-submit", (e) => { data = e.detail.data; });
		form.submit();
		assertEqual(data.city, "Oslo", "a native text input is submitted");
		assertEqual("news" in data, false, "an unchecked native checkbox is left out");
		assertEqual(data.terms, "ok", "a checked native checkbox submits its value");
		assertEqual(JSON.stringify(data.tags), '["x","y"]', "a multi-select submits every selected option");
	});

	it("reset() resets native controls the native way", async () => {
		const form = html(`<dj-form>
			<input name="city" value="Oslo" aria-label="City">
			<input type="checkbox" name="terms" value="ok" checked aria-label="Terms">
			<select name="size" aria-label="Size"><option value="s">S</option><option value="m" selected>M</option></select>
		</dj-form>`);
		await mount(form);
		const [city, terms, size] = form.querySelectorAll("input, select");
		city.value = "Bergen";
		terms.checked = false;
		size.value = "s";
		form.reset();
		assertEqual(city.value, "Oslo", "text input back to its default");
		assertEqual(terms.checked, true, "checkbox back to its default checked state");
		assertEqual(terms.value, "ok", "checkbox value is untouched");
		assertEqual(size.value, "m", "select back to its default option");
	});

	it("reset() returns dj controls to their defaults and clears user-invalid", async () => {
		const form = html(`<dj-form>
			<dj-text-input name="name" label="Name" required></dj-text-input>
			<dj-select name="s" value="b" label="S"></dj-select>
		</dj-form>`);
		const [name, select] = form.children;
		select.options = OPTIONS;
		await mount(form);
		await settle(name, select);
		assertEqual(form.submit(), false, "the empty required field blocks submit");
		await settle(name);
		assertEqual(name.hasAttribute("data-dj-user-invalid"), true, "failed submit marks user-invalid");
		select.value = "a";
		form.reset();
		await settle(name, select);
		assertEqual(name.hasAttribute("data-dj-user-invalid"), false, "reset clears user-invalid");
		assertEqual(select.value, "b", "dj-select back to its value attribute");
	});
});

describe("dj-radio-group keyboard validity (CB30)", () => {
	afterEach(cleanup);

	it("selecting with an arrow key marks a required group valid", async () => {
		const group = make("dj-radio-group", { label: "Size", required: true, options: OPTIONS });
		await mount(group);
		await settle(group);
		const label = () => group.shadowRoot.querySelector("dj-label");
		assertEqual(label().valid, undefined, "no valid state before a choice");
		group.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
		await settle(group);
		assertEqual(group.value, "a", "arrow key selects the first option");
		assertEqual(label().valid, true, "keyboard selection marks the group valid");
	});
});
