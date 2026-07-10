// dj-context-menu, in a real browser: a contextmenu (right-click) on the trigger opens the
// menu, choosing an item emits dj-select with the item's value and closes the menu, and an
// axe pass. Real contextmenu routing is browser-only.
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/context-menu/dist/index.js";

const OPTIONS = [
	{ value: "edit", label: "Edit" },
	{ value: "delete", label: "Delete" },
];

function buildMenu() {
	const el = make("dj-context-menu", { options: OPTIONS });
	el.append(make("button", {}, "Target"));
	return el;
}

function rightClick(node) {
	node.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 20, clientY: 20 }));
}

describe("dj-context-menu", () => {
	afterEach(cleanup);

	it("right-clicking the trigger opens the menu", async () => {
		const el = await mount(buildMenu());
		await el.updateComplete;
		rightClick(el.querySelector("button"));
		await el.updateComplete;
		await settleFrames();
		assert(el.shadowRoot.querySelector("dj-context-popup").open === true, "the context menu opens");
	});

	it("choosing an item emits dj-select and closes", async () => {
		const el = await mount(buildMenu());
		await el.updateComplete;
		let selected;
		el.addEventListener("dj-select", (e) => { selected = e.detail.value; });

		rightClick(el.querySelector("button"));
		await el.updateComplete;
		await settleFrames();

		const items = el.shadowRoot.querySelector("dj-list").shadowRoot.querySelectorAll('[part="item"]');
		assertEqual(items.length, 2, "one menu item per option");
		items[1].click();
		await el.updateComplete;
		assertEqual(selected, "delete", "dj-select carries the chosen item's value");
		assert(el.shadowRoot.querySelector("dj-context-popup").open === false, "choosing closes the menu");
	});

	it("has no serious or critical accessibility violations while open", async () => {
		const el = await mount(buildMenu());
		await el.updateComplete;
		rightClick(el.querySelector("button"));
		await el.updateComplete;
		await settleFrames();
		await assertNoViolations(el);
	});
});
