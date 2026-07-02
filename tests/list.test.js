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
