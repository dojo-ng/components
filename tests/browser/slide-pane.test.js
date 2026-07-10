// dj-slide-pane, in a real browser: opening moves focus into the pane, Escape and the
// underlay close it (emitting dj-close), and an axe pass. Real focus movement and the
// document-level Escape handler are browser-only.
import { sendKeys } from "@web/test-runner-commands";
import { deepActiveElement } from "../../packages/dojo-element/dist/index.js";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/slide-pane/dist/index.js";

function buildPane() {
	const pane = make("dj-slide-pane");
	pane.append(make("span", { slot: "title" }, "Filters"));
	pane.append(make("button", {}, "Apply"));
	return pane;
}

describe("dj-slide-pane", () => {
	afterEach(cleanup);

	it("opening moves focus into the pane", async () => {
		const pane = await mount(buildPane());
		pane.open = true;
		await pane.updateComplete;
		await settleFrames();
		assert(pane.contains(deepActiveElement()) || pane.shadowRoot.contains(deepActiveElement()), "focus moves into the open pane");
	});

	it("Escape closes the pane and emits dj-close", async () => {
		const pane = await mount(buildPane());
		pane.open = true;
		await pane.updateComplete;
		await settleFrames();

		let closes = 0;
		pane.addEventListener("dj-close", () => closes++);
		await sendKeys({ press: "Escape" });
		await pane.updateComplete;
		assert(pane.open === false, "Escape closes the pane");
		assertEqual(closes, 1, "closing emits one dj-close");
	});

	it("clicking the underlay closes the pane", async () => {
		const pane = await mount(buildPane());
		pane.open = true;
		await pane.updateComplete;
		await settleFrames();
		pane.shadowRoot.querySelector("[part=underlay]").click();
		await pane.updateComplete;
		assert(pane.open === false, "an underlay click closes the pane");
	});

	it("has no serious or critical accessibility violations", async () => {
		const pane = await mount(buildPane());
		pane.open = true;
		await pane.updateComplete;
		await settleFrames();
		await assertNoViolations(pane);
	});
});
