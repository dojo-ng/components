// dj-rate, in a real browser: clicking a star sets the rating and emits change, clicking
// the same star clears it, form participation, and an axe pass.
import { mount, cleanup, make, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/rate/dist/index.js";

describe("dj-rate", () => {
	afterEach(cleanup);

	it("clicking a star sets the value; clicking it again clears it", async () => {
		const el = await mount(make("dj-rate", { max: 5 }));
		await el.updateComplete;
		let changes = 0;
		el.addEventListener("change", () => changes++);

		const stars = el.shadowRoot.querySelectorAll(".star");
		assertEqual(stars.length, 5, "one button per star");
		stars[2].click();
		await el.updateComplete;
		assertEqual(el.value, 3, "clicking the third star gives a rating of 3");
		stars[2].click();
		await el.updateComplete;
		assertEqual(el.value, 0, "clicking the same star again clears the rating");
		assertEqual(changes, 2, "each click emits one change");
	});

	it("participates in a form under its name", async () => {
		const form = make("form");
		const el = make("dj-rate", { name: "stars", value: 4 });
		form.append(el);
		await mount(form);
		await el.updateComplete;
		assertEqual(new FormData(form).get("stars"), "4", "FormData carries the rating as a string");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-rate", { name: "stars", value: 3 }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
