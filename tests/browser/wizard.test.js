// dj-wizard, in a real browser: when clickable, clicking a step emits dj-step with its index;
// plus axe on a rendered step list.
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/wizard/dist/index.js";

const STEPS = [{ label: "Account" }, { label: "Profile" }, { label: "Done" }];

describe("dj-wizard", () => {
	afterEach(cleanup);

	it("clicking a step emits dj-step when clickable", async () => {
		const el = await mount(make("dj-wizard", { steps: STEPS, activeStep: 0, clickable: true }));
		await el.updateComplete;
		let detail;
		el.addEventListener("dj-step", (e) => { detail = e.detail; });

		const steps = el.shadowRoot.querySelectorAll('[part="step"]');
		assertEqual(steps.length, 3, "one element per step");
		steps[1].click();
		await el.updateComplete;
		assert(detail && detail.index === 1, "dj-step carries the clicked step index");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-wizard", { steps: STEPS, activeStep: 1 }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
