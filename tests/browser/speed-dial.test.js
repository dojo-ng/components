// dj-speed-dial, in a real browser: clicking the FAB toggles the actions open/closed and
// updates aria-expanded, and an axe pass while OPEN — the actions are what the closed state
// hides, so a closed audit proves nothing about them. The trigger is
// <dj-floating-action-button aria-label="Actions"> with an icon and no text, the exact shape
// CB9 (rich-text-value-button-name-spec.md Track A) fixed.
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/speed-dial/dist/index.js";
import "../../packages/floating-action-button/dist/index.js";

function buildSpeedDial() {
	const el = make("dj-speed-dial");
	const edit = make("dj-floating-action-button", { slot: "actions", size: "small", ariaLabel: "Edit" });
	edit.innerHTML = '<svg slot="icon" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path d="M4 20l4-1 10-10-3-3L5 16z" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
	const del = make("dj-floating-action-button", { slot: "actions", size: "small", ariaLabel: "Delete" });
	del.innerHTML = '<svg slot="icon" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" fill="none"/></svg>';
	el.append(edit, del);
	return el;
}

describe("dj-speed-dial", () => {
	afterEach(cleanup);

	it("clicking the trigger opens the actions and sets aria-expanded, closes on a second click", async () => {
		const el = await mount(buildSpeedDial());
		await el.updateComplete;
		const trigger = el.shadowRoot.querySelector("dj-floating-action-button");
		assertEqual(trigger.getAttribute("aria-expanded"), "false", "starts closed");
		assert(el.shadowRoot.querySelector(".actions").hasAttribute("hidden"), "actions are hidden while closed");

		const toggles = [];
		el.addEventListener("dj-toggle", (e) => toggles.push(e.detail.open));

		trigger.shadowRoot.querySelector('[part="base"]').click();
		await el.updateComplete;
		assertEqual(trigger.getAttribute("aria-expanded"), "true", "aria-expanded tracks the open state");
		assert(!el.shadowRoot.querySelector(".actions").hasAttribute("hidden"), "actions are revealed while open");

		trigger.shadowRoot.querySelector('[part="base"]').click();
		await el.updateComplete;
		assertEqual(trigger.getAttribute("aria-expanded"), "false", "clicking again closes");
		assert(el.shadowRoot.querySelector(".actions").hasAttribute("hidden"), "actions hide again on close");

		assertEqual(JSON.stringify(toggles), JSON.stringify([true, false]), "dj-toggle fires once per toggle, carrying the new open state");
	});

	it("has no serious or critical accessibility violations while open", async () => {
		const el = await mount(buildSpeedDial());
		await el.updateComplete;
		el.shadowRoot.querySelector("dj-floating-action-button").shadowRoot.querySelector('[part="base"]').click();
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
