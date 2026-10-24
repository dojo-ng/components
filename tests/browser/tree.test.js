// dj-tree, in a real browser: clicking a chevron expands a parent (revealing children under
// real layout) and emits dj-expand-change; clicking a row selects it and emits dj-select; plus
// axe on a populated tree.
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import { createPubSub } from "@dojo-ng/pubsub";
import { installHistory } from "@dojo-ng/history";
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

// C4. A tracked tree with the real installHistory and the real History API: click through three
// nodes, wait out the dwell, press Back twice, then Forward. Each step must reselect the right
// node, and Back must not add entries. A real popstate arrives a task after history.back().
describe("dj-tree with track", () => {
	let h;
	afterEach(() => {
		h?.destroy();
		h = undefined;
		cleanup();
	});

	const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
	const nextLocation = (hist, test = () => true) => new Promise((resolve) => {
		let replayed = false;
		let stop;
		stop = hist.subscribe((location) => {
			if (!replayed || !test(location)) return;
			stop?.();
			resolve(location);
		});
		replayed = true;
	});
	const TRACKED = [
		{ id: "docs", label: "Docs", children: [{ id: "guide", label: "Guide" }, { id: "api", label: "API" }] },
		{ id: "blog", label: "Blog" },
	];
	const rowOf = (el, id) => el.shadowRoot.querySelector(`li.treeitem[data-id="${id}"]`);

	it("click three nodes, wait out the dwell, Back twice, then Forward: each step reselects the right node", async () => {
		h = installHistory(createPubSub(), { dwellMs: 80 });
		const el = await mount(make("dj-tree", { nodes: TRACKED, track: true, basePath: "/tt-test", expanded: ["docs"] }));
		await el.updateComplete;
		const start = history.length;

		for (const id of ["guide", "api", "blog"]) {
			rowOf(el, id).click();
			await el.updateComplete;
			await wait(160); // longer than dwellMs: each entry commits, so each is its own stack entry
		}
		assertEqual(location.pathname, "/tt-test/blog", "the URL follows the clicks");
		assertEqual(history.length, start + 3, "three committed entries");

		let arrived = nextLocation(h);
		h.back();
		await arrived;
		await el.updateComplete;
		assertEqual(el.value, "api", "Back reselects the previous node");
		assertEqual(location.pathname, "/tt-test/docs/api", "and the URL is its path");

		arrived = nextLocation(h);
		h.back();
		await arrived;
		await el.updateComplete;
		assertEqual(el.value, "guide", "Back again");

		arrived = nextLocation(h);
		h.forward();
		await arrived;
		await el.updateComplete;
		assertEqual(el.value, "api", "Forward");
		assertEqual(history.length, start + 3, "Back and Forward add no entries");
		assertEqual(JSON.stringify(h.current.trail), JSON.stringify([{ path: "/tt-test/docs", label: "Docs" }, { path: "/tt-test/docs/api", label: "API" }]), "the trail comes back with the entry");
	});

	it("a deep location expands and selects the node when the tree appears", async () => {
		h = installHistory(createPubSub(), { dwellMs: 0 });
		h.go("/tt-test/docs/guide");
		const el = await mount(make("dj-tree", { nodes: TRACKED, track: true, basePath: "/tt-test" }));
		await el.updateComplete;
		await wait(20);
		await el.updateComplete;
		assertEqual(el.value, "guide", "selected");
		assert(el.expanded.includes("docs"), "its parent is open");
		assert(rowOf(el, "guide"), "and the row renders");
	});
});
