// dj-snackbar, in a real browser: `open` controls real visibility, the live regions exist
// before the message arrives (CB33), and an axe pass. This is a presentational component, so the checks
// are render + visibility + a11y.
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/snackbar/dist/index.js";

describe("dj-snackbar", () => {
	afterEach(cleanup);

	it("`open` toggles real visibility", async () => {
		const el = await mount(make("dj-snackbar", {}, "Saved"));
		await el.updateComplete;
		const bar = el.shadowRoot.querySelector(".bar");
		assertEqual(getComputedStyle(bar).display, "none", "a closed snackbar shows no bar");
		el.open = true;
		await el.updateComplete;
		assertEqual(getComputedStyle(bar).display, "flex", "an open snackbar shows its bar");
	});

	const wait = (ms) => new Promise((r) => setTimeout(r, ms));

	it("keeps its live regions rendered while closed, then writes the message into the polite one", async () => {
		const el = await mount(make("dj-snackbar", {}, "Saved"));
		await el.updateComplete;
		const status = el.shadowRoot.querySelector('[role="status"]');
		const alert = el.shadowRoot.querySelector('[role="alert"]');
		assert(status && alert, "both live regions exist before opening");
		assertEqual(getComputedStyle(status).display, "block", "the status region is not display:none while closed");
		assertEqual(status.getAttribute("aria-live"), "polite", "status is polite");
		assertEqual(status.textContent, "", "nothing announced while closed");
		el.open = true;
		await el.updateComplete;
		await wait(120);
		assertEqual(status.textContent, "Saved", "the message lands in the polite region");
		assertEqual(alert.textContent, "", "the assertive region stays empty");
		el.open = false;
		await el.updateComplete;
		assertEqual(status.textContent, "", "closing clears the region");
	});

	it("announces an error assertively", async () => {
		const el = await mount(make("dj-snackbar", { type: "error" }, "Save failed"));
		await el.updateComplete;
		el.open = true;
		await el.updateComplete;
		await wait(120);
		assertEqual(el.shadowRoot.querySelector('[role="alert"]').textContent, "Save failed", "error goes to role=alert");
		assertEqual(el.shadowRoot.querySelector('[role="status"]').textContent, "", "not to the polite region");
	});

	it("the success fill meets 4.5:1 against its text", async () => {
		const el = await mount(make("dj-snackbar", { type: "success", open: true }, "Saved"));
		await el.updateComplete;
		const cs = getComputedStyle(el.shadowRoot.querySelector(".bar"));
		const lum = (c) => {
			const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => {
				v /= 255;
				return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
			});
			return 0.2126 * r + 0.7152 * g + 0.0722 * b;
		};
		const [hi, lo] = [lum(cs.color), lum(cs.backgroundColor)].sort((x, y) => y - x);
		const ratio = (hi + 0.05) / (lo + 0.05);
		assert(ratio >= 4.5, `success contrast ${ratio.toFixed(2)}:1 should be at least 4.5:1`);
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-snackbar", { open: true }, "Saved"));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
