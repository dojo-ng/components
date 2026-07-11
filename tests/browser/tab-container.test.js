// dj-tab-container, in a real browser: clicking a tab activates it (and shows the matching
// slotted panel under real layout), arrow keys move the active tab, plus axe.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/tab-container/dist/index.js";

function build() {
	const el = make("dj-tab-container", { tabs: [{ name: "One" }, { name: "Two" }, { name: "Three" }] });
	el.append(make("div", {}, "Panel one"), make("div", {}, "Panel two"), make("div", {}, "Panel three"));
	return el;
}

describe("dj-tab-container", () => {
	afterEach(cleanup);

	it("clicking a tab activates it and emits change", async () => {
		const el = await mount(build());
		await el.updateComplete;
		let detail;
		el.addEventListener("change", (e) => { detail = e.detail; });

		const tabs = el.shadowRoot.querySelectorAll('[part="tab"]');
		assertEqual(tabs.length, 3, "one tab per item");
		tabs[1].click();
		await el.updateComplete;
		assertEqual(el.activeIndex, 1, "clicking the second tab makes it active");
		assertEqual(detail, 1, "change carries the active index");
	});

	it("arrow keys move the active tab", async () => {
		const el = await mount(build());
		await el.updateComplete;
		el.shadowRoot.querySelector('[part="tab"]').focus();
		await sendKeys({ press: "ArrowRight" });
		await el.updateComplete;
		assert(el.activeIndex >= 1, `ArrowRight moves to a later tab (got ${el.activeIndex})`);
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(build());
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
