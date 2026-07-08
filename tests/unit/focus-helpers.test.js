// @vitest-environment happy-dom
//
// Pure list-walk logic of the focus helpers: which elements count as focus stops,
// how they're collected and ordered, and composed-tree containment. This needs DOM
// structure but NOT layout or real focus timing — happy-dom (no layout engine) is
// enough. Real Tab/focus-visible/wrap behavior is the @web/test-runner layer's job.
import { test, expect, beforeEach } from "vitest";
import {
	isFocusable,
	firstFocusable,
	collectFocusables,
	isFocusWithin,
} from "../../packages/dojo-element/dist/focus-trap.js";

// A dj- element that declares itself a focus stop, and one that doesn't. The trap
// discovers custom-element focusability through this `static focusable` marker.
class MarkedFocusable extends HTMLElement {
	static focusable = true;
}
class Unmarked extends HTMLElement {}
if (!customElements.get("dj-unit-mark")) customElements.define("dj-unit-mark", MarkedFocusable);
if (!customElements.get("dj-unit-plain")) customElements.define("dj-unit-plain", Unmarked);

beforeEach(() => {
	document.body.innerHTML = "";
});

test("isFocusable: native focusables yes, non-focusables and -1 tabindex no", () => {
	const btn = document.createElement("button");
	const link = document.createElement("a");
	link.setAttribute("href", "#");
	const input = document.createElement("input");
	const disabledInput = document.createElement("input");
	disabledInput.setAttribute("disabled", "");
	const div = document.createElement("div");
	const negTab = document.createElement("div");
	negTab.setAttribute("tabindex", "-1");
	const posTab = document.createElement("div");
	posTab.setAttribute("tabindex", "0");
	document.body.append(btn, link, input, disabledInput, div, negTab, posTab);

	expect(isFocusable(btn)).toBe(true);
	expect(isFocusable(link)).toBe(true);
	expect(isFocusable(input)).toBe(true);
	expect(isFocusable(disabledInput)).toBe(false);
	expect(isFocusable(div)).toBe(false);
	expect(isFocusable(negTab)).toBe(false);
	expect(isFocusable(posTab)).toBe(true);
});

test("isFocusable: marked dj- element yes, unmarked no, disabled overrides the marker", () => {
	const marked = document.createElement("dj-unit-mark");
	const plain = document.createElement("dj-unit-plain");
	const markedDisabled = document.createElement("dj-unit-mark");
	markedDisabled.setAttribute("disabled", "");
	document.body.append(marked, plain, markedDisabled);

	expect(isFocusable(marked)).toBe(true);
	expect(isFocusable(plain)).toBe(false);
	expect(isFocusable(markedDisabled)).toBe(false);
});

test("firstFocusable returns the first focus stop in document order", () => {
	const wrap = document.createElement("div");
	wrap.innerHTML = `<div></div><span></span><button id="b">b</button><input id="i" />`;
	document.body.append(wrap);
	expect(firstFocusable(wrap)?.id).toBe("b");
});

test("firstFocusable returns null when nothing is focusable", () => {
	const wrap = document.createElement("div");
	wrap.innerHTML = `<div></div><span></span><p>text</p>`;
	document.body.append(wrap);
	expect(firstFocusable(wrap)).toBeNull();
});

test("collectFocusables lists shadow controls before host light-DOM content", () => {
	const host = document.createElement("div");
	const shadow = host.attachShadow({ mode: "open" });
	const shadowBtn = document.createElement("button");
	shadowBtn.id = "shadow";
	shadow.append(shadowBtn);
	const hostInput = document.createElement("input");
	hostInput.id = "host";
	host.append(hostInput);
	document.body.append(host);

	const ids = collectFocusables(shadow, host).map((el) => el.id);
	expect(ids).toEqual(["shadow", "host"]);
});

test("isFocusWithin is true for the host of the focused element, false otherwise", () => {
	const host = document.createElement("div");
	const inner = document.createElement("button");
	host.append(inner);
	const outside = document.createElement("button");
	document.body.append(host, outside);

	inner.focus();
	expect(isFocusWithin(host)).toBe(true);
	outside.focus();
	expect(isFocusWithin(host)).toBe(false);
});
