// dj-dropdown, in a real browser: the APG menu-button glue over dj-popup/dj-list — click and
// keyboard (ArrowDown, Escape) open and close it, aria-expanded tracks state on the trigger,
// choosing an item closes the menu and returns focus, and an axe pass while OPEN — a closed
// disclosure audits almost nothing, since the panel is where the violations live.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/dropdown/dist/index.js";
import "../../packages/list/dist/index.js";
import "../../packages/button/dist/index.js";

const OPTIONS = [
	{ value: "edit", label: "Edit" },
	{ value: "delete", label: "Delete" },
];

function buildDropdown() {
	const el = make("dj-dropdown");
	el.append(
		make("dj-button", { slot: "trigger", kind: "text" }, "Actions"),
		make("dj-list", { options: OPTIONS }),
	);
	return el;
}

describe("dj-dropdown", () => {
	afterEach(cleanup);

	it("clicking the trigger opens the menu and sets aria-expanded", async () => {
		const el = await mount(buildDropdown());
		await el.updateComplete;
		const trigger = el.querySelector('[slot="trigger"]');
		assertEqual(trigger.getAttribute("aria-expanded"), "false", "starts closed");

		trigger.shadowRoot.querySelector('[part="base"]').click();
		await el.updateComplete;
		await settleFrames();

		assert(el.open, "the dropdown reports open");
		assertEqual(trigger.getAttribute("aria-expanded"), "true", "aria-expanded tracks the open state");
	});

	it("ArrowDown on the trigger opens the menu", async () => {
		const el = await mount(buildDropdown());
		await el.updateComplete;
		const trigger = el.querySelector('[slot="trigger"]');
		trigger.focus();
		await sendKeys({ press: "ArrowDown" });
		await el.updateComplete;
		await settleFrames();

		assert(el.open, "ArrowDown opens the menu");
	});

	it("Escape closes the menu and returns focus to the trigger", async () => {
		const el = await mount(buildDropdown());
		await el.updateComplete;
		const trigger = el.querySelector('[slot="trigger"]');
		trigger.shadowRoot.querySelector('[part="base"]').click();
		await el.updateComplete;
		await settleFrames();
		assert(el.open, "opened first");

		await sendKeys({ press: "Escape" });
		await el.updateComplete;
		await settleFrames();

		assert(!el.open, "Escape closes the menu");
		assertEqual(document.activeElement, trigger, "focus returns to the trigger");
	});

	it("choosing an item closes the menu, emits change, and refocuses the trigger", async () => {
		const el = await mount(buildDropdown());
		await el.updateComplete;
		let changed;
		el.addEventListener("change", (e) => { changed = e.target.value; });
		const trigger = el.querySelector('[slot="trigger"]');
		trigger.shadowRoot.querySelector('[part="base"]').click();
		await el.updateComplete;
		await settleFrames();

		const list = el.querySelector("dj-list");
		const items = list.shadowRoot.querySelectorAll('[part="item"]');
		items[1].click();
		await el.updateComplete;
		await settleFrames();

		assert(!el.open, "choosing an item closes the menu");
		assertEqual(changed, "delete", "the change event carries the chosen value");
		assertEqual(document.activeElement, trigger, "focus returns to the trigger");
	});

	it("has no serious or critical accessibility violations while open", async () => {
		const el = await mount(buildDropdown());
		await el.updateComplete;
		const trigger = el.querySelector('[slot="trigger"]');
		trigger.shadowRoot.querySelector('[part="base"]').click();
		await el.updateComplete;
		await settleFrames();
		await assertNoViolations(el);
	});
});
