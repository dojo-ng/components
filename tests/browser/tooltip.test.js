// dj-tooltip, in a real browser: focus and hover reveal the tip and blur/leave hide it,
// `open` forces it shown, and an axe pass. Real focus/hover routing is browser-only.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/tooltip/dist/index.js";

function buildTooltip(props = {}) {
	const tip = make("dj-tooltip", props);
	tip.append(make("button", {}, "Help"));
	tip.append(make("span", { slot: "content" }, "Useful hint"));
	return tip;
}

describe("dj-tooltip", () => {
	afterEach(cleanup);

	it("focus shows the tip and blur hides it", async () => {
		const tip = await mount(buildTooltip());
		await tip.updateComplete;
		const content = tip.shadowRoot.querySelector("[part=content]");
		assert(content.hidden, "the tip starts hidden");

		tip.querySelector("button").focus();
		await tip.updateComplete;
		assert(!content.hidden, "focusing the trigger reveals the tip");

		tip.querySelector("button").blur();
		await tip.updateComplete;
		assert(content.hidden, "blurring hides the tip again");
	});

	// WCAG 1.4.13 (dismissible): Escape hides the tip without moving focus; focusing the trigger again shows it.
	it("Escape hides a tip shown by focus, focus stays, and refocusing shows it again", async () => {
		const tip = await mount(buildTooltip());
		await tip.updateComplete;
		const content = tip.shadowRoot.querySelector("[part=content]");
		const trigger = tip.querySelector("button");
		trigger.focus();
		await tip.updateComplete;
		assert(!content.hidden, "focus shows the tip");

		await sendKeys({ press: "Escape" });
		await tip.updateComplete;
		assert(content.hidden, "Escape hides it");
		assert(document.activeElement === trigger, "focus did not move");

		trigger.blur();
		trigger.focus();
		await tip.updateComplete;
		assert(!content.hidden, "focusing the trigger again shows it");
	});

	it("`open` forces the tip shown regardless of focus", async () => {
		const tip = await mount(buildTooltip({ open: true }));
		await tip.updateComplete;
		assert(!tip.shadowRoot.querySelector("[part=content]").hidden, "open keeps the tip visible");
	});

	it("has no serious or critical accessibility violations", async () => {
		const tip = await mount(buildTooltip({ open: true }));
		await tip.updateComplete;
		await assertNoViolations(tip);
	});
});
