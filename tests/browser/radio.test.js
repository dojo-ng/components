// dj-radio + dj-radio-group, in a real browser: roving-arrow keyboard navigation that
// moves selection and focus, single-choice exclusivity, group-level form participation
// (the group is the one form-associated element), required validity, and an axe pass.
// The child dj-radio's own behavior is exercised through the group it's designed for.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/radio-group/dist/index.js";

const OPTIONS = [
	{ value: "s", label: "Small" },
	{ value: "m", label: "Medium" },
	{ value: "l", label: "Large" },
];

describe("dj-radio-group", () => {
	afterEach(cleanup);

	it("arrow keys move selection and focus (roving tabindex)", async () => {
		const el = await mount(make("dj-radio-group", { options: OPTIONS, label: "Size", value: "s" }));
		await el.updateComplete;
		let changes = 0;
		el.addEventListener("change", () => changes++);

		el.focus?.();
		el.shadowRoot.querySelector("dj-radio").focus();
		await sendKeys({ press: "ArrowDown" });
		assertEqual(el.value, "m", "ArrowDown should move selection to the next radio");
		await sendKeys({ press: "ArrowDown" });
		assertEqual(el.value, "l", "ArrowDown should move to the next again");
		await sendKeys({ press: "ArrowDown" });
		assertEqual(el.value, "s", "ArrowDown should wrap to the first");
		assertEqual(changes, 3, "each arrow move should emit one change");
	});

	it("selection is exclusive: only one child radio is checked", async () => {
		const el = await mount(make("dj-radio-group", { options: OPTIONS, label: "Size", value: "m" }));
		await el.updateComplete;
		const checked = [...el.shadowRoot.querySelectorAll("dj-radio")].filter((r) => r.checked);
		assertEqual(checked.length, 1, "exactly one radio is checked");
		assertEqual(checked[0].value, "m", "the checked radio matches the group value");
	});

	it("clicking a child radio selects it (change reaches the group)", async () => {
		const el = await mount(make("dj-radio-group", { options: OPTIONS, label: "Size" }));
		await el.updateComplete;
		let changes = 0;
		el.addEventListener("change", () => changes++);
		el.shadowRoot.querySelectorAll("dj-radio")[2].shadowRoot.querySelector('[part="control"]').click();
		await el.updateComplete;
		assertEqual(el.value, "l", "clicking a radio sets the group value");
		assertEqual(changes, 1, "the selection emits one change");
	});

	it("participates in a form under its name", async () => {
		const form = make("form");
		const el = make("dj-radio-group", { name: "size", options: OPTIONS, label: "Size", value: "l" });
		form.append(el);
		await mount(form);
		await el.updateComplete;
		assertEqual(new FormData(form).get("size"), "l", "FormData carries the selected value");
	});

	it("a required group with no selection blocks submission", async () => {
		const form = make("form");
		const el = make("dj-radio-group", { name: "req", options: OPTIONS, label: "Pick", required: true });
		form.append(el);
		await mount(form);
		await el.updateComplete;

		let submitted = 0;
		form.addEventListener("submit", (e) => { e.preventDefault(); submitted++; });
		form.requestSubmit();
		assert(submitted === 0, "an empty required group blocks submit");
		el.value = "s";
		await el.updateComplete;
		form.requestSubmit();
		assertEqual(submitted, 1, "submit proceeds once a choice is made");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-radio-group", { options: OPTIONS, label: "Size", value: "s" }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
