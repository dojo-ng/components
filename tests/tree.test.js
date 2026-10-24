// Behavior tests for dj-tree v2. Covers the roving-tabindex keyboard model, controlled expansion
// + dj-expand-change, icon/count rendering, and aria-level. happy-dom delivers key events and
// reflects the roving tabindex after a render; real focus visuals are the TR4 browser check.
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/tree/dist/index.js";

const tick = async (n = 2) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };

const NODES = () => [
	{ id: "inbox", label: "Inbox", icon: "folder", count: 3, children: [
		{ id: "work", label: "Work", count: 1 },
		{ id: "personal", label: "Personal" },
	] },
	{ id: "archive", label: "Archive", children: [
		{ id: "y2025", label: "2025" },
	] },
	{ id: "trash", label: "Trash" },
];

async function build(props = {}) {
	const el = document.createElement("dj-tree");
	el.nodes = NODES();
	for (const [k, v] of Object.entries(props)) el[k] = v;
	document.body.appendChild(el);
	if (el.updateComplete) await el.updateComplete;
	await tick();
	if (el.updateComplete) await el.updateComplete;
	return el;
}
const rows = (el) => [...el.renderRoot.querySelectorAll("li.treeitem")];
const rowById = (el, id) => rows(el).find((r) => r.dataset.id === id);
const visibleIds = (el) => rows(el).map((r) => r.dataset.id);
const tabbable = (el) => rows(el).filter((r) => r.getAttribute("tabindex") === "0").map((r) => r.dataset.id);
async function press(el, id, key, opts = {}) {
	rowById(el, id).dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true, ...opts }));
	await settled(el);
	await tick();
}

test("registers <dj-tree>", () => {
	assert.equal(typeof customElements.get("dj-tree"), "function");
});

test("roving tabindex: exactly one row is tabbable (first visible when no value)", async () => {
	const el = await build();
	assert.deepEqual(tabbable(el), ["inbox"]);
});

test("roving tabindex follows value when the selected row is visible", async () => {
	const el = await build({ value: "trash" });
	assert.deepEqual(tabbable(el), ["trash"]);
});

test("controlled expansion: setting `expanded` reveals children", async () => {
	const el = await build();
	assert.deepEqual(visibleIds(el), ["inbox", "archive", "trash"]);
	el.expanded = ["inbox"];
	await settled(el); await tick();
	assert.deepEqual(visibleIds(el), ["inbox", "work", "personal", "archive", "trash"]);
});

test("ArrowDown skips a collapsed subtree", async () => {
	const el = await build();
	await press(el, "inbox", "ArrowDown");
	assert.deepEqual(tabbable(el), ["archive"]); // inbox's children are collapsed, so skipped
});

test("ArrowRight expands a closed parent (dj-expand-change), then steps into the first child", async () => {
	const el = await build();
	const seen = [];
	el.addEventListener("dj-expand-change", (e) => seen.push(e.detail));
	await press(el, "inbox", "ArrowRight"); // expands
	assert.deepEqual(el.expanded, ["inbox"]);
	assert.deepEqual(seen.at(-1), { id: "inbox", expanded: true, expandedIds: ["inbox"] });
	assert.deepEqual(tabbable(el), ["inbox"]); // focus stays on the parent after expanding
	await press(el, "inbox", "ArrowRight"); // steps into first child
	assert.deepEqual(tabbable(el), ["work"]);
});

test("ArrowLeft collapses an open parent, and on a child moves to the parent", async () => {
	const el = await build({ expanded: ["inbox"] });
	await press(el, "work", "ArrowLeft"); // child -> parent
	assert.deepEqual(tabbable(el), ["inbox"]);
	await press(el, "inbox", "ArrowLeft"); // open parent -> collapse
	assert.deepEqual(el.expanded, []);
	assert.deepEqual(visibleIds(el), ["inbox", "archive", "trash"]);
});

test("Home and End jump to the first and last visible rows", async () => {
	const el = await build();
	await press(el, "inbox", "End");
	assert.deepEqual(tabbable(el), ["trash"]);
	await press(el, "trash", "Home");
	assert.deepEqual(tabbable(el), ["inbox"]);
});

test("chevron click toggles expansion without selecting", async () => {
	const el = await build();
	const seen = [];
	el.addEventListener("dj-expand-change", (e) => seen.push(e.detail));
	rowById(el, "inbox").querySelector('[part="chevron"]').dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
	await settled(el); await tick();
	assert.deepEqual(el.expanded, ["inbox"]);
	assert.equal(seen.at(-1).expandedIds.join(","), "inbox");
	assert.equal(el.value, "", "chevron click must not select");
});

test("icon renders a dj-icon with the node's type; count renders in part=count", async () => {
	const el = await build();
	const inbox = rowById(el, "inbox");
	const icon = inbox.querySelector("dj-icon.nicon");
	assert.ok(icon, "icon element present");
	assert.equal(icon.getAttribute("type"), "folder");
	assert.equal(inbox.querySelector('[part="count"]').textContent.trim(), "3");
	// A node without a count renders no count element.
	assert.equal(rowById(el, "trash").querySelector('[part="count"]'), null);
});

test("aria-level is 1-based and deepens with nesting", async () => {
	const el = await build({ expanded: ["inbox"] });
	assert.equal(rowById(el, "inbox").getAttribute("aria-level"), "1");
	assert.equal(rowById(el, "work").getAttribute("aria-level"), "2");
});

test("aria-expanded on parents only; aria-selected on the selected row only", async () => {
	const el = await build({ value: "trash", expanded: ["inbox"] });
	assert.equal(rowById(el, "inbox").getAttribute("aria-expanded"), "true");
	assert.equal(rowById(el, "archive").getAttribute("aria-expanded"), "false");
	assert.equal(rowById(el, "trash").getAttribute("aria-expanded"), null, "leaf has no aria-expanded");
	assert.equal(rowById(el, "trash").getAttribute("aria-selected"), "true");
	assert.equal(rowById(el, "inbox").getAttribute("aria-selected"), null);
});

test("row click selects without expanding (expand-on-row-click off by default)", async () => {
	const el = await build();
	const seen = [];
	el.addEventListener("dj-expand-change", (e) => seen.push(e.detail));
	rowById(el, "inbox").dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
	await settled(el); await tick();
	assert.equal(el.value, "inbox");
	assert.deepEqual(el.expanded, [], "the default must not toggle from the row");
	assert.deepEqual(seen, []);
});

test("expandOnRowClick: a parent row click selects AND toggles; a leaf only selects", async () => {
	const el = await build({ expandOnRowClick: true });
	const selected = [];
	el.addEventListener("dj-select", (e) => selected.push(e.detail.id));
	const click = async (id) => {
		rowById(el, id).dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
		await settled(el); await tick();
	};
	await click("inbox");
	assert.deepEqual(el.expanded, ["inbox"], "first click expands");
	assert.equal(el.value, "inbox", "and still selects");
	await click("inbox");
	assert.deepEqual(el.expanded, [], "second click collapses");
	await click("trash");
	assert.deepEqual(el.expanded, [], "a leaf row does not toggle anything");
	assert.deepEqual(selected, ["inbox", "inbox", "trash"], "dj-select fires either way");
});

test("expandOnRowClick: the chevron still toggles exactly once, not twice", async () => {
	const el = await build({ expandOnRowClick: true });
	rowById(el, "inbox").querySelector('[part="chevron"]').dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
	await settled(el); await tick();
	assert.deepEqual(el.expanded, ["inbox"], "chevron stops propagation, so the row handler must not also fire");
	assert.equal(el.value, "", "chevron click must still not select");
});

test("arrow movement never selects; Enter and Space do", async () => {
	const el = await build();
	const selected = [];
	el.addEventListener("dj-select", (e) => selected.push(e.detail.id));
	await press(el, "inbox", "ArrowDown");
	await press(el, "archive", "ArrowUp");
	assert.deepEqual(selected, [], "arrows do not select");
	await press(el, "inbox", "Enter");
	assert.deepEqual(selected, ["inbox"]);
	assert.equal(el.value, "inbox");
	await press(el, "inbox", " ");
	assert.deepEqual(selected, ["inbox", "inbox"]);
});

// --- drop target (row-drag-tree-drop-spec RD1) ---------------------------------------------
// happy-dom has no DataTransfer, so a stub carries `types` and records dropEffect.
function dragEvent(type, types = ["application/x-test"]) {
	const e = new Event(type, { bubbles: true, composed: true, cancelable: true });
	Object.defineProperty(e, "dataTransfer", { value: { types, dropEffect: "" } });
	return e;
}
async function dragOn(el, id, type, types) {
	const e = dragEvent(type, types);
	rowById(el, id).querySelector(".row").dispatchEvent(e);
	await settled(el); await tick();
	return e;
}
const marked = (el) => rows(el).filter((r) => r.querySelector(":scope > .row").getAttribute("part").includes("row--drop-target")).map((r) => r.dataset.id);

test("drop: with no canDrop the tree ignores drags", async () => {
	const el = await build();
	const e = await dragOn(el, "trash", "dragover");
	assert.equal(e.defaultPrevented, false);
	assert.deepEqual(marked(el), []);
});

test("drop: an accepting row is marked and the drag is allowed; a refused row is not", async () => {
	const el = await build({ canDrop: (id) => id !== "archive" });
	let e = await dragOn(el, "trash", "dragover");
	assert.equal(e.defaultPrevented, true);
	assert.equal(e.dataTransfer.dropEffect, "move");
	assert.deepEqual(marked(el), ["trash"]);
	e = await dragOn(el, "archive", "dragover");
	assert.equal(e.defaultPrevented, false);
	assert.equal(e.dataTransfer.dropEffect, "none");
	assert.deepEqual(marked(el), []);
});

test("drop: canDrop sees the drag's types", async () => {
	let seen = null;
	const el = await build({ canDrop: (id, types) => { seen = types; return types.includes("application/x-mine"); } });
	const e = await dragOn(el, "trash", "dragover", ["application/x-mine", "text/plain"]);
	assert.deepEqual(seen, ["application/x-mine", "text/plain"]);
	assert.equal(e.defaultPrevented, true);
	const e2 = await dragOn(el, "trash", "dragover", ["Files"]);
	assert.equal(e2.defaultPrevented, false);
});

test("drop: only one row is marked at a time", async () => {
	const el = await build({ canDrop: () => true });
	await dragOn(el, "inbox", "dragover");
	await dragOn(el, "trash", "dragover");
	assert.deepEqual(marked(el), ["trash"]);
});

test("drop: dj-drop carries the id and dataTransfer, clears the mark, and does not select", async () => {
	const el = await build({ canDrop: () => true });
	const got = [];
	el.addEventListener("dj-drop", (ev) => got.push(ev.detail));
	await dragOn(el, "trash", "dragover");
	const e = await dragOn(el, "trash", "drop");
	assert.equal(e.defaultPrevented, true);
	assert.equal(got.length, 1);
	assert.equal(got[0].id, "trash");
	assert.deepEqual([...got[0].dataTransfer.types], ["application/x-test"]);
	assert.deepEqual(marked(el), []);
	assert.equal(el.value, "");
});

test("drop: a drop on a refused row emits nothing", async () => {
	const el = await build({ canDrop: (id) => id === "trash" });
	let n = 0;
	el.addEventListener("dj-drop", () => n++);
	await dragOn(el, "archive", "drop");
	assert.equal(n, 0);
});

test("drop: dragend anywhere clears the mark", async () => {
	const el = await build({ canDrop: () => true });
	await dragOn(el, "trash", "dragover");
	document.dispatchEvent(new Event("dragend"));
	await settled(el); await tick();
	assert.deepEqual(marked(el), []);
});

test("drop: resting on a collapsed parent springs it open once, after the delay", async () => {
	const el = await build({ canDrop: () => true, springDelay: 30 });
	const changes = [];
	el.addEventListener("dj-expand-change", (ev) => changes.push(ev.detail));
	await dragOn(el, "inbox", "dragover");
	await dragOn(el, "inbox", "dragover");  // repeated dragover must not restart or double the timer
	assert.equal(changes.length, 0);
	await new Promise((r) => setTimeout(r, 60));
	await settled(el); await tick();
	assert.equal(changes.length, 1);
	assert.deepEqual(changes[0], { id: "inbox", expanded: true, expandedIds: ["inbox"] });
	assert.ok(visibleIds(el).includes("work"));
});

test("drop: moving off a parent before the delay cancels the spring; leaves never spring", async () => {
	const el = await build({ canDrop: () => true, springDelay: 30 });
	let n = 0;
	el.addEventListener("dj-expand-change", () => n++);
	await dragOn(el, "inbox", "dragover");
	await dragOn(el, "trash", "dragover");
	await new Promise((r) => setTimeout(r, 60));
	assert.equal(n, 0);
});

test("drop: spring-delay 0 turns spring-loading off", async () => {
	const el = await build({ canDrop: () => true, springDelay: 0 });
	let n = 0;
	el.addEventListener("dj-expand-change", () => n++);
	await dragOn(el, "inbox", "dragover");
	await new Promise((r) => setTimeout(r, 20));
	assert.equal(n, 0);
});

// --- Tracking navigation (C4): track, base-path, node paths, trail, location sync -----------

import { installFakeHistory } from "./fake-history-window.js";

const MAIL = () => [
	{ id: "inbox", label: "Inbox", children: [
		{ id: "work", label: "Work" },
		{ id: "personal", label: "Personal" },
	] },
	{ id: "archive", label: "Archive", path: "/custom/archive", children: [
		{ id: "y2025", label: "2025" },
	] },
	{ id: "trash", label: "Trash" },
];

function withHistory(t, options) {
	const env = installFakeHistory(options);
	t.after(() => env.stop());
	return env;
}
function listen(t, target, type) {
	const seen = [];
	const fn = (e) => seen.push(e);
	target.addEventListener(type, fn);
	t.after(() => target.removeEventListener(type, fn));
	return seen;
}
async function tracked(props = {}) {
	const el = document.createElement("dj-tree");
	el.nodes = MAIL();
	el.track = true;
	el.basePath = "/mail";
	for (const [k, v] of Object.entries(props)) el[k] = v;
	document.body.appendChild(el);
	await settled(el);
	await tick();
	await settled(el);
	return el;
}
const rowClick = async (el, id, init = {}) => {
	const event = new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, ...init });
	rowById(el, id).dispatchEvent(event);
	await settled(el); await tick();
	return event;
};

test("track: selecting a node dispatches dj-select and then dj-navigate with a derived path, label and trail", async (t) => {
	withHistory(t);
	const el = await tracked({ expanded: ["inbox"] });
	const order = [];
	el.addEventListener("dj-select", (e) => order.push(["dj-select", e.detail]));
	el.addEventListener("dj-navigate", (e) => order.push(["dj-navigate", e.detail]));
	await rowClick(el, "work");
	assert.deepEqual(order, [
		["dj-select", { id: "work" }],
		["dj-navigate", {
			path: "/mail/inbox/work",
			label: "Work",
			trail: [{ path: "/mail/inbox", label: "Inbox" }, { path: "/mail/inbox/work", label: "Work" }],
		}],
	]);
	el.remove();
});

test("track: an explicit node path wins for that node; its children still derive from ids", async (t) => {
	withHistory(t);
	const el = await tracked({ expanded: ["archive"] });
	const navigates = listen(t, el, "dj-navigate");
	await rowClick(el, "archive");
	await rowClick(el, "y2025");
	assert.deepEqual(navigates.map((e) => e.detail.path), ["/custom/archive", "/mail/archive/y2025"]);
	assert.deepEqual(navigates[1].detail.trail, [
		{ path: "/custom/archive", label: "Archive" },
		{ path: "/mail/archive/y2025", label: "2025" },
	]);
	el.remove();
});

test("track: keyboard selection navigates too, and a trailing slash on base-path is ignored", async (t) => {
	withHistory(t);
	const el = await tracked({ basePath: "/mail/" });
	const navigates = listen(t, el, "dj-navigate");
	await press(el, "trash", "Enter");
	assert.deepEqual(navigates.map((e) => e.detail.path), ["/mail/trash"]);
	el.remove();
});

test("without track, selecting emits no dj-navigate", async (t) => {
	withHistory(t);
	const el = await tracked({ track: false });
	const navigates = listen(t, el, "dj-navigate");
	await rowClick(el, "trash");
	assert.equal(navigates.length, 0);
	el.remove();
});

test("track: the whole path works through history, and Back, Forward reselect the right node", async (t) => {
	const { h } = withHistory(t);
	const el = await tracked({ expanded: ["inbox", "archive"] });
	await rowClick(el, "work");
	await rowClick(el, "personal");
	await rowClick(el, "trash");
	assert.equal(h.current.path, "/mail/trash");
	assert.deepEqual(h.current.trail, [{ path: "/mail/trash", label: "Trash" }]);
	h.back();
	await settled(el); await tick();
	assert.equal(el.value, "personal");
	h.back();
	await settled(el); await tick();
	assert.equal(el.value, "work");
	h.forward();
	await settled(el); await tick();
	assert.equal(el.value, "personal");
	el.remove();
});

test("track: a deep-link location selects and expands the node, emits dj-expand-change, and never dispatches dj-navigate", async (t) => {
	withHistory(t, { window: { url: "http://example.test/mail/inbox/work" } });
	const navigates = listen(t, document, "dj-navigate");
	const el = document.createElement("dj-tree");
	el.nodes = MAIL();
	el.track = true;
	el.basePath = "/mail";
	const expands = listen(t, el, "dj-expand-change");
	document.body.appendChild(el);
	await settled(el); await tick(); await settled(el);
	assert.equal(el.value, "work");
	assert.deepEqual(el.expanded, ["inbox"]);
	assert.deepEqual(expands.map((e) => e.detail), [{ id: "inbox", expanded: true, expandedIds: ["inbox"] }]);
	assert.deepEqual(visibleIds(el), ["inbox", "work", "personal", "archive", "trash"]);
	assert.deepEqual(tabbable(el), ["work"]);
	assert.equal(navigates.length, 0, "location sync must not dispatch dj-navigate");
	el.remove();
});

test("track: a go to a nested node while mounted expands every closed ancestor", async (t) => {
	const { h } = withHistory(t);
	const el = document.createElement("dj-tree");
	el.nodes = [{ id: "a", label: "A", children: [{ id: "b", label: "B", children: [{ id: "c", label: "C" }] }] }];
	el.track = true;
	el.basePath = "/x";
	document.body.appendChild(el);
	await settled(el); await tick();
	const navigates = listen(t, document, "dj-navigate");
	const expands = listen(t, el, "dj-expand-change");
	h.go("/x/a/b/c");
	await settled(el); await tick(); await settled(el);
	assert.equal(el.value, "c");
	assert.deepEqual(el.expanded, ["a", "b"]);
	assert.deepEqual(expands.map((e) => e.detail.id), ["a", "b"]);
	assert.equal(navigates.length, 0);
	el.remove();
});

test("track: a location below a node (its /quiz leaf is not in the tree) matches the longest ancestor path", async (t) => {
	const { h } = withHistory(t);
	const el = await tracked({ expanded: ["inbox"] });
	h.go("/mail/inbox/work/quiz");
	await settled(el); await tick();
	assert.equal(el.value, "work");
	h.go("/mail/inbox/quiz?x=1#top");
	await settled(el); await tick();
	assert.equal(el.value, "inbox", "query and hash are ignored, and the nearest node above wins");
	el.remove();
});

test("track: a location that matches no node leaves the selection alone", async (t) => {
	const { h } = withHistory(t);
	const el = await tracked({ value: "trash" });
	h.go("/somewhere/else");
	await settled(el); await tick();
	assert.equal(el.value, "trash");
	el.remove();
});

test("track: annotate is called once, with the matched node's trail, and only when the location has none", async (t) => {
	const { h } = withHistory(t, { window: { url: "http://example.test/mail/inbox/work" } });
	const annotate = t.mock.method(h, "annotate");
	const el = await tracked();
	await tick();
	assert.equal(annotate.mock.callCount(), 1, "a deep link has no trail");
	assert.deepEqual(annotate.mock.calls[0].arguments[0], {
		trail: [{ path: "/mail/inbox", label: "Inbox" }, { path: "/mail/inbox/work", label: "Work" }],
	});
	assert.deepEqual(h.current.trail, annotate.mock.calls[0].arguments[0].trail, "and the re-published location now carries it");
	await rowClick(el, "trash"); // the click brings its own trail
	h.back();
	h.forward();
	await tick();
	assert.equal(annotate.mock.callCount(), 1, "no further annotate once a trail is present");
	el.remove();
});

test("track: ctrl-click and meta-click open the row's href in a new tab and do not select or navigate", async (t) => {
	withHistory(t, { base: "/acme", window: { url: "http://example.test/acme/" } });
	const open = t.mock.method(window, "open", () => null);
	const el = await tracked({ expanded: ["inbox"] });
	const seen = [...listen(t, el, "dj-select"), ...listen(t, document, "dj-navigate")];
	const sel = listen(t, el, "dj-select");
	const nav = listen(t, document, "dj-navigate");
	const event = await rowClick(el, "work", { ctrlKey: true });
	await rowClick(el, "personal", { metaKey: true });
	assert.equal(event.defaultPrevented, true);
	assert.deepEqual(open.mock.calls.map((c) => c.arguments), [
		["/acme/mail/inbox/work", "_blank", "noopener"],
		["/acme/mail/inbox/personal", "_blank", "noopener"],
	]);
	assert.equal(sel.length + nav.length + seen.length, 0);
	assert.equal(el.value, "");
	el.remove();
});

test("track: middle-click (auxclick) opens a new tab too; other auxclicks do nothing", async (t) => {
	withHistory(t);
	const open = t.mock.method(window, "open", () => null);
	const el = await tracked({ expanded: ["inbox"] });
	const nav = listen(t, document, "dj-navigate");
	rowById(el, "work").dispatchEvent(new MouseEvent("auxclick", { bubbles: true, composed: true, cancelable: true, button: 1 }));
	rowById(el, "personal").dispatchEvent(new MouseEvent("auxclick", { bubbles: true, composed: true, cancelable: true, button: 2 }));
	assert.deepEqual(open.mock.calls.map((c) => c.arguments), [["/mail/inbox/work", "_blank", "noopener"]]);
	assert.equal(nav.length, 0);
	el.remove();
});

test("without track, ctrl-click still just selects", async (t) => {
	withHistory(t);
	const open = t.mock.method(window, "open", () => null);
	const el = await tracked({ track: false });
	await rowClick(el, "trash", { ctrlKey: true });
	assert.equal(open.mock.callCount(), 0);
	assert.equal(el.value, "trash");
	el.remove();
});

test("track: with no history installed it still emits dj-navigate and nothing throws; installing later starts the sync", async (t) => {
	const el = await tracked();
	const nav = listen(t, document, "dj-navigate");
	await rowClick(el, "trash");
	assert.equal(nav.length, 1);
	const { h } = withHistory(t, { window: { url: "http://example.test/mail/inbox/personal" } });
	await tick(); await settled(el); await tick();
	assert.equal(el.value, "personal");
	assert.ok(el.expanded.includes("inbox"));
	assert.equal(h.current.path, "/mail/inbox/personal");
	el.remove();
});

test("track: replacing nodes rebuilds the path index", async (t) => {
	const { h } = withHistory(t, { window: { url: "http://example.test/mail/late/leaf" } });
	const el = await tracked();
	assert.equal(el.value, "", "nothing matches yet");
	el.nodes = [{ id: "late", label: "Late", children: [{ id: "leaf", label: "Leaf" }] }];
	await settled(el); await tick(); await settled(el);
	assert.equal(el.value, "leaf");
	assert.deepEqual(el.expanded, ["late"]);
	assert.ok(h.current);
	el.remove();
});

test("track: a removed tree stops following the location", async (t) => {
	const { h } = withHistory(t);
	const el = await tracked();
	el.remove();
	const before = el.value;
	h.go("/mail/trash");
	await tick();
	assert.equal(el.value, before);
});
