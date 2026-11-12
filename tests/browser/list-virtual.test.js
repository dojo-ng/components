// dj-list above its virtual threshold (VS1, virtual-list-select-spec.md): only the rows in view
// are in the DOM, while the keyboard, type-ahead, and aria-posinset/aria-setsize cover all of them.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/list/dist/index.js";

const N = 10000;
const many = (n = N) => Array.from({ length: n }, (_, i) => ({ value: `v${i}`, label: `Item ${i}` }));
const rendered = (el) => el.shadowRoot.querySelectorAll('[part="list"] > li');
const activeId = (el) => el.shadowRoot.querySelector('[part="list"]').getAttribute("aria-activedescendant");

async function settle(el) { await el.updateComplete; await settleFrames(); await el.updateComplete; }

describe("dj-list (virtual)", () => {
	afterEach(cleanup);

	it("renders a window of under 60 rows for 10,000 options", async () => {
		const el = await mount(make("dj-list", { options: many(), label: "Items" }));
		await settle(el);
		assert(el.virtual, "list should be virtual above the threshold");
		const count = rendered(el).length;
		assert(count > 0 && count < 60, `rendered rows should stay under 60, got ${count}`);
		const list = el.shadowRoot.querySelector('[part="list"]');
		assert(list.scrollHeight > N * 20, `scroll height should span every row, got ${list.scrollHeight}`);
	});

	it("stays plain DOM at or under the threshold", async () => {
		const el = await mount(make("dj-list", { options: many(200), label: "Items" }));
		await settle(el);
		assert(!el.virtual, "200 options is not virtual by default");
		assertEqual(rendered(el).length, 200, "every option rendered");
		el.virtualThreshold = 50;
		await settle(el);
		assert(el.virtual && rendered(el).length < 60, "lowering virtual-threshold switches to the window");
	});

	it("End activates and renders the last option; Home returns to the first", async () => {
		const el = await mount(make("dj-list", { options: many(), label: "Items" }));
		await settle(el);
		el.focus();
		await sendKeys({ press: "End" });
		await settle(el);
		assertEqual(activeId(el), `opt-${N - 1}`, "End activates the last option");
		const last = el.shadowRoot.getElementById(`opt-${N - 1}`);
		assert(last, "the last option is rendered");
		const list = el.shadowRoot.querySelector('[part="list"]');
		const lr = list.getBoundingClientRect(), r = last.getBoundingClientRect();
		assert(r.top >= lr.top - 1 && r.bottom <= lr.bottom + 1, "the last option is scrolled into view");
		assert(rendered(el).length < 60, "still windowed after End");
		await sendKeys({ press: "Home" });
		await settle(el);
		assertEqual(activeId(el), "opt-0", "Home activates the first option");
		assert(el.shadowRoot.getElementById("opt-0"), "the first option is rendered again");
	});

	it("rendered options carry aria-posinset and aria-setsize, dividers skipped", async () => {
		const options = many();
		options.splice(5, 0, { value: "", label: "", divider: true });
		const el = await mount(make("dj-list", { options, label: "Items" }));
		await settle(el);
		const opts = [...el.shadowRoot.querySelectorAll('[role="option"]')];
		assert(opts.length > 0, "options rendered");
		for (const o of opts) assertEqual(o.getAttribute("aria-setsize"), String(N), `setsize on ${o.id}`);
		assertEqual(el.shadowRoot.getElementById("opt-0").getAttribute("aria-posinset"), "1", "first option is 1");
		assertEqual(el.shadowRoot.getElementById("opt-6").getAttribute("aria-posinset"), "6", "row after the divider is option 6");
		el.focus();
		await sendKeys({ press: "End" });
		await settle(el);
		assertEqual(el.shadowRoot.getElementById(`opt-${N}`).getAttribute("aria-posinset"), String(N), "last option is N of N");
	});

	it("first-letter type-ahead lands on an unrendered option", async () => {
		const options = many();
		options[7000] = { value: "zebra", label: "Zebra" };
		const el = await mount(make("dj-list", { options, label: "Items" }));
		await settle(el);
		assert(!el.shadowRoot.getElementById("opt-7000"), "row 7000 starts unrendered");
		el.focus();
		await sendKeys({ press: "z" });
		await settle(el);
		assertEqual(activeId(el), "opt-7000", "z jumps to Zebra");
		assert(el.shadowRoot.getElementById("opt-7000"), "the jumped-to option is rendered");
		await sendKeys({ press: "Enter" });
		assertEqual(el.value, "zebra", "Enter selects it");
	});

	it("PageDown and PageUp move by a page across the window", async () => {
		const el = await mount(make("dj-list", { options: many(), label: "Items" }));
		await settle(el);
		el.focus();
		await sendKeys({ press: "ArrowDown" });
		for (let i = 0; i < 20; i++) await sendKeys({ press: "PageDown" });
		await settle(el);
		const after = Number(activeId(el).slice(4));
		assert(after > 60, `20 PageDowns should pass the first window, at ${after}`);
		assert(el.shadowRoot.getElementById(`opt-${after}`), "the active option is rendered");
		await sendKeys({ press: "PageUp" });
		await settle(el);
		assert(Number(activeId(el).slice(4)) < after, "PageUp moves back");
	});

	it("scrolling renders the rows in view and fires dj-scroll-end near the end", async () => {
		const el = await mount(make("dj-list", { options: many(), label: "Items" }));
		await settle(el);
		let ends = 0;
		el.addEventListener("dj-scroll-end", () => ends++);
		const list = el.shadowRoot.querySelector('[part="list"]');
		list.scrollTop = list.scrollHeight / 2;
		await settle(el);
		const ids = [...rendered(el)].map((li) => Number(li.id.slice(4)));
		assert(ids.some((i) => i > N / 2 - 50 && i < N / 2 + 50), "rows near the middle are rendered");
		assertEqual(ends, 0, "no scroll-end in the middle");
		list.scrollTop = list.scrollHeight;
		await settle(el);
		assertEqual(ends, 1, "scroll-end fires at the bottom");
		list.scrollTop = list.scrollHeight - 10;
		await settle(el);
		assertEqual(ends, 1, "only once for the same option count");
	});

	it("has no serious or critical accessibility violations while virtual", async () => {
		const el = await mount(make("dj-list", { options: many(), label: "Items", value: "v3" }));
		await settle(el);
		await assertNoViolations(el);
	});
});
