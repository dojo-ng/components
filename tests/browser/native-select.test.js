// dj-native-select, in a real browser: changing the wrapped native <select> updates the
// value and emits change, form participation, required validity, and an axe pass.
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/native-select/dist/index.js";

const OPTIONS = [
	{ value: "us", label: "United States" },
	{ value: "ca", label: "Canada" },
];

describe("dj-native-select", () => {
	afterEach(cleanup);

	it("changing the native select updates value and emits change", async () => {
		const el = await mount(make("dj-native-select", { options: OPTIONS, label: "Country" }));
		await el.updateComplete;
		let changes = 0;
		el.addEventListener("change", () => changes++);

		const native = el.shadowRoot.querySelector("select");
		native.value = "ca";
		native.dispatchEvent(new Event("change", { bubbles: true }));
		await el.updateComplete;
		assertEqual(el.value, "ca", "value follows the native select");
		assertEqual(changes, 1, "one change per user selection");
	});

	it("participates in a form; required with no value blocks submit", async () => {
		const form = make("form");
		const el = make("dj-native-select", { name: "country", options: OPTIONS, label: "Country", required: true });
		form.append(el);
		await mount(form);
		await el.updateComplete;

		let submitted = 0;
		form.addEventListener("submit", (e) => { e.preventDefault(); submitted++; });
		form.requestSubmit();
		assert(submitted === 0, "an empty required select blocks submit");

		el.value = "us";
		await el.updateComplete;
		assertEqual(new FormData(form).get("country"), "us", "FormData carries the value");
		form.requestSubmit();
		assertEqual(submitted, 1, "submit proceeds once a value is set");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-native-select", { options: OPTIONS, label: "Country", value: "us" }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
