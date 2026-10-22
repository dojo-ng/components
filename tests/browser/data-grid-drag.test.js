// data-grid-drag + dj-tree drop, in a real browser (row-drag-tree-drop-spec RD2). The drag is
// driven by dispatching DragEvents that carry one real DataTransfer, the way a browser drag
// hands the same object to the source's dragstart and the target's dragover and drop. That
// proves the composed path out of the grid's shadow root and into the tree's, the payload, and
// the marks under real layout. The OS-level drag gesture itself is checked by hand in Perry.
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import "../../packages/data-grid/dist/index.js";
import "../../packages/tree/dist/index.js";
import { selectColumnPlugin } from "../../packages/data-grid-select/dist/index.js";
import { rowDragPlugin } from "../../packages/data-grid-drag/dist/index.js";

if (!globalThis.process) globalThis.process = { env: { NODE_ENV: "production" } };

const TYPE = "application/x-test-messages";

async function setup() {
	const tree = await mount(make("dj-tree", {
		nodes: [{ id: "inbox", label: "Inbox" }, { id: "archive", label: "Archive" }],
		canDrop: (id, types) => id !== "inbox" && types.includes(TYPE),
	}));
	const grid = await mount(make("dj-data-grid", {
		height: "200px", activation: "click", selectionMode: "multiple",
		columns: [{ id: "subject", header: "Subject" }],
		getRowId: (m) => String(m.id),
		data: [{ id: 1, subject: "One" }, { id: 2, subject: "Two" }, { id: 3, subject: "Three" }],
		plugins: [selectColumnPlugin(), rowDragPlugin({
			type: TYPE,
			data: (rows) => JSON.stringify(rows.map((m) => m.id)),
			label: (rows) => (rows.length === 1 ? rows[0].subject : `${rows.length} messages`),
		})],
	}));
	await settleFrames();
	return { tree, grid };
}

const fire = (type, target, dt) => {
	const e = new DragEvent(type, { bubbles: true, composed: true, cancelable: true, dataTransfer: dt });
	target.dispatchEvent(e);
	return e;
};

describe("data-grid-drag onto dj-tree", () => {
	afterEach(cleanup);

	it("drags the selection from the grid and drops it on an accepting folder", async () => {
		const { tree, grid } = await setup();
		grid.table.setRowSelection({ "1": true, "3": true });  // rowSelection is read-only state after mount
		await settleFrames();
		let dropped;
		tree.addEventListener("dj-drop", (e) => {
			dropped = { id: e.detail.id, ids: JSON.parse(e.detail.dataTransfer.getData(TYPE)) };
		});
		const dt = new DataTransfer();
		const rows = grid.shadowRoot.querySelectorAll(".vrow");
		assertEqual(rows[0].getAttribute("draggable"), "true", "rows are draggable");
		assert(!fire("dragstart", rows[2].querySelector(".cell:last-child"), dt).defaultPrevented, "the drag starts");
		assertEqual(dt.getData("text/plain"), "2 messages", "the label names the selection");

		const [inbox, archive] = tree.shadowRoot.querySelectorAll('[part~="row"]');
		assert(!fire("dragover", inbox, dt).defaultPrevented, "a refusing folder does not allow the drop");
		assert(fire("dragover", archive, dt).defaultPrevented, "an accepting folder allows it");
		await tree.updateComplete;
		assert(archive.getAttribute("part").includes("row--drop-target"), "the accepting folder is marked");
		fire("drop", archive, dt);
		fire("dragend", rows[2], dt);
		await settleFrames();
		assertEqual(dropped.id, "archive", "dj-drop names the folder");
		assertEqual(dropped.ids.sort().join(","), "1,3", "the payload is the selection");
		assert(!grid.shadowRoot.querySelector('[part~="row--dragging"]'), "the dragging marks clear");
	});

	it("dragging an unselected row carries only that row", async () => {
		const { grid } = await setup();
		grid.table.setRowSelection({ "1": true });
		await settleFrames();
		const dt = new DataTransfer();
		fire("dragstart", grid.shadowRoot.querySelectorAll(".vrow")[1], dt);
		assertEqual(dt.getData(TYPE), "[2]", "only the dragged row");
		assertEqual(dt.getData("text/plain"), "Two", "the label is the row's subject");
		assertEqual(Object.keys(grid.rowSelection).join(","), "1", "the selection is untouched");
	});
});
