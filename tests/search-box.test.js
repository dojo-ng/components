// Behavior tests for <dj-search-box>: rendering via setQuery, clear, query getter, and keyboard
// handling — all under node --test + happy-dom. Technique: drive component methods directly
// (onInput, onKey) rather than dispatching events through happy-dom, following the chip-typeahead
// pattern that proved necessary when Lit-bound shadow handlers can't be exercised via events.
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/search-box/dist/index.js";

const tick = async (n = 2) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };
const enterKey = () => ({ key: "Enter", preventDefault() {} });
const backspaceKey = () => ({ key: "Backspace", preventDefault() {} });

function make(props = {}) {
	const el = document.createElement("dj-search-box");
	el.keys = [{ key: "status", label: "Status", options: [{ value: "urgent", label: "Urgent" }, { value: "normal", label: "Normal" }] }];
	Object.assign(el, props);
	document.body.appendChild(el);
	return el;
}

test("registers <dj-search-box>", () => {
	assert.equal(typeof customElements.get("dj-search-box"), "function");
});

test("setQuery renders chips and text", async () => {
	const el = make();
	await settled(el); await tick();
	el.setQuery({ text: "hello world", tokens: [{ key: "status", value: "urgent" }] });
	await settled(el); await tick();
	assert.equal(el.text, "hello world");
	assert.equal(el.tokens.length, 1);
});

test("setQuery does not emit dj-query-change", async () => {
	const el = make();
	await settled(el); await tick();
	let count = 0;
	el.addEventListener("dj-query-change", () => count++);
	el.setQuery({ text: "x", tokens: [{ key: "from", value: "a" }] });
	assert.equal(count, 0, "setQuery emits nothing");
});

test("clear() resets state and emits dj-query-change", async () => {
	const el = make();
	await settled(el); await tick();
	let count = 0;
	el.addEventListener("dj-query-change", () => count++);
	el.setQuery({ text: "hello", tokens: [{ key: "status", value: "urgent" }] });
	await settled(el);
	el.clear();
	assert.equal(el.text, "");
	assert.equal(el.tokens.length, 0);
	assert.ok(count > 0, "clear emitted dj-query-change");
});

test("query property getter excludes tail token from tokens array", async () => {
	const el = make();
	await settled(el); await tick();
	el.text = "hello status:waiting";
	await settled(el);
	const q = el.query;
	assert.equal(q.tokens.length, 0, "tail not committed to query.tokens");
	assert.ok(q.text.includes("hello"), "free text in query");
});

test("key:value with options opens suggestion popup", async () => {
	const el = make();
	await settled(el); await tick();
	el.onInput({ target: { value: "status:ur" } });
	await settled(el); await tick();
	assert.equal(el.open, true, "popup opens for configured key with suggestions");
});

test("typing free text (no config) emits dj-query-change", async () => {
	const el = make({ keys: [{ key: "from", label: "From" }] });
	await settled(el); await tick();
	let count = 0;
	el.addEventListener("dj-query-change", () => count++);
	el.onInput({ target: { value: "hello hello hello" } });
	await settled(el); await tick();
	assert.ok(count > 0, "free text typed via onInput emits dj-query-change");
});

test("Backspace on empty input removes last chip", async () => {
	const el = make();
	await settled(el); await tick();
	el.setQuery({ text: "", tokens: [{ key: "status", value: "urgent" }, { key: "from", value: "a" }] });
	await settled(el); await tick();
	let count = 0;
	el.addEventListener("dj-query-change", () => count++);
	Object.defineProperty(el.input, "selectionStart", { get() { return 0; }, configurable: true });
	Object.defineProperty(el.input, "selectionEnd", { get() { return 0; }, configurable: true });
	el.onKey(backspaceKey());
	await settled(el); await tick();
	assert.equal(el.tokens.length, 1, "one chip removed");
	assert.equal(count, 1, "removal emitted one dj-query-change");
});

test("picking a suggestion commits a chip and emits one dj-query-change", async () => {
	const el = make();
	await settled(el); await tick();
	el.onInput({ target: { value: "status:ur" } });
	await settled(el); await tick();
	assert.equal(el.open, true, "token mode with options opens the popup");
	let count = 0;
	let last;
	el.addEventListener("dj-query-change", (e) => { count++; last = e.detail.query; });
	// Drive the selection handler the way dj-list's change would (house pattern: happy-dom
	// cannot deliver events through Lit bindings; the real pick is SB5's browser check).
	el.onSelect({ stopPropagation() {}, target: { value: "urgent" } });
	await settled(el); await tick();
	assert.equal(count, 1, "one dj-query-change");
	assert.deepEqual(last.tokens, [{ key: "status", value: "urgent" }], "token in query.tokens");
	assert.equal(el.tokens.length, 1, "chip committed");
	assert.equal(el.open, false, "popup closed after pick");
	assert.equal(el.text, "", "in-progress token text consumed");
});

test("an unconfigured key never chips", async () => {
	const el = make();
	await settled(el); await tick();
	el.onInput({ target: { value: "note:hi" } });
	await settled(el); await tick();
	assert.equal(el.open, false, "no popup for an unconfigured key");
	let search;
	el.addEventListener("dj-search", (e) => { search = e.detail.query; });
	el.onKey(enterKey());
	assert.equal(el.tokens.length, 0, "no chip");
	assert.deepEqual(search, { text: "note:hi", tokens: [] }, "stays plain text in the query");
});

test("Enter with free text emits dj-search with { text, tokens }", async () => {
	const el = make();
	await settled(el); await tick();
	el.setQuery({ text: "hello", tokens: [{ key: "status", value: "urgent" }] });
	await settled(el); await tick();
	let search;
	el.addEventListener("dj-search", (e) => { search = e.detail.query; });
	el.onKey(enterKey());
	assert.equal(search.text, "hello");
	assert.deepEqual(search.tokens, [{ key: "status", value: "urgent" }]);
});

test("closing a chip removes its token and emits", async () => {
	const el = make();
	await settled(el); await tick();
	el.setQuery({ text: "", tokens: [{ key: "status", value: "urgent" }, { key: "status", value: "normal" }] });
	await settled(el); await tick();
	let count = 0;
	el.addEventListener("dj-query-change", () => count++);
	const chips = el.renderRoot.querySelectorAll("dj-chip");
	assert.equal(chips.length, 2, "two chips rendered");
	chips[0].dispatchEvent(new CustomEvent("dj-close"));
	await settled(el); await tick();
	assert.equal(el.tokens.length, 1, "closed chip's token removed");
	assert.equal(el.tokens[0].value, "normal", "the right token remains");
	assert.equal(count, 1, "removal emitted one dj-query-change");
});

test("Escape suppresses the popup", async () => {
	const el = make();
	await settled(el); await tick();
	el.onInput({ target: { value: "status:urgent" } });
	await settled(el); await tick();
	assert.equal(el.open, true, "popup is open");
	el.onKey({ key: "Escape" });
	assert.equal(el.open, false, "escape suppresses popup");
	assert.equal(el.tokens.length, 0, "nothing was committed");
});

test("Enter with dropdown open → picks active via dj-list", async () => {
	const el = make();
	await settled(el); await tick();
	el.onInput({ target: { value: "status:u" } });
	await settled(el); await tick();
	assert.equal(el.open, true, "popup is open");
	let picked = false;
	const list = el.renderRoot.querySelector("dj-list");
	list.chooseActive = () => { picked = true; return true; };
	el.onKey(enterKey());
	await settled(el); await tick();
	assert.ok(picked, "Enter on open popup calls chooseActive");
});
