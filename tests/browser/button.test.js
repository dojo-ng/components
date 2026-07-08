// dj-button, in a real browser: click and keyboard activation, the :focus-visible
// distinction between keyboard and pointer focus (which happy-dom can't judge), and
// an axe pass.
import { sendKeys, sendMouse } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/button/dist/index.js";

describe("dj-button", () => {
	afterEach(cleanup);

	it("fires a click when the button is clicked", async () => {
		const btn = await mount(make("dj-button", {}, "Go"));
		let clicks = 0;
		btn.addEventListener("click", () => clicks++);
		btn.shadowRoot.querySelector('[part="base"]').click();
		assertEqual(clicks, 1, "click should fire once");
	});

	it("activates via the keyboard (Enter and Space)", async () => {
		const btn = await mount(make("dj-button", {}, "Go"));
		let clicks = 0;
		btn.addEventListener("click", () => clicks++);
		btn.focus();
		await sendKeys({ press: "Enter" });
		await sendKeys({ press: "Space" });
		assertEqual(clicks, 2, "Enter and Space should each activate the focused button");
	});

	it("shows :focus-visible on keyboard focus but not on pointer focus", async () => {
		const btn = await mount(make("dj-button", {}, "Go"));
		const base = btn.shadowRoot.querySelector('[part="base"]');

		// Keyboard: Tab should enter the shadow button and show the focus ring.
		await sendKeys({ press: "Tab" });
		if (btn.shadowRoot.activeElement === base) {
			assert(base.matches(":focus-visible"), "keyboard focus should match :focus-visible");
		} else {
			// WebKit/Safari don't move keyboard focus to buttons unless "Full Keyboard
			// Access" is on, so Tab never lands on the button here and the positive case
			// can't be exercised. The pointer-negative check below (the actual regression
			// guard) still runs on every engine; the WebKit keyboard ring is a manual check.
			console.warn("dj-button: this engine did not route keyboard focus to the button; skipping the positive :focus-visible assertion");
		}

		// Pointer: a mouse click should not leave the button in a :focus-visible state.
		base.blur();
		const r = base.getBoundingClientRect();
		await sendMouse({ type: "click", position: [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)] });
		assert(!base.matches(":focus-visible"), "pointer focus should not match :focus-visible");
	});

	it("has no serious or critical accessibility violations", async () => {
		const btn = await mount(make("dj-button", {}, "Save"));
		await assertNoViolations(btn);
	});
});
