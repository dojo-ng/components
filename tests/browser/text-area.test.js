// dj-text-area, in a real browser: real typing updates the value, native form
// participation, required-validity blocking submit, and an axe pass.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/text-area/dist/index.js";

describe("dj-text-area", () => {
	afterEach(cleanup);

	it("typing updates the value", async () => {
		const el = await mount(make("dj-text-area", { label: "Notes" }));
		el.focus();
		await sendKeys({ type: "hello" });
		assertEqual(el.value, "hello", "typed characters should update .value");
	});

	it("participates in a form and carries its entry", async () => {
		const form = make("form");
		const el = make("dj-text-area", { name: "bio", value: "hi there", label: "Bio" });
		form.append(el);
		await mount(form);
		await el.updateComplete;
		assert(form.elements.namedItem("bio") === el, "control should enumerate in form.elements");
		assertEqual(new FormData(form).get("bio"), "hi there", "FormData carries the value");
	});

	it("a required empty field blocks submission", async () => {
		const form = make("form");
		const el = make("dj-text-area", { name: "req", required: true, label: "Required" });
		form.append(el);
		await mount(form);
		await el.updateComplete;

		let submitted = 0;
		form.addEventListener("submit", (e) => { e.preventDefault(); submitted++; });
		form.requestSubmit();
		assert(submitted === 0, "submit blocked while required and empty");
		el.value = "filled";
		await el.updateComplete;
		form.requestSubmit();
		assertEqual(submitted, 1, "submit proceeds once filled");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-text-area", { label: "Notes", name: "notes" }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
