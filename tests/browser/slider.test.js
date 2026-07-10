// dj-slider, in a real browser: keyboard operation of the native range input moves the
// value and emits change, form participation carries the value, and an axe pass.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/slider/dist/index.js";

describe("dj-slider", () => {
	afterEach(cleanup);

	it("ArrowRight increases the value and emits change", async () => {
		const el = await mount(make("dj-slider", { label: "Volume", min: 0, max: 10, step: 1, value: 3 }));
		await el.updateComplete;
		let changes = 0;
		el.addEventListener("change", () => changes++);

		el.shadowRoot.querySelector('[part="input"]').focus();
		await sendKeys({ press: "ArrowRight" });
		await el.updateComplete;
		assert(el.value > 3, `ArrowRight should raise the value (got ${el.value})`);
		assert(changes >= 1, "keyboard commit should emit change");
	});

	it("participates in a form under its name", async () => {
		const form = make("form");
		const el = make("dj-slider", { name: "vol", label: "Volume", min: 0, max: 10, value: 7 });
		form.append(el);
		await mount(form);
		await el.updateComplete;
		assertEqual(new FormData(form).get("vol"), "7", "FormData carries the value as a string");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-slider", { label: "Volume", name: "vol", value: 5 }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
