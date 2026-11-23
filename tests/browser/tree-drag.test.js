// dj-tree rows as drag sources (TS4, tree-scale-spec.md). Like data-grid-drag.test.js, the drag is
// driven by DragEvents that share one DataTransfer, the way a browser hands the same object to the
// source's dragstart and the target's dragover and drop. The OS-level gesture is checked by hand.
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import "../../packages/tree/dist/index.js";
import "../../packages/data-grid/dist/index.js";

if (!globalThis.process) globalThis.process = { env: { NODE_ENV: "production" } };

const TYPE = "application/x-dojo-tree-rows";
const NODES = () => [
	{ id: "a", label: "Alpha", children: [{ id: "a1", label: "A1" }, { id: "a2", label: "A2" }] },
	{ id: "b", label: "Bravo" },
	{ id: "c", label: "Charlie", children: [{ id: "c1", label: "C1" }] },
	{ id: "d", label: "Delta" },
];

const settle = async (el) => { await el.updateComplete; await settleFrames(); await el.updateComplete; };
const row = (el, id) => el.shadowRoot.querySelector(`li[data-id="${id}"]`);
const fire = (type, target, dt, clientY) => {
	const e = new DragEvent(type, { bubbles: true, composed: true, cancelable: true, dataTransfer: dt, clientY });
	target.dispatchEvent(e);
	return e;
};
/** A pointer `fraction` of the way down the row's box. */
const at = (el, id, fraction) => {
	const box = row(el, id).querySelector(".row").getBoundingClientRect();
	return box.top + box.height * fraction;
};
const over = (el, id, fraction, dt) => fire("dragover", row(el, id).querySelector(".row"), dt, at(el, id, fraction));
const start = (el, id, dt = new DataTransfer()) => { fire("dragstart", row(el, id), dt); return dt; };
const moves = (el) => { const list = []; el.addEventListener("dj-move", (e) => list.push(e.detail)); return list; };
const partOf = (el, id) => row(el, id).querySelector(".row").getAttribute("part");

describe("dj-tree (draggable rows)", () => {
	afterEach(cleanup);

	const mk = async (props = {}) => {
		const el = await mount(make("dj-tree", { nodes: NODES(), expanded: ["a"], draggableRows: true, ...props }));
		await settle(el);
		return el;
	};

	it("rows are draggable only with draggable-rows", async () => {
		const el = await mk();
		assertEqual(row(el, "b").getAttribute("draggable"), "true");
		el.draggableRows = false;
		await settle(el);
		assertEqual(row(el, "b").getAttribute("draggable"), null);
	});

	it("dragstart writes the ids under drag-type and the labels as text/plain", async () => {
		const el = await mk();
		const dt = start(el, "b");
		assertEqual(dt.getData(TYPE), '["b"]');
		assertEqual(dt.getData("text/plain"), "Bravo");
	});

	it("drag-type renames the payload type", async () => {
		const el = await mk({ dragType: "application/x-test-folders" });
		assertEqual(start(el, "b").getData("application/x-test-folders"), '["b"]');
	});

	it("the top edge of a row is before, the bottom edge after; a line marks it and drop emits dj-move", async () => {
		const el = await mk();
		const list = moves(el);
		const dt = start(el, "b");
		let e = over(el, "d", 0.1, dt);
		assert(e.defaultPrevented, "a row can be dropped before");
		await settle(el);
		assert(partOf(el, "d").includes("row--drop-before"), "before is marked");
		over(el, "d", 0.9, dt);
		await settle(el);
		assert(partOf(el, "d").includes("row--drop-after"), "after is marked");
		fire("drop", row(el, "d").querySelector(".row"), dt, at(el, "d", 0.9));
		await settle(el);
		assertEqual(JSON.stringify(list), JSON.stringify([{ ids: ["b"], target: "d", position: "after" }]));
		assertEqual(row(el, "d").querySelector(".row").getAttribute("part"), "row", "the mark clears");
	});

	it("the middle of a row that has children is inside; a leaf has no inside", async () => {
		const el = await mk();
		const list = moves(el);
		const dt = start(el, "b");
		over(el, "c", 0.5, dt);
		await settle(el);
		assert(partOf(el, "c").includes("row--drop-target"), "inside is marked as a drop target");
		fire("drop", row(el, "c").querySelector(".row"), dt, at(el, "c", 0.5));
		assertEqual(list[0].position, "inside");
		assertEqual(list[0].target, "c");
		over(el, "d", 0.5, dt);
		await settle(el);
		assert(!partOf(el, "d").includes("row--drop-target"), "a leaf cannot take an inside drop");
	});

	it("canDrop decides which rows take an inside drop", async () => {
		const el = await mk({ canDrop: (id) => id === "d" });
		const dt = start(el, "b");
		over(el, "d", 0.5, dt);
		await settle(el);
		assert(partOf(el, "d").includes("row--drop-target"), "d accepts inside");
		over(el, "c", 0.5, dt);
		await settle(el);
		assert(!partOf(el, "c").includes("row--drop-target"), "c, with children, does not");
	});

	it("the bottom edge of an open parent means inside", async () => {
		const el = await mk();
		const dt = start(el, "b");
		over(el, "a", 0.9, dt);
		await settle(el);
		assert(partOf(el, "a").includes("row--drop-target"), "inside, not after");
	});

	it("refuses a drop on a dragged row or anything below it", async () => {
		const el = await mk();
		const list = moves(el);
		const dt = start(el, "a");
		assert(!over(el, "a", 0.5, dt).defaultPrevented, "on itself");
		assert(!over(el, "a1", 0.1, dt).defaultPrevented, "on a child");
		fire("drop", row(el, "a1").querySelector(".row"), dt, at(el, "a1", 0.1));
		assertEqual(list.length, 0);
		assert(over(el, "d", 0.1, dt).defaultPrevented, "elsewhere is fine");
	});

	it("an unchecked row drags alone; a checked row drags every checked row, top-most only", async () => {
		const el = await mk({ checkable: true, checked: ["a", "b"] });
		assertEqual(start(el, "d").getData(TYPE), '["d"]');
		assertEqual(start(el, "b").getData(TYPE), '["a","b"]', "a checked parent carries its children");
		assertEqual(start(el, "a1").getData(TYPE), '["a","b"]', "a child of a checked parent is checked too");
		const dt = start(el, "b");
		assertEqual(dt.getData("text/plain"), "Alpha\nBravo");
	});

	it("a multi-row drag lands as one dj-move", async () => {
		const el = await mk({ checkable: true, checked: ["b", "c"] });
		const list = moves(el);
		const dt = start(el, "b");
		over(el, "d", 0.9, dt);
		fire("drop", row(el, "d").querySelector(".row"), dt, at(el, "d", 0.9));
		assertEqual(JSON.stringify(list), JSON.stringify([{ ids: ["b", "c"], target: "d", position: "after" }]));
	});

	it("rows from another tree are a plain drop: canDrop and dj-drop, never dj-move", async () => {
		const src = await mk();
		const dst = await mount(make("dj-tree", { nodes: [{ id: "x", label: "X" }, { id: "y", label: "Y" }], canDrop: (id, types) => id === "y" && types.includes(TYPE) }));
		await settle(dst);
		const list = moves(dst);
		let drop;
		dst.addEventListener("dj-drop", (e) => { drop = e.detail; });
		const dt = start(src, "b");
		assert(!over(dst, "x", 0.5, dt).defaultPrevented, "x refuses");
		assert(over(dst, "y", 0.5, dt).defaultPrevented, "y accepts");
		fire("drop", row(dst, "y").querySelector(".row"), dt, at(dst, "y", 0.5));
		assertEqual(drop.id, "y");
		assertEqual(drop.dataTransfer.getData(TYPE), '["b"]');
		assertEqual(list.length, 0);
	});

	it("a tree without draggable rows or canDrop ignores another tree's drag", async () => {
		const src = await mk();
		const dst = await mount(make("dj-tree", { nodes: [{ id: "x", label: "X" }] }));
		await settle(dst);
		const dt = start(src, "b");
		assert(!over(dst, "x", 0.5, dt).defaultPrevented);
	});

	it("rows dropped on a grid arrive through the drag data, which the grid host can read", async () => {
		const tree = await mk();
		const grid = await mount(make("dj-data-grid", { height: "120px", columns: [{ id: "n", header: "Name" }], data: [{ id: 1, n: "One" }], getRowId: (r) => String(r.id) }));
		await settleFrames();
		let got;
		grid.addEventListener("dragover", (e) => { if (e.dataTransfer.types.includes(TYPE)) e.preventDefault(); });
		grid.addEventListener("drop", (e) => { e.preventDefault(); got = JSON.parse(e.dataTransfer.getData(TYPE)); });
		const dt = start(tree, "b");
		const target = grid.shadowRoot.querySelector(".vrow") ?? grid.shadowRoot.firstElementChild;
		assert(fire("dragover", target, dt).defaultPrevented, "the grid host sees the drag from inside its shadow root");
		fire("drop", target, dt);
		assertEqual(JSON.stringify(got), '["b"]');
	});

	it("dragend ends the drag, so a later foreign drag is not treated as a move", async () => {
		const el = await mk();
		const list = moves(el);
		const dt = start(el, "b");
		fire("dragend", row(el, "b"), dt);
		const foreign = new DataTransfer();
		foreign.setData("text/plain", "x");
		assert(!over(el, "d", 0.1, foreign).defaultPrevented, "not a landing after the drag ended");
		fire("drop", row(el, "d").querySelector(".row"), foreign, at(el, "d", 0.1));
		assertEqual(list.length, 0);
	});

	it("in a virtual tree the dragged row stays rendered while the tree scrolls away", async () => {
		const nodes = Array.from({ length: 5000 }, (_, i) => ({ id: `n${i}`, label: `Node ${i}` }));
		const el = await mk({ nodes, expanded: [] });
		assert(el.virtual);
		start(el, "n2");
		const ul = el.shadowRoot.querySelector("ul");
		ul.scrollTop = 40000;
		await settle(el);
		assert(row(el, "n2"), "the dragged row is still in the DOM");
		assert(el.shadowRoot.querySelectorAll("li.treeitem").length < 60);
	});
});
