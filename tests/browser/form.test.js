// dj-form, in a real browser: it gathers values from its named children into a dj-submit
// payload, Enter in a field submits, and an axe pass. dj-form is a light-DOM layout
// wrapper, so it reads each named child's live `.value`.
import { mount, cleanup, make, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/form/dist/index.js";
import "../../packages/text-input/dist/index.js";

function buildForm() {
	const form = make("dj-form");
	const a = make("dj-text-input", { name: "first", value: "Ada", label: "First" });
	const b = make("dj-text-input", { name: "last", value: "Lovelace", label: "Last" });
	form.append(a, b);
	return { form, a, b };
}

describe("dj-form", () => {
	afterEach(cleanup);

	it("submit() gathers named children into a dj-submit payload", async () => {
		const { form } = buildForm();
		await mount(form);
		let payload;
		form.addEventListener("dj-submit", (e) => { payload = e.detail.data; });
		form.submit();
		assertEqual(payload.first, "Ada", "the first field's value is gathered");
		assertEqual(payload.last, "Lovelace", "the last field's value is gathered");
	});

	it("Enter in a field submits the form", async () => {
		const { form, a } = buildForm();
		await mount(form);
		let submits = 0;
		form.addEventListener("dj-submit", () => submits++);
		a.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
		assertEqual(submits, 1, "Enter from a field triggers one submit");
	});

	it("has no serious or critical accessibility violations", async () => {
		const { form } = buildForm();
		await mount(form);
		await assertNoViolations(form);
	});
});
