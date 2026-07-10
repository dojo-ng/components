// dj-snackbar, in a real browser: `open` controls real visibility, the bar is an ARIA
// status live region, and an axe pass. This is a presentational component, so the checks
// are render + visibility + a11y.
import { mount, cleanup, make, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/snackbar/dist/index.js";

describe("dj-snackbar", () => {
	afterEach(cleanup);

	it("`open` toggles real visibility", async () => {
		const el = await mount(make("dj-snackbar", {}, "Saved"));
		await el.updateComplete;
		assertEqual(getComputedStyle(el).display, "none", "a closed snackbar is not displayed");
		el.open = true;
		await el.updateComplete;
		assertEqual(getComputedStyle(el).display, "block", "an open snackbar is displayed");
	});

	it("announces as a polite status live region", async () => {
		const el = await mount(make("dj-snackbar", { open: true }, "Saved"));
		await el.updateComplete;
		const bar = el.shadowRoot.querySelector(".bar");
		assertEqual(bar.getAttribute("role"), "status", "the bar is a status region");
		assertEqual(bar.getAttribute("aria-live"), "polite", "it announces politely");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-snackbar", { open: true }, "Saved"));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
