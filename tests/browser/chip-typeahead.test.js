// dj-chip-typeahead, in a real browser: choosing options adds removable chips and builds
// the value array, Backspace on an empty input removes the last chip, form participation
// carries one entry per value, and an axe pass.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/chip-typeahead/dist/index.js";

const OPTIONS = [
	{ value: "red", label: "Red" },
	{ value: "green", label: "Green" },
	{ value: "blue", label: "Blue" },
];

describe("dj-chip-typeahead", () => {
	afterEach(cleanup);

	it("choosing options adds chips and builds the value array", async () => {
		const el = await mount(make("dj-chip-typeahead", { options: OPTIONS, label: "Colors" }));
		await el.updateComplete;
		let changes = 0;
		el.addEventListener("change", () => changes++);

		el.focus();
		await settleFrames();
		// Open the popup and pick the first available option, twice.
		el.shadowRoot.querySelector("dj-list").shadowRoot.querySelector('[part="item"]').click();
		await el.updateComplete;
		el.shadowRoot.querySelector("dj-list").shadowRoot.querySelector('[part="item"]').click();
		await el.updateComplete;

		assertEqual(el.value.length, 2, "two selections produce two values");
		assertEqual(el.shadowRoot.querySelectorAll("dj-chip").length, 2, "each value renders a chip");
		assertEqual(changes, 2, "each add emits one change");
	});

	it("Backspace on an empty input removes the last chip", async () => {
		const el = await mount(make("dj-chip-typeahead", { options: OPTIONS, label: "Colors", value: ["red", "blue"] }));
		await el.updateComplete;
		el.focus();
		await sendKeys({ press: "Backspace" });
		await el.updateComplete;
		assertEqual(el.value.length, 1, "Backspace removes the last chip");
		assertEqual(el.value[0], "red", "the earlier chip remains");
	});

	it("submits one entry per value under its name", async () => {
		const form = make("form");
		const el = make("dj-chip-typeahead", { name: "colors", options: OPTIONS, label: "Colors", value: ["red", "green"] });
		form.append(el);
		await mount(form);
		await el.updateComplete;
		const values = new FormData(form).getAll("colors");
		assertEqual(values.length, 2, "two entries for two values");
		assert(values.includes("red") && values.includes("green"), "FormData carries each value");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-chip-typeahead", { options: OPTIONS, label: "Colors", value: ["red"] }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
