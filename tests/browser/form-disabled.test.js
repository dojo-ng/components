// CB34, in a real browser: turning a form control's own `disabled` on and then off must
// re-enable its inner control. The browser calls formDisabledCallback while Lit reflects the
// `disabled` attribute mid-update, so the write used to be dropped and the inner control
// stayed disabled. happy-dom never calls formDisabledCallback, so this needs a real engine.
import { mount, cleanup, make, assertEqual, settleFrames } from "./helpers.js";
import "../../packages/select/dist/index.js";
import "../../packages/text-input/dist/index.js";
import "../../packages/checkbox/dist/index.js";
import "../../packages/radio-group/dist/index.js";
import "../../packages/radio/dist/index.js";

const OPTIONS = [{ value: "a", label: "A" }, { value: "b", label: "B" }];

async function toggle(el, value) {
	el.disabled = value;
	await el.updateComplete;
	await settleFrames();
	await el.updateComplete;
}

describe("form control disabled toggle (CB34)", () => {
	afterEach(cleanup);

	const cases = [
		["dj-select", { options: OPTIONS, label: "Pick" }, '[part="trigger"]'],
		["dj-text-input", { label: "Name" }, "input"],
		["dj-checkbox", {}, "input"],
	];
	for (const [tag, props, inner] of cases) {
		it(`${tag}: disabled true then false re-enables the inner control`, async () => {
			const el = await mount(make(tag, props));
			const control = () => el.shadowRoot.querySelector(inner);
			await toggle(el, true);
			assertEqual(el.hasAttribute("disabled"), true, "host reflects disabled");
			assertEqual(control().disabled, true, "inner control disabled");
			await toggle(el, false);
			assertEqual(el.hasAttribute("disabled"), false, "host no longer disabled");
			assertEqual(el.isDisabled, false, "isDisabled is false");
			assertEqual(control().disabled, false, "inner control enabled again");
		});
	}

	it("dj-radio-group re-enables slotted radios it disabled, but not ones disabled by the page", async () => {
		const group = make("dj-radio-group", { label: "Size" });
		const a = make("dj-radio", { value: "a" }, "A");
		const b = make("dj-radio", { value: "b", disabled: true }, "B");
		group.append(a, b);
		await mount(group);
		await toggle(group, true);
		assertEqual(a.disabled, true, "group disable reaches radio a");
		await toggle(group, false);
		assertEqual(a.disabled, false, "radio a is enabled again");
		assertEqual(b.disabled, true, "radio b keeps its own disabled");
	});

	it("a disabled fieldset still disables and re-enables the control", async () => {
		const fieldset = make("fieldset");
		const el = make("dj-text-input", { label: "Name" });
		fieldset.append(el);
		await mount(fieldset);
		fieldset.disabled = true;
		await settleFrames();
		await el.updateComplete;
		assertEqual(el.shadowRoot.querySelector("input").disabled, true, "fieldset disable reaches the input");
		fieldset.disabled = false;
		await settleFrames();
		await el.updateComplete;
		assertEqual(el.shadowRoot.querySelector("input").disabled, false, "fieldset enable reaches the input");
	});
});
