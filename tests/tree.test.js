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
