// dj-date-input, in a real browser: typing an ISO date updates the value and form entry,
// the trailing button opens the calendar popup, and an axe pass.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/date-input/dist/index.js";

describe("dj-date-input", () => {
	afterEach(cleanup);

	it("typing an ISO date updates the value and the form entry", async () => {
		const form = make("form");
		const el = make("dj-date-input", { name: "when", label: "When" });
		form.append(el);
		await mount(form);
		await el.updateComplete;

		el.shadowRoot.querySelector("dj-text-input").focus();
		await sendKeys({ type: "2026-07-10" });
		await el.updateComplete;
		assertEqual(el.value, "2026-07-10", "typed date updates .value");
		assertEqual(new FormData(form).get("when"), "2026-07-10", "FormData carries the date");
	});

	it("the trailing button opens the calendar popup", async () => {
		const el = await mount(make("dj-date-input", { label: "When" }));
		await el.updateComplete;
		el.shadowRoot.querySelector(".cal-btn").click();
		await el.updateComplete;
		await settleFrames();
		assert(el.shadowRoot.querySelector("dj-popup").open === true, "the calendar popup opens");
		assert(el.shadowRoot.querySelector("dj-calendar"), "the popup holds a calendar");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-date-input", { label: "When", name: "when" }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
