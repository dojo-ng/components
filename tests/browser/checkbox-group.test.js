// dj-checkbox-group, in a real browser: clicking child checkboxes builds the value array
// and emits change, form participation carries one entry per checked value under `name`,
// and an axe pass.
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/checkbox-group/dist/index.js";

const OPTIONS = [
	{ value: "r", label: "Red" },
	{ value: "g", label: "Green" },
	{ value: "b", label: "Blue" },
];

describe("dj-checkbox-group", () => {
	afterEach(cleanup);

	it("clicking children updates the value array and emits change", async () => {
		const el = await mount(make("dj-checkbox-group", { options: OPTIONS, label: "Colors" }));
		await el.updateComplete;
		let changes = 0;
		el.addEventListener("change", () => changes++);

		const boxes = el.shadowRoot.querySelectorAll("dj-checkbox");
		assertEqual(boxes.length, 3, "one checkbox per option");
		boxes[0].shadowRoot.querySelector('[part="control"]').click();
		boxes[2].shadowRoot.querySelector('[part="control"]').click();
		await el.updateComplete;

		assert(el.value.includes("r") && el.value.includes("b"), "value should hold both checked values");
		assert(!el.value.includes("g"), "value should not hold the unchecked one");
		assertEqual(changes, 2, "each toggle emits one change");
	});

	it("submits one entry per checked value under its name", async () => {
		const form = make("form");
		const el = make("dj-checkbox-group", { name: "colors", options: OPTIONS, label: "Colors", value: ["r", "b"] });
		form.append(el);
		await mount(form);
		await el.updateComplete;
		const values = new FormData(form).getAll("colors");
		assertEqual(values.length, 2, "two entries for two checked values");
		assert(values.includes("r") && values.includes("b"), "FormData carries each checked value");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-checkbox-group", { options: OPTIONS, label: "Colors" }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
