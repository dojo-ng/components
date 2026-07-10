// Behavior tests for dj-chip-typeahead's `allow-new` free-text tag path.
//
// Note on technique: happy-dom does not deliver events to this component's Lit-bound shadow
// <input> (a listener added directly to the same node fires, but the framework binding does not),
// so the field's keydown cannot be exercised by dispatching a KeyboardEvent — this is why the repo
// has no event-dispatch tests for the composed input controls. These tests drive the key handler
// (`onKey`) directly with a synthetic event and set the `query` state the way typing would, which
// deterministically exercises the real logic. Live keyboard interaction is the CB/CT browser check.
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/chip-typeahead/dist/index.js";

const tick = async (n = 2) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };
const enterKey = () => ({ key: "Enter", preventDefault() {} });
const backspaceKey = () => ({ key: "Backspace", preventDefault() {} });

async function build(props = {}) {
	const el = document.createElement("dj-chip-typeahead");
	el.options = [{ value: "apple", label: "Apple" }, { value: "banana", label: "Banana" }];
	for (const [k, v] of Object.entries(props)) el[k] = v;
	document.body.appendChild(el);
	if (el.updateComplete) await el.updateComplete;
	await tick();
	return el;
}
async function typeThenEnter(el, text) {
	el.query = text; // what onInput would set
	await settled(el); await tick();
	el.onKey(enterKey());
	await settled(el); await tick();
}

test("registers <dj-chip-typeahead>", () => {
	assert.equal(typeof customElements.get("dj-chip-typeahead"), "function");
});

test("allow-new reflects as the `allow-new` attribute", async () => {
	const el = await build({ allowNew: true });
	assert.equal(el.hasAttribute("allow-new"), true);
});

test("allow-new: Enter on unmatched text creates a chip, clears input, emits change, joins form value", async () => {
	const el = await build({ allowNew: true, name: "tags" });
	const changes = [];
	el.addEventListener("change", (e) => changes.push(e.detail));
	await typeThenEnter(el, "urgent");
	assert.deepEqual(el.value, ["urgent"]);
	assert.equal(el.query, "", "input text cleared after commit");
	assert.deepEqual(changes.at(-1), ["urgent"], "change fired with the new value");
	assert.deepEqual(el.__formValue.getAll("tags"), ["urgent"], "form value contains the new tag");
});

test("allow-new: a highlighted popup option keeps its pick behavior (no literal created)", async () => {
	const el = await build({ allowNew: true });
	el.query = "app";
	await settled(el); await tick();
	// Simulate the popup having an active (highlighted) option: chooseActive() reports a pick.
	let chosen = 0;
	const list = el.renderRoot.querySelector("dj-list");
	assert.ok(list, "popup list element present");
	list.chooseActive = () => { chosen++; return true; };
	el.onKey(enterKey());
	await settled(el); await tick();
	assert.equal(chosen, 1, "the active option was chosen");
	assert.deepEqual(el.value, [], "no literal chip created when an option is active");
});

test("without allow-new: Enter on unmatched text does nothing", async () => {
	const el = await build();
	const changes = [];
	el.addEventListener("change", (e) => changes.push(e.detail));
	await typeThenEnter(el, "urgent");
	assert.deepEqual(el.value, [], "no chip created");
	assert.equal(changes.length, 0, "no change emitted");
	assert.equal(el.query, "urgent", "text left in place");
});

test("allow-new: empty/whitespace text creates nothing", async () => {
	const el = await build({ allowNew: true });
	await typeThenEnter(el, "   ");
	assert.deepEqual(el.value, []);
});

test("allow-new + duplicates=false: a repeat literal is blocked", async () => {
	const el = await build({ allowNew: true });
	await typeThenEnter(el, "foo");
	assert.deepEqual(el.value, ["foo"]);
	await typeThenEnter(el, "foo");
	assert.deepEqual(el.value, ["foo"], "duplicate literal not added");
});

test("allow-new + duplicates=true: the same literal can repeat", async () => {
	const el = await build({ allowNew: true, duplicates: true });
	await typeThenEnter(el, "foo");
	await typeThenEnter(el, "foo");
	assert.deepEqual(el.value, ["foo", "foo"]);
});

test("regression: Backspace on empty input removes the last chip", async () => {
	const el = await build({ allowNew: true });
	await typeThenEnter(el, "one");
	await typeThenEnter(el, "two");
	assert.deepEqual(el.value, ["one", "two"]);
	el.query = ""; // caret at start, no text
	await settled(el);
	el.onKey(backspaceKey());
	await settled(el); await tick();
	assert.deepEqual(el.value, ["one"], "last chip removed");
});
