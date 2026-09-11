// dj-button's accessible name, in a real browser. Originated as a six-shape MEASUREMENT for A1 of
// rich-text-value-button-name-spec.md, which selected F1 (forward aria-label/aria-pressed/
// aria-expanded to the native button, leave the host attribute in place). A3 trimmed this to the
// two cases that guard the shipped fix; the shape-patching simulations are gone because the
// component now performs that forwarding itself.
import { mount, cleanup, make, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/button/dist/index.js";

const ICON = '<svg slot="icon" viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">'
	+ '<path d="M5 12h14" stroke="currentColor" stroke-width="2" fill="none"/></svg>';

describe("dj-button: accessible name forwarding", () => {
	afterEach(cleanup);

	it("an icon-only button with a host aria-label has no serious or critical violations", async () => {
		const host = document.createElement("div");
		host.innerHTML = `<dj-button kind="text" aria-label="Bold">${ICON}</dj-button>`;
		const el = host.firstElementChild;
		await mount(host);
		await el.updateComplete;
		await assertNoViolations(el);
	});

	it("aria-pressed set on the host reaches the native button", async () => {
		const el = await mount(make("dj-button", { kind: "text", ariaLabel: "Bold" }));
		await el.updateComplete;
		el.ariaPressed = "true";
		await el.updateComplete;
		assertEqual(
			el.shadowRoot.querySelector('[part="base"]').getAttribute("aria-pressed"),
			"true",
			"aria-pressed should forward to the native button",
		);
	});
});
