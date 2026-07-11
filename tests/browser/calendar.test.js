// dj-calendar, in a real browser: clicking a day selects it (setting an ISO value and emitting
// change), keyboard grid navigation selects with Enter, plus axe on a rendered month.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/calendar/dist/index.js";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe("dj-calendar", () => {
	afterEach(cleanup);

	it("clicking a day selects it and emits change", async () => {
		const el = await mount(make("dj-calendar", { value: "2026-07-15" }));
		await el.updateComplete;
		let changes = 0;
		el.addEventListener("change", () => changes++);

		const days = [...el.shadowRoot.querySelectorAll('button[role="gridcell"]')].filter((d) => !d.disabled);
		days[Math.floor(days.length / 2)].click();
		await el.updateComplete;
		assert(changes >= 1, "clicking a day emits change");
		assert(ISO.test(el.value), `the value is an ISO date (got ${el.value})`);
	});

	it("keyboard navigation in the grid selects with Enter", async () => {
		const el = await mount(make("dj-calendar", { value: "2026-07-15" }));
		await el.updateComplete;
		let changes = 0;
		el.addEventListener("change", () => changes++);

		// The focused day (tabindex 0) is the single tab stop; the grid handles keydown as it bubbles.
		el.shadowRoot.querySelector(".day--focused").focus();
		await sendKeys({ press: "ArrowRight" });
		await sendKeys({ press: "Enter" });
		await el.updateComplete;
		assert(changes >= 1, "Enter selects the focused day");
		assert(ISO.test(el.value), "the selection is an ISO date");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-calendar", { value: "2026-07-15" }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
