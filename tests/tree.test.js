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
