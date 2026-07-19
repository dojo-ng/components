// dj-dropdown (spec task DD): APG menu-button glue over dj-popup + dj-list. Toggle + events;
// ArrowDown opens and activates the first item; the list's change closes + returns focus;
// Escape (dj-popup dj-close) closes; slotted-trigger ARIA reconciles; non-list content skips
// list steering without errors.
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/button/dist/index.js";
import "../packages/list/dist/index.js";
import "../packages/dropdown/dist/index.js";

const raf = () => new Promise((r) => requestAnimationFrame(() => r()));

async function makeDropdown({ listContent = true } = {}) {
	const dd = document.createElement("dj-dropdown");
	const btn = document.createElement("dj-button");
	btn.slot = "trigger";
	btn.textContent = "Actions";
	dd.appendChild(btn);

	let content;
	if (listContent) {
		content = document.createElement("dj-list");
		content.options = [
			{ value: "a", label: "A" },
			{ value: "b", label: "B" },
		];
	} else {
		content = document.createElement("div");
		content.textContent = "free panel";
	}
	dd.appendChild(content);
	document.body.appendChild(dd);
	await dd.updateComplete;
	if (content.updateComplete) await content.updateComplete;
	await settled(dd);
	return { dd, btn, content };
}

test("click toggles open/close and emits dj-open / dj-close", async () => {
	const { dd, btn } = await makeDropdown();
	let opens = 0, closes = 0;
	dd.addEventListener("dj-open", () => opens++);
	dd.addEventListener("dj-close", () => closes++);

	btn.click();
	await settled(dd);
	assert.equal(dd.open, true);
	assert.equal(opens, 1);

	btn.click();
	await settled(dd);
	assert.equal(dd.open, false);
	assert.equal(closes, 1);
});

test("ArrowDown on the trigger opens and activates the first item", async () => {
	const { dd, btn, content } = await makeDropdown();
	btn.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
	await settled(dd);
	await raf();
	assert.equal(dd.open, true, "opened");
	assert.equal(content.menu, true, "list switched to menu mode");
	assert.equal(content.activeIndex, 0, "first item activated");
});

test("choosing an item (list change) closes and clears aria-expanded", async () => {
	const { dd, content } = await makeDropdown();
	dd.open = true;
	await settled(dd);
	content.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
	await settled(dd);
	assert.equal(dd.open, false, "selection closes the menu");
	const trigger = dd.querySelector('[slot="trigger"]');
	assert.equal(trigger.getAttribute("aria-expanded"), "false");
});

test("Escape (dj-popup dj-close) closes the dropdown", async () => {
	const { dd } = await makeDropdown();
	dd.open = true;
	await settled(dd);
	const popup = dd.renderRoot.querySelector("dj-popup");
	popup.dispatchEvent(new CustomEvent("dj-close", { bubbles: true, composed: true }));
	await settled(dd);
	assert.equal(dd.open, false);
});

test("slotted trigger ARIA reconciles on slotchange and open state", async () => {
	const { dd, btn } = await makeDropdown();
	assert.equal(btn.getAttribute("aria-haspopup"), "menu", "list content => haspopup menu");
	assert.equal(btn.getAttribute("aria-expanded"), "false");
	dd.open = true;
	await settled(dd);
	assert.equal(btn.getAttribute("aria-expanded"), "true");
});

test("non-list content: opens without steering and without error", async () => {
	const { dd, btn } = await makeDropdown({ listContent: false });
	assert.equal(btn.getAttribute("aria-haspopup"), "true", "non-menu content => haspopup true");
	btn.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
	await settled(dd);
	await raf();
	assert.equal(dd.open, true, "still opens as a plain panel");
});
