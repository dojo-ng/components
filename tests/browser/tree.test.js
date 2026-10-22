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

	// RD1. A real DataTransfer and real layout: the drag events cross the shadow boundary the way
	// a browser drag's do, and the marked row is the one under the event.
	it("as a drop target, marks the accepting row and emits dj-drop with the payload", async () => {
		const el = await mount(make("dj-tree", { nodes: NODES, canDrop: (id, types) => id === "veg" && types.includes("application/x-test") }));
		await el.updateComplete;
		let detail;
		el.addEventListener("dj-drop", (e) => { detail = e.detail; });
		const dt = new DataTransfer();
		dt.setData("application/x-test", "42");
		const veg = el.shadowRoot.querySelectorAll('[part~="row"]')[1];
		const fire = (type, target) => {
			const e = new DragEvent(type, { bubbles: true, composed: true, cancelable: true, dataTransfer: dt });
			target.dispatchEvent(e);
			return e;
		};
		const over = fire("dragover", veg);
		await el.updateComplete;
		assert(over.defaultPrevented, "an accepting row allows the drop");
		assert(veg.getAttribute("part").includes("row--drop-target"), "the accepting row is marked");
		const fruit = el.shadowRoot.querySelectorAll('[part~="row"]')[0];
		assert(!fire("dragover", fruit).defaultPrevented, "a refusing row does not allow the drop");
		await el.updateComplete;
		fire("dragover", veg);
		fire("drop", veg);
		await el.updateComplete;
		assert(detail && detail.id === "veg", "dj-drop names the row");
		assertEqual(detail.dataTransfer.getData("application/x-test"), "42", "the payload arrives");
		assert(!el.shadowRoot.querySelector('[part~="row--drop-target"]'), "the mark clears on drop");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-tree", { nodes: NODES, expanded: ["fruit"] }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
