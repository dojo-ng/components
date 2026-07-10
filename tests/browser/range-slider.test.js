// dj-range-slider, in a real browser: keyboard operation of a thumb moves its bound, the
// value getter reports {min,max}, form participation submits two entries, and an axe pass.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/range-slider/dist/index.js";

describe("dj-range-slider", () => {
	afterEach(cleanup);

	it("ArrowRight on the min thumb raises value.min and emits change", async () => {
		const el = await mount(make("dj-range-slider", { label: "Range", min: 0, max: 10, step: 1, valueMin: 2, valueMax: 8 }));
		await el.updateComplete;
		let changes = 0;
		el.addEventListener("change", () => changes++);

		el.shadowRoot.querySelectorAll("input")[0].focus();
		await sendKeys({ press: "ArrowRight" });
		await el.updateComplete;
		assert(el.value.min > 2, `min bound should rise (got ${el.value.min})`);
		assert(el.value.max === 8, "max bound is unchanged");
		assert(changes >= 1, "moving a thumb emits change");
	});

	it("submits two entries (<name>_min, <name>_max)", async () => {
		const form = make("form");
		const el = make("dj-range-slider", { name: "price", label: "Price", min: 0, max: 100, valueMin: 20, valueMax: 80 });
		form.append(el);
		await mount(form);
		await el.updateComplete;
		const data = new FormData(form);
		assertEqual(data.get("price_min"), "20", "min bound submits under <name>_min");
		assertEqual(data.get("price_max"), "80", "max bound submits under <name>_max");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-range-slider", { label: "Range", name: "r", valueMin: 20, valueMax: 80 }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
