// dj-chip, in a real browser: a closeable chip's close button emits dj-close; a clickable chip
// activates from the keyboard (Enter fires a click); plus axe.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/chip/dist/index.js";

describe("dj-chip", () => {
	afterEach(cleanup);

	it("a closeable chip emits dj-close from its close button", async () => {
		const el = await mount(make("dj-chip", { closeable: true }, "Tag"));
		await el.updateComplete;
		let closes = 0;
		el.addEventListener("dj-close", () => closes++);
		el.shadowRoot.querySelector('[part="close"]').click();
		assertEqual(closes, 1, "the close button emits one dj-close");
	});

	it("a clickable chip activates from the keyboard", async () => {
		const el = await mount(make("dj-chip", { clickable: true }, "Filter"));
		await el.updateComplete;
		let clicks = 0;
		el.addEventListener("click", () => clicks++);
		el.shadowRoot.querySelector('[part="action"]').focus();
		await sendKeys({ press: "Enter" });
		assert(clicks >= 1, "Enter on a clickable chip fires a click that bubbles from the host");
	});

	it("a closeable chip has no serious/critical a11y violations", async () => {
		const el = await mount(make("dj-chip", { closeable: true }, "Tag"));
		await el.updateComplete;
		await assertNoViolations(el);
	});

	it("a clickable chip has no serious/critical a11y violations", async () => {
		const el = await mount(make("dj-chip", { clickable: true }, "Filter"));
		await el.updateComplete;
		await assertNoViolations(el);
	});

	// The clickable + closeable combo: the body <button> and close <button> are siblings (not
	// nested), so this now passes axe (previously it tripped nested-interactive).
	it("a clickable + closeable chip has no serious/critical a11y violations", async () => {
		const el = await mount(make("dj-chip", { clickable: true, closeable: true }, "Filter"));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
