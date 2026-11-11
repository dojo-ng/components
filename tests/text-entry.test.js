// isTextEntryTarget (GA1): which key targets a composite widget must leave alone. Real keys in a
// grid filter and a board card are in tests/browser/data-grid-keyboard.test.js and board.test.js.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { isTextEntryTarget } from "../packages/dojo-element/dist/index.js";

function keyFrom(el) {
	let hit;
	document.body.addEventListener("keydown", (e) => { hit = isTextEntryTarget(e); }, { once: true });
	el.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, composed: true }));
	return hit;
}
function make(html) {
	document.body.innerHTML = html;
	return document.body.firstElementChild;
}

test("text inputs, textarea, select, and text roles count as text entry", () => {
	for (const html of ['<input>', '<input type="search">', '<input type="number">', "<textarea></textarea>", "<select></select>",
		'<div role="textbox"></div>', '<div role="searchbox"></div>', '<div role="combobox"></div>']) {
		assert.equal(keyFrom(make(html)), true, html);
	}
});

test("checkboxes, radios, buttons, and plain elements do not", () => {
	for (const html of ['<input type="checkbox">', '<input type="radio">', '<input type="button">', "<button></button>", '<div role="row"></div>', "<span></span>"]) {
		assert.equal(keyFrom(make(html)), false, html);
	}
});

test("reads the composed target, so an input inside a shadow root counts", () => {
	const host = make("<div></div>");
	const input = host.attachShadow({ mode: "open" }).appendChild(document.createElement("input"));
	assert.equal(keyFrom(input), true);
});
