// Focus-trap tests (review task 2.3): focusable detection now uses each
// component's `static focusable` marker instead of a hand-listed selector, so
// controls the old list missed (e.g. dj-slider) are discovered, and an empty
// focusable set no longer swallows Tab (which used to trap focus nowhere).
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
	isFocusable,
	firstFocusable,
	collectFocusables,
	trapTabKey,
} from "../packages/dojo-element/dist/index.js";
import "../packages/slider/dist/index.js"; // dj-slider: marked focusable, absent from the old hand-list
import "../packages/card/dist/index.js"; // dj-card: a display component, not focusable

function tabEvent(shiftKey = false) {
	let prevented = false;
	return {
		key: "Tab",
		shiftKey,
		preventDefault() {
			prevented = true;
		},
		get prevented() {
			return prevented;
		},
	};
}

test("isFocusable: a marked dj- control is focusable, a display component is not", () => {
	const slider = document.createElement("dj-slider");
	const card = document.createElement("dj-card");
	document.body.append(slider, card);
	assert.equal(isFocusable(slider), true);
	assert.equal(isFocusable(card), false);
});

test("collectFocusables discovers a slotted dj-slider the old hand-list missed", () => {
	const host = document.createElement("div");
	const shadow = host.attachShadow({ mode: "open" });
	const closeBtn = document.createElement("button"); // the overlay's own shadow control
	shadow.appendChild(closeBtn);
	const slider = document.createElement("dj-slider"); // slotted content
	host.appendChild(slider);
	document.body.appendChild(host);

	const list = collectFocusables(shadow, host);
	assert.ok(list.includes(closeBtn), "native shadow control is collected");
	assert.ok(list.includes(slider), "marked dj-slider is collected (was invisible to the old selector)");
});

test("a disabled marked control is not focusable", () => {
	const host = document.createElement("div");
	const slider = document.createElement("dj-slider");
	slider.setAttribute("disabled", "");
	host.appendChild(slider);
	document.body.appendChild(host);
	assert.equal(firstFocusable(host), null);
});

test("trapTabKey with no focusables does NOT swallow Tab (focus can leave)", () => {
	const ev = tabEvent();
	trapTabKey(ev, []);
	assert.equal(ev.prevented, false);
});

test("trapTabKey wraps from the last focusable back to the first", () => {
	const host = document.createElement("div");
	const b1 = document.createElement("button");
	const b2 = document.createElement("button");
	host.append(b1, b2);
	document.body.appendChild(host);
	b2.focus();
	const ev = tabEvent(false);
	trapTabKey(ev, [b1, b2]);
	assert.equal(document.activeElement, b1, "focus wrapped to the first");
	assert.equal(ev.prevented, true);
});

test("trapTabKey (shift) wraps from the first focusable to the last", () => {
	const host = document.createElement("div");
	const b1 = document.createElement("button");
	const b2 = document.createElement("button");
	host.append(b1, b2);
	document.body.appendChild(host);
	b1.focus();
	const ev = tabEvent(true);
	trapTabKey(ev, [b1, b2]);
	assert.equal(document.activeElement, b2, "focus wrapped to the last");
	assert.equal(ev.prevented, true);
});
