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
});

test("Escape suppresses the popup", async () => {
	const el = make();
	await settled(el); await tick();
	el.onInput({ target: { value: "status:urgent" } });
	await settled(el); await tick();
	assert.equal(el.open, true, "popup is open");
	el.onKey({ key: "Escape" });
	assert.equal(el.open, false, "escape suppresses popup");
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
