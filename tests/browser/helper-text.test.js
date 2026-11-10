// CB20: helper and error text are exposed to assistive tech. The text is no longer
// aria-hidden, and each form control points its native control's aria-describedby at the
// dj-helper-text in the same shadow root, only when there is text to read.
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/helper-text/dist/index.js";
import "../../packages/text-input/dist/index.js";
import "../../packages/text-area/dist/index.js";
import "../../packages/native-select/dist/index.js";
import "../../packages/select/dist/index.js";

const cases = [
	["dj-text-input", "input"],
	["dj-text-area", "textarea"],
	["dj-native-select", "select"],
	["dj-select", "button"],
];

/** The text an IDREF list resolves to, read through each target's shadow root. */
function describedText(control) {
	const ids = control.getAttribute("aria-describedby");
	if (!ids) return "";
	const root = control.getRootNode();
	return ids
		.split(/\s+/)
		.map((id) => {
			const target = root.getElementById(id);
			assert(target, `aria-describedby target #${id} should be in the same root`);
			const inner = target.shadowRoot?.querySelector("[part~='text']");
			assert(!inner?.closest("[aria-hidden='true']"), "helper text must not be aria-hidden");
			return (inner ?? target).textContent.trim();
		})
		.join(" ");
}

describe("helper text accessibility (CB20)", () => {
	afterEach(cleanup);

	it("dj-helper-text does not hide its text", async () => {
		const el = await mount(make("dj-helper-text", { text: "Hint" }));
		await el.updateComplete;
		const p = el.shadowRoot.querySelector("[part~='text']");
		assertEqual(p.hasAttribute("aria-hidden"), false, "text should be readable");
	});

	for (const [tag, native] of cases) {
		it(`${tag} describes its control with the helper text`, async () => {
			const el = await mount(make(tag, { label: "Field", helperText: "We never share it" }));
			await el.updateComplete;
			const control = el.renderRoot.querySelector(native);
			assertEqual(describedText(control), "We never share it");
			await assertNoViolations(el);
		});

		it(`${tag} sets no aria-describedby without helper text`, async () => {
			const el = await mount(make(tag, { label: "Field" }));
			await el.updateComplete;
			const control = el.renderRoot.querySelector(native);
			assertEqual(control.hasAttribute("aria-describedby"), false);
		});
	}

	it("dj-text-input describes its control with the error message when invalid", async () => {
		const el = await mount(make("dj-text-input", { label: "Email", helperText: "Work address", required: true }));
		await el.updateComplete;
		el.renderRoot.querySelector("input").dispatchEvent(new Event("blur"));
		await el.updateComplete;
		const control = el.renderRoot.querySelector("input");
		assertEqual(control.getAttribute("aria-invalid"), "true");
		assertEqual(describedText(control), el.validationMessage);
		assert(el.validationMessage, "expected a validation message");
	});

	it("dj-select marks its trigger invalid", async () => {
		const el = await mount(make("dj-select", { label: "Pick", helperText: "Required" }));
		el.valid = false;
		await el.updateComplete;
		assertEqual(el.renderRoot.querySelector("button").getAttribute("aria-invalid"), "true");
	});
});
