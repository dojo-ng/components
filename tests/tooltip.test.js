// dj-tooltip in happy-dom: Escape dismisses a tip shown by hover or focus (WCAG 1.4.13). Real
// hover and focus routing, and the axe pass, are in tests/browser/tooltip.test.js.
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/tooltip/dist/index.js";

async function build(props = {}) {
	const tip = document.createElement("dj-tooltip");
	Object.assign(tip, props);
	const trigger = document.createElement("button");
	trigger.textContent = "Help";
	const content = document.createElement("span");
	content.slot = "content";
	content.textContent = "Useful hint";
	tip.append(trigger, content);
	document.body.appendChild(tip);
	await settled(tip);
	return tip;
}
const hidden = (tip) => tip.shadowRoot.querySelector("[part=content]").hidden;
const key = (name) => document.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true, composed: true }));

test("hover shows the tip and Escape hides it, wherever focus is", async () => {
	const tip = await build();
	assert.equal(hidden(tip), true);
	tip.dispatchEvent(new Event("pointerenter"));
	await settled(tip);
	assert.equal(hidden(tip), false);
	key("a");
	await settled(tip);
	assert.equal(hidden(tip), false, "another key does nothing");
	key("Escape");
	await settled(tip);
	assert.equal(hidden(tip), true);
	tip.remove();
});

test("after Escape the tip comes back only when the trigger is entered again", async () => {
	const tip = await build();
	tip.dispatchEvent(new Event("pointerenter"));
	key("Escape");
	await settled(tip);
	assert.equal(hidden(tip), true);
	tip.dispatchEvent(new Event("pointerleave"));
	tip.dispatchEvent(new Event("pointerenter"));
	await settled(tip);
	assert.equal(hidden(tip), false);
	tip.remove();
});

test("Escape does not hide a tip held open with `open`", async () => {
	const tip = await build({ open: true });
	tip.dispatchEvent(new Event("pointerenter"));
	key("Escape");
	await settled(tip);
	assert.equal(hidden(tip), false);
	tip.remove();
});

test("the document keydown listener is removed when the tip hides and when the element is removed", async (t) => {
	const added = [];
	const removed = [];
	const add = document.addEventListener.bind(document);
	const remove = document.removeEventListener.bind(document);
	t.mock.method(document, "addEventListener", (type, fn, o) => { if (type === "keydown") added.push(fn); return add(type, fn, o); });
	t.mock.method(document, "removeEventListener", (type, fn, o) => { if (type === "keydown") removed.push(fn); return remove(type, fn, o); });
	const tip = await build();
	tip.dispatchEvent(new Event("pointerenter"));
	tip.dispatchEvent(new Event("pointerleave"));
	assert.ok(added.length >= 1);
	assert.ok(removed.includes(added[0]), "pointerleave removed the listener it added");
	tip.dispatchEvent(new Event("pointerenter"));
	tip.remove();
	assert.ok(removed.filter((fn) => fn === added[0]).length >= 2, "disconnect removed it again");
});
