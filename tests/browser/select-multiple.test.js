// dj-select multiple (VS3, virtual-list-select-spec.md): toggling in the list, chips with remove
// buttons, Backspace, "+N" overflow, select-all, required, native form and dj-form submission,
// reset, and an axe pass open and closed.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/select/dist/index.js";
import "../../packages/form/dist/index.js";

const FRUIT = [
	{ value: "apple", label: "Apple" },
	{ value: "banana", label: "Banana" },
	{ value: "cherry", label: "Cherry" },
	{ value: "date", label: "Date", disabled: true },
	{ value: "elder", label: "Elderberry" },
];

async function settle(...els) {
	for (let i = 0; i < 3; i++) { for (const el of els) await el?.updateComplete; await settleFrames(); }
}
const trigger = (el) => el.shadowRoot.querySelector('[part="trigger"]');
const list = (el) => el.shadowRoot.querySelector("dj-list");
const items = (el) => [...list(el).shadowRoot.querySelectorAll('[part="item"]')];
const chips = (el) => [...el.shadowRoot.querySelectorAll('[part="chip"]')];

describe("dj-select multiple", () => {
	afterEach(cleanup);

	it("choosing toggles values, keeps the popup open, and shows checkmarks", async () => {
		const el = await mount(make("dj-select", { options: FRUIT, label: "Fruit", multiple: true }));
		await settle(el);
		let changes = 0;
		el.addEventListener("change", () => changes++);
		trigger(el).click();
		await settle(el, list(el));
		assert(el.open, "opens");
		items(el)[0].click();
		await settle(el, list(el));
		items(el)[2].click();
		await settle(el, list(el));
		assertEqual(JSON.stringify(el.value), '["apple","cherry"]', "value is an array of the chosen values");
		assertEqual(changes, 2, "a change per toggle");
		assert(el.open, "the popup stays open while choosing");
		assertEqual(items(el)[0].getAttribute("aria-selected"), "true", "chosen rows are selected");
		assertEqual(list(el).shadowRoot.querySelector('[role="listbox"]').getAttribute("aria-multiselectable"), "true", "listbox is multiselectable");
		await sendKeys({ press: "ArrowDown" }); // active is cherry (last chosen) -> date is disabled, skips to elder
		await sendKeys({ press: " " });
		await settle(el, list(el));
		assertEqual(JSON.stringify(el.value), '["apple","cherry","elder"]', "Space toggles from the keyboard");
		items(el)[0].click();
		await settle(el);
		assertEqual(JSON.stringify(el.value), '["cherry","elder"]', "choosing again removes it");
		assertEqual(chips(el).length, 2, "one chip per value");
	});

	it("removes values by chip button and by Backspace on the trigger", async () => {
		const el = await mount(make("dj-select", { options: FRUIT, label: "Fruit", multiple: true, value: ["apple", "banana", "cherry"] }));
		await settle(el);
		chips(el)[1].querySelector("button").click();
		await settle(el);
		assertEqual(JSON.stringify(el.value), '["apple","cherry"]', "the chip's button removes its value");
		assert(!el.open, "removing a chip does not open the popup");
		el.focus();
		await sendKeys({ press: "Backspace" });
		await settle(el);
		assertEqual(JSON.stringify(el.value), '["apple"]', "Backspace removes the last value");
		assertEqual(el.shadowRoot.activeElement, trigger(el), "focus stays on the trigger");
	});

	it("collapses chips that do not fit to +N and names every value", async () => {
		const many = Array.from({ length: 12 }, (_, i) => ({ value: `v${i}`, label: `A long option label ${i}` }));
		const el = make("dj-select", { options: many, label: "Tags", multiple: true, value: many.map((o) => o.value) });
		el.style.width = "320px";
		await mount(el);
		await settle(el);
		const more = el.shadowRoot.querySelector('[part="more"]');
		assert(more, "+N shows");
		const shown = chips(el).length;
		assert(shown >= 1 && shown < 12, `only the chips that fit show, got ${shown}`);
		assertEqual(more.textContent.trim(), `+${12 - shown}`, "+N counts the hidden values");
		const t = trigger(el);
		const tr = t.getBoundingClientRect();
		assert(tr.height < 60, `trigger stays one line, height ${tr.height}`);
		const name = t.getAttribute("aria-label");
		for (const o of many) assert(name.includes(o.label), `accessible name includes ${o.label}`);
	});

	it("select-all selects every enabled option, then none", async () => {
		const el = await mount(make("dj-select", { options: FRUIT, label: "Fruit", multiple: true, selectAll: true }));
		await settle(el);
		trigger(el).click();
		await settle(el, list(el));
		assertEqual(items(el)[0].textContent.trim(), "Select all", "select-all row is first");
		items(el)[0].click();
		await settle(el, list(el));
		assertEqual(JSON.stringify(el.value), '["apple","banana","cherry","elder"]', "every enabled option");
		assertEqual(items(el)[0].getAttribute("aria-selected"), "true", "select-all row shows checked");
		items(el)[1].click();
		await settle(el, list(el));
		assertEqual(items(el)[0].getAttribute("aria-selected"), "false", "unchecks once one is removed");
		items(el)[0].click();
		await settle(el, list(el));
		items(el)[0].click();
		await settle(el, list(el));
		assertEqual(JSON.stringify(el.value), "[]", "select-all again clears");
	});

	it("submits through a native form, honours required, and resets", async () => {
		const form = make("form");
		const el = make("dj-select", { name: "fruit", options: FRUIT, label: "Fruit", multiple: true, required: true });
		el.setAttribute("value", '["banana"]');
		form.append(el);
		await mount(form);
		await settle(el);
		assertEqual(JSON.stringify(el.value), '["banana"]', "value attribute as JSON");
		assertEqual(JSON.stringify(new FormData(form).getAll("fruit")), '["banana"]', "one form entry per value");
		el.value = ["apple", "cherry"];
		await settle(el);
		assertEqual(JSON.stringify(new FormData(form).getAll("fruit")), '["apple","cherry"]', "entries follow value");
		el.value = [];
		await settle(el);
		assert(!el.checkValidity(), "required means at least one");
		form.reset();
		await settle(el);
		assertEqual(JSON.stringify(el.value), '["banana"]', "reset returns to the value attribute");
		assert(el.checkValidity(), "valid again after reset");
	});

	it("dj-form gives the array under the name, and reset() restores it", async () => {
		const form = make("dj-form");
		const el = make("dj-select", { name: "fruit", options: FRUIT, label: "Fruit", multiple: true });
		el.setAttribute("value", '["apple"]');
		form.append(el);
		await mount(form);
		await settle(el);
		el.value = ["banana", "cherry"];
		await settle(el);
		let data;
		form.addEventListener("dj-submit", (e) => { data = e.detail.data; });
		form.submit();
		assertEqual(JSON.stringify(data), '{"fruit":["banana","cherry"]}', "array under the name");
		form.reset();
		await settle(el);
		assertEqual(JSON.stringify(el.value), '["apple"]', "dj-form reset restores the default");
	});

	it("has no serious or critical accessibility violations, closed and open", async () => {
		const el = await mount(make("dj-select", { options: FRUIT, label: "Fruit", multiple: true, selectAll: true, value: ["apple", "cherry"] }));
		await settle(el);
		await assertNoViolations(el);
		trigger(el).click();
		await settle(el, list(el));
		await assertNoViolations(el);
	});
});
