// dj-trigger-popup, in a real browser: the trigger opens an anchored popup (emitting
// dj-open), Escape closes it, and an axe pass. Real anchoring/Escape live in the popup.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/trigger-popup/dist/index.js";

function buildTriggerPopup() {
	const el = make("dj-trigger-popup");
	el.append(make("button", {}, "Menu"));
	el.append(make("div", { slot: "content" }, "Panel body"));
	return el;
}

describe("dj-trigger-popup", () => {
	afterEach(cleanup);

	it("clicking the trigger opens the popup and emits dj-open", async () => {
		const el = await mount(buildTriggerPopup());
		await el.updateComplete;
		let opens = 0;
		el.addEventListener("dj-open", () => opens++);
		el.querySelector("button").click();
		await el.updateComplete;
		await settleFrames();
		assert(el.open === true, "clicking the trigger opens the popup");
		assertEqual(opens, 1, "opening emits one dj-open");
		assert(el.shadowRoot.querySelector("dj-popup").open === true, "the inner popup is open");
	});

	it("Escape closes the popup", async () => {
		const el = await mount(buildTriggerPopup());
		await el.updateComplete;
		el.querySelector("button").click();
		await el.updateComplete;
		await settleFrames();
		await sendKeys({ press: "Escape" });
		await el.updateComplete;
		assert(el.open === false, "Escape closes the popup");
	});

	it("has no serious or critical accessibility violations while open", async () => {
		const el = await mount(buildTriggerPopup());
		el.open = true;
		await el.updateComplete;
		await settleFrames();
		await assertNoViolations(el);
	});
});
