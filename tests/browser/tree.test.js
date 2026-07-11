// dj-tree, in a real browser: clicking a chevron expands a parent (revealing children under
// real layout) and emits dj-expand-change; clicking a row selects it and emits dj-select; plus
// axe on a populated tree.
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/tree/dist/index.js";

const NODES = [
	{ id: "fruit", label: "Fruit", children: [{ id: "apple", label: "Apple" }, { id: "pear", label: "Pear" }] },
	{ id: "veg", label: "Vegetable" },
];

describe("dj-tree", () => {
	afterEach(cleanup);

	it("clicking a chevron expands a parent and emits dj-expand-change", async () => {
		const el = await mount(make("dj-tree", { nodes: NODES }));
		await el.updateComplete;
		let detail;
		el.addEventListener("dj-expand-change", (e) => { detail = e.detail; });

		const rowsBefore = el.shadowRoot.querySelectorAll('[part="row"]').length;
		el.shadowRoot.querySelector('[part="chevron"]').click();
		await el.updateComplete;
		assert(detail && detail.id === "fruit", "expanding emits dj-expand-change for the parent");
		assert(el.shadowRoot.querySelectorAll('[part="row"]').length > rowsBefore, "children become visible rows");
	});

	it("clicking a row selects it and emits dj-select", async () => {
		const el = await mount(make("dj-tree", { nodes: NODES }));
		await el.updateComplete;
		let detail;
		el.addEventListener("dj-select", (e) => { detail = e.detail; });

		el.shadowRoot.querySelectorAll('[part="row"]')[1].click(); // the "Vegetable" leaf
		await el.updateComplete;
		assert(detail && detail.id === "veg", "selecting emits dj-select with the node id");
		assertEqual(el.value, "veg", "the tree's value follows the selection");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-tree", { nodes: NODES, expanded: ["fruit"] }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
