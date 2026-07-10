// dj-color-picker, in a real browser: the value string round-trips through the HSV model,
// keyboard operation of the 2D area thumb changes the color and emits dj-change, form
// participation submits the formatted string, and an axe pass.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/color-picker/dist/index.js";

describe("dj-color-picker", () => {
	afterEach(cleanup);

	it("the value string round-trips", async () => {
		const el = make("dj-color-picker", { label: "Color" });
		el.value = "#ff0000";
		await mount(el);
		await el.updateComplete;
		assertEqual(el.value, "#ff0000", "setting a hex value reads back the same hex");
	});

	it("keyboard on the area thumb changes the color and emits dj-change", async () => {
		const el = make("dj-color-picker", { label: "Color" });
		el.value = "#ff0000";
		await mount(el);
		await el.updateComplete;
		let events = 0;
		el.addEventListener("dj-change", () => events++);

		el.shadowRoot.querySelector("[part=thumb]").focus();
		await sendKeys({ press: "ArrowDown" }); // lowers brightness
		await el.updateComplete;
		assert(el.value !== "#ff0000", "moving the thumb changes the color");
		assertEqual(events, 1, "the change emits one dj-change");
	});

	it("submits the formatted color under its name", async () => {
		const form = make("form");
		const el = make("dj-color-picker", { name: "tint", label: "Color" });
		el.value = "#00ff00";
		form.append(el);
		await mount(form);
		await el.updateComplete;
		assertEqual(new FormData(form).get("tint"), "#00ff00", "FormData carries the formatted color");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-color-picker", { label: "Color", name: "tint" }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
