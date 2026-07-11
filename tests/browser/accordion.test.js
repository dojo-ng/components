// dj-accordion + dj-title-pane, in a real browser: a title-pane's button toggles it (with the
// collapse actually showing/hiding under real layout) and emits dj-toggle; an exclusive
// accordion closes the other panes when one opens; plus axe.
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/accordion/dist/index.js";
import "../../packages/title-pane/dist/index.js";

describe("dj-title-pane", () => {
	afterEach(cleanup);

	it("the button toggles open and emits dj-toggle", async () => {
		const el = await mount(make("dj-title-pane", { name: "Details" }, "Body text"));
		await el.updateComplete;
		let toggles = 0;
		el.addEventListener("dj-toggle", (e) => { toggles++; el._lastOpen = e.detail.open; });

		assert(!el.open, "starts closed");
		el.shadowRoot.querySelector('[part="button"]').click();
		await el.updateComplete;
		assert(el.open, "clicking the button opens it");
		assertEqual(toggles, 1, "opening emits one dj-toggle");
		assertEqual(el._lastOpen, true, "dj-toggle reports the open state");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-title-pane", { name: "Details", open: true }, "Body text"));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});

describe("dj-accordion", () => {
	afterEach(cleanup);

	function build() {
		const acc = make("dj-accordion", { exclusive: true });
		const a = make("dj-title-pane", { name: "One" }, "First");
		const b = make("dj-title-pane", { name: "Two" }, "Second");
		acc.append(a, b);
		return { acc, a, b };
	}

	it("exclusive mode closes the other panes when one opens", async () => {
		const { acc, a, b } = build();
		await mount(acc);
		await acc.updateComplete;

		a.shadowRoot.querySelector('[part="button"]').click();
		await a.updateComplete;
		assert(a.open && !b.open, "opening the first pane leaves the second closed");

		b.shadowRoot.querySelector('[part="button"]').click();
		await Promise.all([a.updateComplete, b.updateComplete]);
		assert(b.open, "the second pane opens");
		assert(!a.open, "opening the second pane closes the first (exclusive)");
	});

	it("has no serious or critical accessibility violations", async () => {
		const { acc } = build();
		await mount(acc);
		await acc.updateComplete;
		await assertNoViolations(acc);
	});
});
