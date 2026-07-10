// dj-select, in a real browser: the trigger opens a popup listbox, keyboard opens it,
// choosing an option sets the value, closes, and returns focus to the trigger, plus form
// participation, required validity, and an axe pass.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/select/dist/index.js";

const OPTIONS = [
	{ value: "us", label: "United States" },
	{ value: "ca", label: "Canada" },
	{ value: "mx", label: "Mexico" },
];

describe("dj-select", () => {
	afterEach(cleanup);

	it("opens on trigger click, selecting sets value and returns focus", async () => {
		const el = await mount(make("dj-select", { options: OPTIONS, label: "Country" }));
		await el.updateComplete;
		let changes = 0;
		el.addEventListener("change", () => changes++);

		const trigger = el.shadowRoot.querySelector('[part="trigger"]');
		trigger.click();
		await el.updateComplete;
		await settleFrames();
		assert(el.open === true, "clicking the trigger opens the listbox");

		const items = el.shadowRoot.querySelector("dj-list").shadowRoot.querySelectorAll('[part="item"]');
		assertEqual(items.length, 3, "one item per option");
		items[1].click();
		await el.updateComplete;
		assertEqual(el.value, "ca", "choosing an option sets the value");
		assert(el.open === false, "choosing closes the listbox");
		assertEqual(changes, 1, "choosing emits one change");
		assert(el.shadowRoot.activeElement === trigger, "focus returns to the trigger");
	});

	it("opens with ArrowDown from the trigger", async () => {
		const el = await mount(make("dj-select", { options: OPTIONS, label: "Country" }));
		await el.updateComplete;
		el.focus();
		await sendKeys({ press: "ArrowDown" });
		await el.updateComplete;
		assert(el.open === true, "ArrowDown on the trigger opens the listbox");
	});

	it("participates in a form; required with no value blocks submit", async () => {
		const form = make("form");
		const el = make("dj-select", { name: "country", options: OPTIONS, label: "Country", required: true });
		form.append(el);
		await mount(form);
		await el.updateComplete;

		let submitted = 0;
		form.addEventListener("submit", (e) => { e.preventDefault(); submitted++; });
		form.requestSubmit();
		assert(submitted === 0, "an empty required select blocks submit");

		el.value = "mx";
		await el.updateComplete;
		assertEqual(new FormData(form).get("country"), "mx", "FormData carries the selected value");
		form.requestSubmit();
		assertEqual(submitted, 1, "submit proceeds once a value is set");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-select", { options: OPTIONS, label: "Country", value: "us" }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
