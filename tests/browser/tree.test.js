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

// ---- TS1: a tree of 50,000 nodes windows its rows (tree-scale-spec.md) ----
describe("dj-tree (virtual)", () => {
	afterEach(cleanup);

	// 50 groups of 1,000, every group open: 50,050 visible rows.
	const big = () => Array.from({ length: 50 }, (_, g) => ({
		id: `g${g}`, label: `Group ${g}`,
		children: Array.from({ length: 1000 }, (_, i) => ({ id: `g${g}-${i}`, label: `Item ${g}.${i}` })),
	}));
	const openAll = () => Array.from({ length: 50 }, (_, g) => `g${g}`);
	const frames = async (n = 3) => { for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r)); };
	const rendered = (el) => el.shadowRoot.querySelectorAll("li.treeitem");
	const settle = async (el) => { await el.updateComplete; await frames(); await el.updateComplete; };
	const key = (el, id, k) => el.shadowRoot.querySelector(`li.treeitem[data-id="${id}"]`)
		.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, composed: true }));

	it("renders under 60 rows for 50,050 visible rows", async () => {
		const el = await mount(make("dj-tree", { nodes: big(), expanded: openAll() }));
		await settle(el);
		assert(el.virtual, "virtual above the threshold");
		const n = rendered(el).length;
		assert(n > 0 && n < 60, `rendered rows should stay under 60, got ${n}`);
		const ul = el.shadowRoot.querySelector("ul");
		assert(ul.scrollHeight > 50000 * 15, `scroll height should span every row, got ${ul.scrollHeight}`);
	});

	it("stays plain DOM at or under the threshold, with the same row markup", async () => {
		const el = await mount(make("dj-tree", { nodes: NODES, expanded: ["fruit"] }));
		await settle(el);
		assert(!el.virtual);
		assertEqual(rendered(el).length, 4);
		const apple = el.shadowRoot.querySelector('li[data-id="apple"]');
		assertEqual(apple.getAttribute("aria-level"), "2");
		assertEqual(apple.getAttribute("aria-posinset"), "1");
		assertEqual(apple.getAttribute("aria-setsize"), "2");
	});

	it("aria-level, aria-posinset, and aria-setsize describe the whole tree, not the window", async () => {
		const el = await mount(make("dj-tree", { nodes: big(), expanded: openAll() }));
		await settle(el);
		const first = el.shadowRoot.querySelector('li[data-id="g0-0"]');
		assertEqual(first.getAttribute("aria-level"), "2");
		assertEqual(first.getAttribute("aria-posinset"), "1");
		assertEqual(first.getAttribute("aria-setsize"), "1000");
		const g0 = el.shadowRoot.querySelector('li[data-id="g0"]');
		assertEqual(g0.getAttribute("aria-setsize"), "50");
	});

	it("End reaches the last row, and Home goes back", async () => {
		const el = await mount(make("dj-tree", { nodes: big(), expanded: openAll() }));
		await settle(el);
		el.shadowRoot.querySelector('li[data-id="g0"]').focus();
		key(el, "g0", "End");
		await settle(el);
		const last = el.shadowRoot.querySelector('li[data-id="g49-999"]');
		assert(last, "the last row renders");
		assertEqual(last.getAttribute("tabindex"), "0");
		assert(el.shadowRoot.activeElement === last, "the last row has focus");
		assert(rendered(el).length < 60, "still windowed");
		key(el, "g49-999", "Home");
		await settle(el);
		assert(el.shadowRoot.activeElement === el.shadowRoot.querySelector('li[data-id="g0"]'), "Home focuses the first row");
	});

	it("arrow keys move through rows that scroll into view", async () => {
		const el = await mount(make("dj-tree", { nodes: big(), expanded: openAll() }));
		await settle(el);
		let id = "g0";
		for (let i = 0; i < 60; i++) {
			key(el, id, "ArrowDown");
			await settle(el);
			id = el.shadowRoot.activeElement.dataset.id;
		}
		assertEqual(id, "g0-59");
		const ul = el.shadowRoot.querySelector("ul");
		assert(ul.scrollTop > 0, "the tree scrolled to follow focus");
	});

	it("collapsing a group rebuilds the window", async () => {
		const el = await mount(make("dj-tree", { nodes: big(), expanded: openAll() }));
		await settle(el);
		el.shadowRoot.querySelector('li[data-id="g0"] [part="chevron"]').click();
		await settle(el);
		assertEqual(el.expanded.length, 49);
		const ul = el.shadowRoot.querySelector("ul");
		assert(ul.scrollHeight < 50050 * 40 && ul.scrollHeight > 49050 * 15, "total height dropped by 1,000 rows");
	});

	it("track reselects a deep node after Back, scrolling it into view", async () => {
		const h = installHistory(createPubSub(), { dwellMs: 40 });
		try {
			const wait = (ms) => new Promise((r) => setTimeout(r, ms));
			h.go("/tv/g30/g30-700");
			const el = await mount(make("dj-tree", { nodes: big(), track: true, basePath: "/tv" }));
			await wait(60);
			await settle(el);
			assertEqual(el.value, "g30-700", "a deep link selects the node");
			await wait(60); // commit the entry
			h.go("/tv/g0");
			await wait(100);
			await settle(el);
			assertEqual(el.value, "g0");
			h.back();
			await wait(100);
			await settle(el);
			assertEqual(el.value, "g30-700", "Back reselects it");
			const row = el.shadowRoot.querySelector('li[data-id="g30-700"]');
			assert(row, "the deep row is rendered");
			const ul = el.shadowRoot.querySelector("ul");
			const box = row.getBoundingClientRect(), view = ul.getBoundingClientRect();
			assert(box.top >= view.top - 1 && box.bottom <= view.bottom + 1, "the deep row is inside the viewport");
		} finally {
			h.destroy();
		}
	});

	it("axe: a virtual tree has no violations", async () => {
		const el = await mount(make("dj-tree", { nodes: big(), expanded: openAll() }));
		await settle(el);
		await assertNoViolations(el);
	});
});

// ---- TS2: lazy children (tree-scale-spec.md) ----
describe("dj-tree (lazy children)", () => {
	let h;
	afterEach(() => { h?.destroy(); h = undefined; cleanup(); });

	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	const settle = async (el) => { await el.updateComplete; await wait(20); await el.updateComplete; };
	const ids = (el) => [...el.shadowRoot.querySelectorAll("li.treeitem")].map((r) => r.dataset.id.replace("\u001f", ":"));
	const LAZY = () => [
		{ id: "docs", label: "Docs", hasChildren: true },
		{ id: "blog", label: "Blog", hasChildren: true },
		{ id: "misc", label: "Misc" },
	];
	const loads = (el) => { const list = []; el.addEventListener("dj-load-children", (e) => list.push(e.detail.id)); return list; };
	const open = (el, id) => el.shadowRoot.querySelector(`li[data-id="${id}"] [part="chevron"]`).click();

	it("a lazy node shows a chevron; opening it emits dj-load-children once and shows a loading row", async () => {
		const el = await mount(make("dj-tree", { nodes: LAZY() }));
		const asked = loads(el);
		await settle(el);
		assert(el.shadowRoot.querySelector('li[data-id="docs"] [part="chevron"]'), "chevron on a lazy node");
		open(el, "docs");
		await settle(el);
		assertEqual(JSON.stringify(asked), '["docs"]');
		assertEqual(JSON.stringify(ids(el)), '["docs","docs:loading","blog","misc"]');
		assertEqual(el.shadowRoot.querySelector('li[data-id="docs"]').getAttribute("aria-busy"), "true");
		el.requestUpdate();
		await settle(el);
		assertEqual(asked.length, 1, "a re-render does not ask again");
	});

	it("setChildren renders the children; an empty answer makes the node a leaf", async () => {
		const el = await mount(make("dj-tree", { nodes: LAZY() }));
		await settle(el);
		open(el, "docs");
		await settle(el);
		assert(el.setChildren("docs", [{ id: "guide", label: "Guide" }, { id: "api", label: "API" }]));
		await settle(el);
		assertEqual(JSON.stringify(ids(el)), '["docs","guide","api","blog","misc"]');
		assertEqual(el.shadowRoot.querySelector('li[data-id="guide"]').getAttribute("aria-level"), "2");
		assertEqual(el.shadowRoot.querySelector('li[data-id="docs"]').getAttribute("aria-busy"), null);
		open(el, "blog");
		await settle(el);
		el.setChildren("blog", []);
		await settle(el);
		assertEqual(el.shadowRoot.querySelector('li[data-id="blog"] [part="chevron"]'), null, "an empty node is a leaf");
		assert(!el.setChildren("nope", []), "an unknown id is ignored");
	});

	it("slow, out of order: answers arrive in the reverse order and land on the right nodes", async () => {
		const el = await mount(make("dj-tree", { nodes: LAZY() }));
		const asked = loads(el);
		await settle(el);
		open(el, "docs");
		open(el, "blog");
		await settle(el);
		assertEqual(JSON.stringify(asked), '["docs","blog"]');
		el.setChildren("blog", [{ id: "post", label: "Post" }]);
		await wait(30);
		el.setChildren("docs", [{ id: "guide", label: "Guide" }]);
		await settle(el);
		assertEqual(JSON.stringify(ids(el)), '["docs","guide","blog","post","misc"]');
	});

	it("a collapse while loading keeps the answer, and reopening does not ask again", async () => {
		const el = await mount(make("dj-tree", { nodes: LAZY() }));
		const asked = loads(el);
		await settle(el);
		open(el, "docs");
		await settle(el);
		open(el, "docs");
		await settle(el);
		open(el, "docs");
		await settle(el);
		assertEqual(asked.length, 1);
		el.setChildren("docs", [{ id: "guide", label: "Guide" }]);
		await settle(el);
		assertEqual(JSON.stringify(ids(el)), '["docs","guide","blog","misc"]');
	});

	it("a failed load shows a retry row; Enter on it asks again, and the next answer fixes it", async () => {
		const el = await mount(make("dj-tree", { nodes: LAZY() }));
		const asked = loads(el);
		await settle(el);
		open(el, "docs");
		await settle(el);
		el.setChildren("docs", null, { error: new Error("offline") });
		await settle(el);
		const retry = el.shadowRoot.querySelector('li[data-id="docs\u001ferror"]');
		assert(retry, "retry row");
		assertEqual(retry.querySelector(".row").title, "offline");
		retry.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }));
		await settle(el);
		assertEqual(JSON.stringify(asked), '["docs","docs"]');
		assert(el.shadowRoot.querySelector('li[data-id="docs\u001floading"]'), "back to loading");
		el.setChildren("docs", [{ id: "guide", label: "Guide" }]);
		await settle(el);
		assertEqual(JSON.stringify(ids(el)), '["docs","guide","blog","misc"]');
	});

	it("clicking the retry row asks again, and neither status row selects", async () => {
		const el = await mount(make("dj-tree", { nodes: LAZY() }));
		const asked = loads(el);
		let selected = 0;
		el.addEventListener("dj-select", () => selected++);
		await settle(el);
		open(el, "docs");
		await settle(el);
		el.shadowRoot.querySelector('li[data-id="docs\u001floading"]').click();
		el.setChildren("docs", null, { error: "x" });
		await settle(el);
		el.shadowRoot.querySelector('li[data-id="docs\u001ferror"]').click();
		await settle(el);
		assertEqual(asked.length, 2);
		assertEqual(selected, 0);
	});

	it("an expanded the app sets also loads, and keyboard Right opens and loads", async () => {
		const el = make("dj-tree", { nodes: LAZY(), expanded: ["blog"] });
		const asked = loads(el);
		await mount(el);
		await settle(el);
		assertEqual(JSON.stringify(asked), '["blog"]');
		el.setChildren("blog", [{ id: "post", label: "Post" }]);
		await settle(el);
		el.shadowRoot.querySelector('li[data-id="docs"]').dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }));
		await settle(el);
		assertEqual(JSON.stringify(asked), '["blog","docs"]');
	});

	it("track: a deep link to an unloaded node emits loads down the path, in order", async () => {
		h = installHistory(createPubSub(), { dwellMs: 0 });
		h.go("/lz/docs/guide/intro");
		const source = {
			docs: [{ id: "guide", label: "Guide", hasChildren: true }, { id: "api", label: "API" }],
			guide: [{ id: "intro", label: "Intro" }],
		};
		const el = make("dj-tree", { nodes: [{ id: "docs", label: "Docs", hasChildren: true }], track: true, basePath: "/lz" });
		const asked = [];
		el.addEventListener("dj-load-children", (e) => {
			asked.push(e.detail.id);
			setTimeout(() => el.setChildren(e.detail.id, source[e.detail.id]), 15);
		});
		await mount(el);
		await wait(250);
		await settle(el);
		assertEqual(JSON.stringify(asked), '["docs","guide"]');
		assertEqual(el.value, "intro", "the deep node ends up selected");
		assertEqual(JSON.stringify(el.expanded), '["docs","guide"]');
		assert(el.shadowRoot.querySelector('li[data-id="intro"]'), "and rendered");
	});
});

// ---- TS3: checkboxes (tree-scale-spec.md) ----
describe("dj-tree (checkable)", () => {
	afterEach(cleanup);

	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	const settle = async (el) => { await el.updateComplete; await wait(20); await el.updateComplete; };
	const NODES = () => [
		{ id: "a", label: "A", children: [
			{ id: "a1", label: "A1" },
			{ id: "a2", label: "A2" },
		] },
		{ id: "b", label: "B" },
		{ id: "lz", label: "Lazy", hasChildren: true },
	];
	const row = (el, id) => el.shadowRoot.querySelector(`li[data-id="${id}"]`);
	const state = (el, id) => row(el, id).getAttribute("aria-checked");
	const box = (el, id) => row(el, id).querySelector('[part="checkbox"]');
	const key = (el, id, k) => row(el, id).dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, composed: true }));
	const mk = async (props = {}) => {
		const el = make("dj-tree", { nodes: NODES(), expanded: ["a"], checkable: true, ...props });
		const events = [];
		el.addEventListener("dj-check-change", (e) => events.push(e.detail));
		await mount(el);
		await settle(el);
		return { el, events };
	};

	it("without checkable there are no boxes and no aria-checked", async () => {
		const { el } = await mk({ checkable: false });
		assertEqual(box(el, "a"), null);
		assertEqual(row(el, "a").getAttribute("aria-checked"), null);
	});

	it("clicking a box checks the node, emits dj-check-change, and does not select", async () => {
		const { el, events } = await mk();
		let selected = 0;
		el.addEventListener("dj-select", () => selected++);
		box(el, "b").click();
		await settle(el);
		assertEqual(state(el, "b"), "true");
		assertEqual(JSON.stringify(el.checked), '["b"]');
		assertEqual(JSON.stringify(events[0]), JSON.stringify({ id: "b", checked: ["b"], partial: [], pendingParents: [] }));
		assertEqual(selected, 0);
		assertEqual(el.value, "");
	});

	it("checking a parent checks its loaded children, and one child unchecked makes it mixed", async () => {
		const { el, events } = await mk();
		box(el, "a").click();
		await settle(el);
		assertEqual([state(el, "a"), state(el, "a1"), state(el, "a2")].join(), "true,true,true");
		box(el, "a1").click();
		await settle(el);
		assertEqual([state(el, "a"), state(el, "a1"), state(el, "a2")].join(), "mixed,false,true");
		assertEqual(JSON.stringify(events.at(-1).partial), '["a"]');
		box(el, "a1").click();
		await settle(el);
		assertEqual(state(el, "a"), "true", "the last child checked checks the parent");
	});

	it("Space toggles the check and leaves the selection; Enter selects and leaves the check", async () => {
		const { el, events } = await mk();
		row(el, "b").focus();
		key(el, "b", " ");
		await settle(el);
		assertEqual(state(el, "b"), "true");
		assertEqual(el.value, "");
		key(el, "b", "Enter");
		await settle(el);
		assertEqual(el.value, "b");
		assertEqual(state(el, "b"), "true");
		assertEqual(events.length, 1);
		key(el, "b", " ");
		await settle(el);
		assertEqual(state(el, "b"), "false");
	});

	it("Space still selects when the tree is not checkable", async () => {
		const { el } = await mk({ checkable: false });
		key(el, "b", " ");
		await settle(el);
		assertEqual(el.value, "b");
	});

	it("a controlled checked renders, and a listed parent checks the loaded children", async () => {
		const { el } = await mk({ checked: ["a2"] });
		assertEqual([state(el, "a"), state(el, "a1"), state(el, "a2")].join(), "mixed,false,true");
		el.checked = ["a"];
		await settle(el);
		assertEqual([state(el, "a1"), state(el, "a2")].join(), "true,true");
	});

	it("an unloaded lazy node is reported as pending, and its children arrive checked", async () => {
		const { el, events } = await mk();
		box(el, "lz").click();
		await settle(el);
		assertEqual(JSON.stringify(events.at(-1).pendingParents), '["lz"]');
		el.setChildren("lz", [{ id: "l1", label: "L1" }, { id: "l2", label: "L2" }]);
		el.expanded = ["a", "lz"];
		await settle(el);
		assertEqual([state(el, "lz"), state(el, "l1"), state(el, "l2")].join(), "true,true,true");
		box(el, "l1").click();
		await settle(el);
		assertEqual(state(el, "lz"), "mixed");
		assertEqual(JSON.stringify(events.at(-1).pendingParents), "[]");
	});

	it("axe: a checkable tree with checked, mixed and unchecked rows has no violations", async () => {
		const { el } = await mk({ checked: ["a1"] });
		await assertNoViolations(el);
	});
});
