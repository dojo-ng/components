// The dj-text-input subclasses, in a real browser. The base's typing/form/validity are
// covered by text-input.test.js; here we test only the overridden behavior of each
// subclass, plus one axe check apiece.
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/number-input/dist/index.js";
import "../../packages/email-input/dist/index.js";
import "../../packages/password-input/dist/index.js";
import "../../packages/constrained-input/dist/index.js";

describe("dj-number-input", () => {
	afterEach(cleanup);

	it('defaults to type="number" and exposes valueAsNumber', async () => {
		const el = await mount(make("dj-number-input", { label: "Qty", value: "42" }));
		await el.updateComplete;
		assertEqual(el.type, "number", "type defaults to number");
		assertEqual(el.shadowRoot.querySelector("input").type, "number", "the native input is a number field");
		assertEqual(el.valueAsNumber, 42, "valueAsNumber parses the value");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-number-input", { label: "Qty", name: "qty" }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});

describe("dj-email-input", () => {
	afterEach(cleanup);

	it('is type="email" and fails validity on a malformed address', async () => {
		const el = await mount(make("dj-email-input", { label: "Email", value: "not-an-email" }));
		await el.updateComplete;
		assertEqual(el.type, "email", "type defaults to email");
		assert(!el.checkValidity(), "a malformed address should be invalid (typeMismatch)");
		el.value = "a@b.com";
		await el.updateComplete;
		assert(el.checkValidity(), "a well-formed address should be valid");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-email-input", { label: "Email", name: "email" }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});

describe("dj-password-input", () => {
	afterEach(cleanup);

	it("the trailing toggle reveals and re-hides the value", async () => {
		const el = await mount(make("dj-password-input", { label: "Password", value: "secret" }));
		await el.updateComplete;
		assertEqual(el.type, "password", "starts masked");
		const toggle = el.shadowRoot.querySelector(".pw-toggle");
		assert(toggle, "a reveal toggle is rendered");
		toggle.click();
		await el.updateComplete;
		assertEqual(el.type, "text", "toggling reveals the value");
		toggle.click();
		await el.updateComplete;
		assertEqual(el.type, "password", "toggling again re-hides it");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-password-input", { label: "Password", name: "pw" }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});

describe("dj-constrained-input", () => {
	afterEach(cleanup);

	it("a custom validator drives form validity", async () => {
		const el = make("dj-constrained-input", { label: "Code" });
		el.validator = (v) => (v === "OK" ? undefined : "must be OK");
		await mount(el);
		el.value = "bad";
		await el.updateComplete;
		assert(!el.checkValidity(), "a value the validator rejects is invalid");
		el.value = "OK";
		await el.updateComplete;
		assert(el.checkValidity(), "a value the validator accepts is valid");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-constrained-input", { label: "Code", name: "code" }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
