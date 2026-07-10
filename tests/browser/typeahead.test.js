// dj-typeahead, in a real browser: typing filters the options and opens the popup,
// choosing an option sets the value and emits change, form participation, and an axe pass.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/typeahead/dist/index.js";

const OPTIONS = [
	{ value: "apple", label: "Apple" },
	{ value: "apricot", label: "Apricot" },
	{ value: "banana", label: "Banana" },
];

describe("dj-typeahead", () => {
	afterEach(cleanup);

	it("typing filters options; choosing one sets the value", async () => {
		const el = await mount(make("dj-typeahead", { options: OPTIONS, label: "Fruit" }));
		await el.updateComplete;
		let changes = 0;
		el.addEventListener("change", () => changes++);

		el.focus();
		await sendKeys({ type: "ap" });
		await el.updateComplete;
		await settleFrames();

		const items = el.shadowRoot.querySelector("dj-list").shadowRoot.querySelectorAll('[part="item"]');
		assertEqual(items.length, 2, "the popup shows only options matching the query");
		items[0].click();
		await el.updateComplete;
		assertEqual(el.value, "apple", "choosing an option sets the value");
		assertEqual(changes, 1, "choosing emits one change");
	});

	it("participates in a form under its name", async () => {
		const form = make("form");
		const el = make("dj-typeahead", { name: "fruit", options: OPTIONS, label: "Fruit", value: "banana" });
		form.append(el);
		await mount(form);
		await el.updateComplete;
		assertEqual(new FormData(form).get("fruit"), "banana", "FormData carries the value");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-typeahead", { options: OPTIONS, label: "Fruit" }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
