// Behavior smoke for dj-list: click-to-select and active-descendant keyboard
// selection (ArrowDown to move, Enter to select), with the change event.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/list/dist/index.js";

const OPTIONS = [
	{ value: "a", label: "A" },
	{ value: "b", label: "B" },
	{ value: "c", label: "C" },
];

test("clicking an item selects it and emits change", async () => {
	const el = await mount("dj-list", { options: OPTIONS });
	let changes = 0;
	el.addEventListener("change", () => changes++);
	const items = [...el.renderRoot.querySelectorAll('[part="item"]')];
	assert.equal(items.length, 3);
	items[1].click();
	assert.equal(el.value, "b");
	assert.equal(changes, 1);
});

test("keyboard: ArrowDown moves the active item, Enter selects it", async () => {
	const el = await mount("dj-list", { options: OPTIONS });
	let changes = 0;
	el.addEventListener("change", () => changes++);
	const list = el.renderRoot.querySelector(".list");
	const key = (k) => list.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
	key("ArrowDown"); // active → index 0 (a)
	await settled(el);
	key("ArrowDown"); // active → index 1 (b)
	await settled(el);
	key("Enter"); // select active
	assert.equal(el.value, "b");
	assert.equal(changes, 1);
});

// --- MN1: public active-item API (moveActive / activateFirst / chooseActive) ---

test("activateFirst + chooseActive selects the first non-disabled value, one change", async () => {
	const el = await mount("dj-list", { options: OPTIONS });
	let changes = 0;
	el.addEventListener("change", () => changes++);
	el.activateFirst();
	assert.equal(el.chooseActive(), true);
	assert.equal(el.value, "a");
	assert.equal(changes, 1);
});

test("moveActive skips disabled options and wraps", async () => {
	const el = await mount("dj-list", {
		options: [
			{ value: "a", label: "A" },
			{ value: "b", label: "B", disabled: true },
			{ value: "c", label: "C" },
		],
	});
	el.activateFirst(); // a
	el.moveActive(1); // skips disabled b -> c
	assert.equal(el.chooseActive(), true);
	assert.equal(el.value, "c");
	el.moveActive(1); // wraps -> a
	assert.equal(el.chooseActive(), true);
	assert.equal(el.value, "a");
	el.moveActive(-1); // backward wraps -> c
	assert.equal(el.chooseActive(), true);
	assert.equal(el.value, "c");
});

test("chooseActive with no active option returns false and fires nothing", async () => {
	const el = await mount("dj-list", { options: OPTIONS });
	let changes = 0;
	el.addEventListener("change", () => changes++);
	assert.equal(el.chooseActive(), false);
	assert.equal(changes, 0);
});

// --- K10: reorderable (progressive enhancement) ---
// happy-dom has no layout; stub rects and drive the sequence. Real drag/geometry is K11's browser check.
function rectFor({ top = 0, bottom = 0, left = 0, right = 0 }) {
	return { top, bottom, left, right, width: right - left, height: bottom - top, x: left, y: top };
}
function stubRect(el, r) { el.getBoundingClientRect = () => rectFor(r); }
function ptr(type, x, y) { return new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 1 }); }

test("reorderable: a pointer drag emits dj-reorder with from/to indices", async () => {
	const el = await mount("dj-list", { options: OPTIONS, reorderable: true });
	await settled(el);
	const list = el.renderRoot.querySelector(".list");
	stubRect(list, { left: 0, right: 100, top: 0, bottom: 200 });
	const items = [...el.renderRoot.querySelectorAll('[part="item"]')];
	items.forEach((it, i) => stubRect(it, { left: 0, right: 100, top: i * 20, bottom: i * 20 + 20 }));
	let detail = null;
	el.addEventListener("dj-reorder", (e) => { detail = e.detail; });
	items[0].dispatchEvent(ptr("pointerdown", 50, 5)); // grab "a"
	window.dispatchEvent(ptr("pointermove", 50, 35)); // past b's center (30)
	window.dispatchEvent(ptr("pointerup", 50, 35));
	assert.ok(detail, "dj-reorder fired");
	assert.equal(detail.key, "a");
	assert.equal(detail.fromIndex, 0);
	assert.equal(detail.toIndex, 1);
});

test("reorderable: keyboard grab → arrow → drop emits dj-reorder", async () => {
	const el = await mount("dj-list", { options: OPTIONS, reorderable: true });
	await settled(el);
	const list = el.renderRoot.querySelector(".list");
	const key = (k) => list.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
	list.focus();
	key("ArrowDown"); // activate first option
	await settled(el); // aria-activedescendant → opt-0
	let detail = null;
	el.addEventListener("dj-reorder", (e) => { detail = e.detail; });
	key(" "); // grab
	key("ArrowDown"); // move down one
	key(" "); // drop
	assert.ok(detail, "dj-reorder fired from keyboard");
	assert.equal(detail.key, "a");
	assert.equal(detail.fromIndex, 0);
	assert.equal(detail.toIndex, 1);
});

test("reorderable: keyboard grab marks the picked-up item, clears on cancel", async () => {
	const el = await mount("dj-list", { options: OPTIONS, reorderable: true });
	await settled(el);
	const list = el.renderRoot.querySelector(".list");
	const key = (k) => list.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
	list.focus();
	key("ArrowDown"); // activate first option
	await settled(el);
	key(" "); // grab
	await settled(el);
	const grabbed = el.renderRoot.querySelector('[part="item"][aria-grabbed="true"]');
	assert.ok(grabbed, "the grabbed item is marked");
	assert.equal(grabbed.dataset.key, "a");
	key("Escape"); // cancel
	await settled(el);
	assert.equal(el.renderRoot.querySelector('[aria-grabbed="true"]'), null, "grab marker cleared on cancel");
});

test("non-reorderable list: Space still selects and no dj-reorder fires", async () => {
	const el = await mount("dj-list", { options: OPTIONS });
	await settled(el);
	const list = el.renderRoot.querySelector(".list");
	const key = (k) => list.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
	let reorders = 0;
	el.addEventListener("dj-reorder", () => reorders++);
	list.focus();
	key("ArrowDown");
	await settled(el);
	key(" "); // selects in a normal list
	assert.equal(el.value, "a");
	assert.equal(reorders, 0);
});
