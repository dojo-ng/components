// dj-time-picker, in a real browser: typing a time updates the value and opens the option
// popup, choosing an option sets the value and emits change, form participation, axe pass.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/time-picker/dist/index.js";

describe("dj-time-picker", () => {
	afterEach(cleanup);

	it("typing a time updates the value and opens the option list", async () => {
		const el = await mount(make("dj-time-picker", { label: "Time" }));
		await el.updateComplete;
		el.shadowRoot.querySelector("dj-text-input").focus();
		await sendKeys({ type: "09:30" });
		await el.updateComplete;
		await settleFrames();
		assertEqual(el.value, "09:30", "typed time updates .value");
		assert(el.shadowRoot.querySelector("dj-popup").open === true, "typing opens the option popup");
	});

	it("choosing an option sets the value and emits change", async () => {
		const el = await mount(make("dj-time-picker", { label: "Time" }));
		await el.updateComplete;
		let changes = 0;
		el.addEventListener("change", () => changes++);

		el.shadowRoot.querySelector("dj-text-input").focus();
		await sendKeys({ type: "0" });
		await el.updateComplete;
		await settleFrames();
		const item = el.shadowRoot.querySelector("dj-list").shadowRoot.querySelector('[part="item"]');
		item.click();
		await el.updateComplete;
		assertEqual(el.value, "00:00", "choosing the first option sets that value");
		assertEqual(changes, 1, "choosing emits one change");
		assert(el.shadowRoot.querySelector("dj-popup").open === false, "choosing closes the popup");
	});

	it("participates in a form under its name", async () => {
		const form = make("form");
		const el = make("dj-time-picker", { name: "at", label: "At", value: "08:00" });
		form.append(el);
		await mount(form);
		await el.updateComplete;
		assertEqual(new FormData(form).get("at"), "08:00", "FormData carries the time");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-time-picker", { label: "Time", name: "t" }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
