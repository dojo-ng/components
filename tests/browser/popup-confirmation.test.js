// dj-popup-confirmation, in a real browser: the trigger opens the confirm popup, the two
// buttons resolve it (dj-confirm / dj-cancel) and close it, and an axe pass.
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/popup-confirmation/dist/index.js";

function buildConfirm() {
	const el = make("dj-popup-confirmation");
	el.append(make("button", {}, "Delete"));
	el.append(make("span", { slot: "content" }, "Delete this item?"));
	return el;
}

describe("dj-popup-confirmation", () => {
	afterEach(cleanup);

	it("clicking the trigger opens the confirm popup", async () => {
		const el = await mount(buildConfirm());
		await el.updateComplete;
		el.querySelector("button").click();
		await el.updateComplete;
		assert(el.open === true, "clicking the trigger opens the popup");
	});

	it("Confirm emits dj-confirm and closes", async () => {
		const el = await mount(buildConfirm());
		el.open = true;
		await el.updateComplete;
		await settleFrames();
		let confirms = 0;
		el.addEventListener("dj-confirm", () => confirms++);
		el.shadowRoot.querySelectorAll("dj-button")[1].click(); // Confirm is the second button
		await el.updateComplete;
		assertEqual(confirms, 1, "Confirm emits one dj-confirm");
		assert(el.open === false, "confirming closes the popup");
	});

	it("Cancel emits dj-cancel and closes", async () => {
		const el = await mount(buildConfirm());
		el.open = true;
		await el.updateComplete;
		await settleFrames();
		let cancels = 0;
		el.addEventListener("dj-cancel", () => cancels++);
		el.shadowRoot.querySelectorAll("dj-button")[0].click(); // Cancel is the first button
		await el.updateComplete;
		assertEqual(cancels, 1, "Cancel emits one dj-cancel");
		assert(el.open === false, "cancelling closes the popup");
	});

	it("has no serious or critical accessibility violations while open", async () => {
		const el = await mount(buildConfirm());
		el.open = true;
		await el.updateComplete;
		await settleFrames();
		await assertNoViolations(el);
	});
});
