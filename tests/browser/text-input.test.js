// dj-text-input, in a real browser: real typing, native form participation via
// ElementInternals (the Web Awesome survey case — the control must enumerate in
// form.elements and carry its entry in FormData), required-validity blocking submit,
// and an axe pass.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/text-input/dist/index.js";

describe("dj-text-input", () => {
	afterEach(cleanup);

	it("typing updates the value", async () => {
		const el = await mount(make("dj-text-input", { label: "Name" }));
		el.focus();
		await sendKeys({ type: "hello" });
		assertEqual(el.value, "hello", "typed characters should update .value");
	});

	it("participates in a form: enumerates in form.elements and FormData carries its entry", async () => {
		const form = make("form");
		const el = make("dj-text-input", { name: "email", value: "a@b.com", label: "Email" });
		form.append(el);
		await mount(form);
		await el.updateComplete;

		assert(form.elements.namedItem("email") === el, "control should enumerate in form.elements by name");
		const data = new FormData(form);
		assertEqual(data.get("email"), "a@b.com", "FormData should carry the control's value");
	});

	it("a required empty field blocks submission and stops blocking once filled", async () => {
		const form = make("form");
		const el = make("dj-text-input", { name: "req", required: true, label: "Required" });
		form.append(el);
		await mount(form);
		await el.updateComplete;

		let submitted = 0;
		form.addEventListener("submit", (e) => { e.preventDefault(); submitted++; });

		form.requestSubmit();
		assert(submitted === 0, "submit should be blocked while the required field is empty");
		assert(!el.checkValidity(), "checkValidity should be false when required and empty");

		el.value = "filled";
		await el.updateComplete;
		form.requestSubmit();
		assertEqual(submitted, 1, "submit should proceed once the required field is filled");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-text-input", { label: "Email", name: "email" }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
