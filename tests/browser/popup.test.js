// dj-popup, in a real browser: real layout (opens anchored to the trigger's rect),
// live repositioning as the page scrolls, Escape-to-close, and an axe pass. None of
// this is exercisable under happy-dom, which has no layout.
import { sendKeys } from "@web/test-runner-commands";
import { cleanup, make, assert, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/popup/dist/index.js";

// A positioned anchor and a tall spacer so the document actually scrolls.
function setup() {
	const spacer = make("div");
	spacer.style.height = "3000px";
	const anchor = make("button", {}, "anchor");
	anchor.style.cssText = "position:absolute;top:400px;left:60px;width:90px;height:32px";
	const popup = make("dj-popup");
	const content = make("div", {}, "Popup content");
	content.style.cssText = "width:140px;height:70px";
	popup.append(content);
	document.body.append(spacer, anchor, popup);
	popup.anchor = anchor;
	return { anchor, popup };
}

describe("dj-popup", () => {
	afterEach(() => {
		window.scrollTo(0, 0);
		cleanup();
	});

	it("opens anchored to the trigger's rect", async () => {
		const { anchor, popup } = setup();
		popup.open = true;
		await popup.updateComplete;
		await settleFrames();

		const wrapper = popup.shadowRoot.querySelector('[part="wrapper"]');
		const wr = wrapper.getBoundingClientRect();
		const ar = anchor.getBoundingClientRect();
		// Default position is "below": the wrapper's top edge sits at the anchor's
		// bottom and its left edge aligns with the anchor's left.
		assert(Math.abs(wr.top - ar.bottom) <= 2, `wrapper top ${wr.top} should track anchor bottom ${ar.bottom}`);
		assert(Math.abs(wr.left - ar.left) <= 2, `wrapper left ${wr.left} should track anchor left ${ar.left}`);
	});

	it("repositions as the page scrolls", async () => {
		const { popup } = setup();
		popup.open = true;
		await popup.updateComplete;
		await settleFrames();

		const wrapper = popup.shadowRoot.querySelector('[part="wrapper"]');
		const before = wrapper.getBoundingClientRect().top;
		window.scrollTo(0, 250);
		await settleFrames();
		const after = wrapper.getBoundingClientRect().top;
		// The anchor moved up with the scroll, so the popup should follow it up.
		assert(after < before - 100, `wrapper should follow the anchor upward (before ${before}, after ${after})`);
	});

	it("closes on Escape and emits dj-close", async () => {
		const { popup } = setup();
		popup.open = true;
		await popup.updateComplete;
		await settleFrames();

		let closes = 0;
		popup.addEventListener("dj-close", () => closes++);
		await sendKeys({ press: "Escape" });
		await popup.updateComplete;
		assert(popup.open === false, "Escape should close the popup");
		assert(closes === 1, "closing should emit exactly one dj-close");
	});

	it("has no serious or critical accessibility violations while open", async () => {
		const { popup } = setup();
		popup.open = true;
		await popup.updateComplete;
		await settleFrames();
		await assertNoViolations(popup);
	});
});
