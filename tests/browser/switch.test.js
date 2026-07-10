// dj-switch, in a real browser: keyboard toggle (Space on the role="switch" input),
// clicking the track toggles, form participation, and an axe pass.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/switch/dist/index.js";

describe("dj-switch", () => {
	afterEach(cleanup);

	it("toggles with Space when focused and emits change", async () => {
		const el = await mount(make("dj-switch", {}, "Wi-Fi"));
		let changes = 0;
		el.addEventListener("change", () => changes++);
		el.focus();
		await sendKeys({ press: "Space" });
		assert(el.checked === true, "Space should turn the switch on");
		assertEqual(changes, 1, "toggling should emit one change");
	});

	it("clicking the track toggles the switch", async () => {
		const el = await mount(make("dj-switch", {}, "Wi-Fi"));
		el.shadowRoot.querySelector('[part="control"]').click();
		assert(el.checked === true, "clicking the track should turn it on");
	});

	it("participates in a form: value carried only while on", async () => {
		const form = make("form");
		const el = make("dj-switch", { name: "notify", value: "on" }, "Notify");
		form.append(el);
		await mount(form);
		await el.updateComplete;

		assertEqual(new FormData(form).get("notify"), null, "an off switch submits nothing");
		el.checked = true;
		await el.updateComplete;
		assertEqual(new FormData(form).get("notify"), "on", "an on switch submits its value");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-switch", { name: "s" }, "Dark mode"));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
