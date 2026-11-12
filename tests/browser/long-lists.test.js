// dj-select and dj-typeahead with 10,000 options (VS2, virtual-list-select-spec.md): the popup
// list is virtual, sized to its viewport, and opens with the selected option in view.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import "../../packages/select/dist/index.js";
import "../../packages/typeahead/dist/index.js";
import "../../packages/chip-typeahead/dist/index.js";
import { assertNoViolations } from "./a11y.js";

const N = 10000;
const many = () => Array.from({ length: N }, (_, i) => ({ value: `v${i}`, label: `Option ${i}` }));

async function settle(...els) {
	for (let i = 0; i < 3; i++) { for (const el of els) await el?.updateComplete; await settleFrames(); }
}

/** The option element for `value` is rendered and lies inside the list's visible box. */
function assertInView(list, value) {
	const li = list.shadowRoot.querySelector(`[part="item"][data-key="${value}"]`);
	assert(li, `${value} is rendered`);
	const box = list.shadowRoot.querySelector('[part="list"]').getBoundingClientRect();
	const r = li.getBoundingClientRect();
	assert(box.height > 0 && box.height < window.innerHeight, `list has a bounded height, got ${box.height}`);
	assert(r.top >= box.top - 1 && r.bottom <= box.bottom + 1, `${value} is inside the list viewport (${r.top}-${r.bottom} vs ${box.top}-${box.bottom})`);
}

describe("long lists in select and typeahead", () => {
	afterEach(cleanup);

	it("dj-select opens with the selected option in view and active", async () => {
		const el = await mount(make("dj-select", { options: many(), label: "Pick", value: "v8123" }));
		await settle(el);
		el.shadowRoot.querySelector('[part="trigger"]').click();
		const list = el.shadowRoot.querySelector("dj-list");
		await settle(el, list);
		assert(list.virtual, "the popup list is virtual");
		assert(list.shadowRoot.querySelectorAll('[part="list"] > li').length < 60, "windowed");
		assertInView(list, "v8123");
		assertEqual(list.shadowRoot.querySelector('[part="list"]').getAttribute("aria-activedescendant"), "opt-8123", "selected option is active");
		await sendKeys({ press: "ArrowDown" });
		await sendKeys({ press: "Enter" });
		await settle(el);
		assertEqual(el.value, "v8124", "ArrowDown from the selected option, then Enter");
	});

	it("dj-select reopens on a new selection far down the list", async () => {
		const el = await mount(make("dj-select", { options: many(), label: "Pick" }));
		await settle(el);
		el.value = "v9990";
		await settle(el);
		el.shadowRoot.querySelector('[part="trigger"]').click();
		const list = el.shadowRoot.querySelector("dj-list");
		await settle(el, list);
		assertInView(list, "v9990");
	});

	it("dj-typeahead opens with the selected option in view", async () => {
		const el = await mount(make("dj-typeahead", { options: many(), label: "Pick", value: "v5000" }));
		await settle(el);
		el.focus();
		const list = el.shadowRoot.querySelector("dj-list");
		await settle(el, list);
		assert(list.virtual, "the popup list is virtual");
		assertInView(list, "v5000");
	});

	it("dj-typeahead filters 10,000 options as the user types", async () => {
		const el = await mount(make("dj-typeahead", { options: many(), label: "Pick" }));
		await settle(el);
		el.focus();
		await sendKeys({ type: "9999" });
		const list = el.shadowRoot.querySelector("dj-list");
		await settle(el, list);
		const keys = [...list.shadowRoot.querySelectorAll('[part="item"]')].map((li) => li.dataset.key);
		assertEqual(keys.join(","), "v9999", "only the matching option is left");
	});

	// VS5: the CB10/CB11 popup naming, re-audited with the popup open over a virtual list.
	it("typeahead and chip-typeahead pass axe with a 10,000-option popup open", async () => {
		const ta = await mount(make("dj-typeahead", { options: many(), label: "Pick", value: "v42" }));
		ta.focus();
		await settle(ta, ta.shadowRoot.querySelector("dj-list"));
		assert(ta.shadowRoot.querySelector("dj-popup").open, "typeahead popup is open");
		assertEqual(ta.shadowRoot.querySelector("dj-text-input").getAttribute("aria-controls"), ta.shadowRoot.querySelector("dj-list").id, "aria-controls names the list");
		await assertNoViolations(ta);
		cleanup();
		const chips = await mount(make("dj-chip-typeahead", { options: many(), label: "Tags", value: ["v1"] }));
		chips.focus();
		await settle(chips, chips.shadowRoot.querySelector("dj-list"));
		assert(chips.shadowRoot.querySelector("dj-popup").open, "chip-typeahead popup is open");
		const input = chips.shadowRoot.querySelector(".input");
		const list = chips.shadowRoot.querySelector("dj-list");
		assertEqual(input.getAttribute("aria-controls"), list.id, "aria-controls names the list");
		assert(list.getAttribute("label"), "the list has a name");
		await assertNoViolations(chips);
	});
});
