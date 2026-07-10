// dj-checkbox, in a real browser: keyboard activation of the native checkbox (Space),
// clicking the styled control toggles, form participation via ElementInternals (the value
// is carried only while checked), required-validity blocking submit, and an axe pass.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/checkbox/dist/index.js";

describe("dj-checkbox", () => {
	afterEach(cleanup);

	it("toggles with Space when focused and emits change", async () => {
		const el = await mount(make("dj-checkbox", {}, "Accept"));
		let changes = 0;
		el.addEventListener("change", () => changes++);
		el.focus(); // focuses the native input
		await sendKeys({ press: "Space" });
		assert(el.checked === true, "Space should check the focused checkbox");
		await sendKeys({ press: "Space" });
		assert(el.checked === false, "Space should uncheck it again");
		assertEqual(changes, 2, "each toggle should emit one change");
	});

	it("clicking the styled control toggles the checkbox", async () => {
		const el = await mount(make("dj-checkbox", {}, "Accept"));
		el.shadowRoot.querySelector('[part="control"]').click();
		assert(el.checked === true, "clicking the control should check it");
	});

	it("participates in a form: value carried only while checked", async () => {
		const form = make("form");
		const el = make("dj-checkbox", { name: "agree", value: "yes" }, "Agree");
		form.append(el);
		await mount(form);
		await el.updateComplete;

		assert(form.elements.namedItem("agree") === el, "control should enumerate in form.elements");
		assertEqual(new FormData(form).get("agree"), null, "unchecked control should submit nothing");

		el.checked = true;
		await el.updateComplete;
		assertEqual(new FormData(form).get("agree"), "yes", "checked control should submit its value");
	});

	it("a required unchecked box blocks submission", async () => {
		const form = make("form");
		const el = make("dj-checkbox", { name: "req", required: true }, "Required");
		form.append(el);
		await mount(form);
		await el.updateComplete;

		let submitted = 0;
		form.addEventListener("submit", (e) => { e.preventDefault(); submitted++; });
		form.requestSubmit();
		assert(submitted === 0, "submit should be blocked while a required box is unchecked");
		assert(!el.checkValidity(), "checkValidity should be false when required and unchecked");

		el.checked = true;
		await el.updateComplete;
		form.requestSubmit();
		assertEqual(submitted, 1, "submit should proceed once checked");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-checkbox", { name: "a" }, "Subscribe"));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
