// The shared overlay keyboard stack (CB25) and the default-true boolean converter (CB24), in
// happy-dom. Real-key behavior across dialogs, selects and tooltips is in
// tests/browser/general-defects.test.js.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { pushOverlay, isTopOverlay, overlayCount, defaultTrueBoolean } from "../packages/dojo-element/dist/index.js";

const key = (name) => {
	const e = new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true });
	document.dispatchEvent(e);
	return e;
};

test("Escape goes only to the overlay pushed last", () => {
	const hits = [];
	const a = { onEscape: () => hits.push("a") };
	const b = { onEscape: () => hits.push("b") };
	const releaseA = pushOverlay(a);
	const releaseB = pushOverlay(b);
	assert.equal(isTopOverlay(b), true);
	key("Escape");
	assert.deepEqual(hits, ["b"]);
	releaseB();
	key("Escape");
	assert.deepEqual(hits, ["b", "a"]);
	releaseA();
	releaseA();
	assert.equal(overlayCount(), 0);
	key("Escape");
	assert.deepEqual(hits, ["b", "a"], "nothing registered, nothing handled");
});

test("Tab goes to the newest overlay that traps, past ones that do not", () => {
	const hits = [];
	const dialog = { onEscape: () => {}, onTab: () => hits.push("dialog") };
	const popup = { onEscape: () => {} };
	const r1 = pushOverlay(dialog);
	const r2 = pushOverlay(popup);
	key("Tab");
	assert.deepEqual(hits, ["dialog"]);
	r2(); r1();
});

test("an Escape a component already handled (defaultPrevented) is left alone", () => {
	let hit = 0;
	const release = pushOverlay({ onEscape: () => hit++ });
	const e = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
	e.preventDefault();
	document.dispatchEvent(e);
	assert.equal(hit, 0);
	release();
});

test("defaultTrueBoolean reads \"false\" as false", () => {
	const from = defaultTrueBoolean.fromAttribute;
	assert.equal(from("false"), false);
	assert.equal(from(" FALSE "), false);
	assert.equal(from(""), true);
	assert.equal(from("true"), true);
	assert.equal(from("closeable"), true);
	assert.equal(from(null), false);
	assert.equal(defaultTrueBoolean.toAttribute(true), "");
	assert.equal(defaultTrueBoolean.toAttribute(false), null);
});
