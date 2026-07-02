// Behavior smoke for dj-popup's reposition-while-open (review task 2.1): an open
// popup re-aligns to its anchor on scroll/resize, throttled to one layout pass
// per animation frame, and stops watching on close and on disconnect.
//
// happy-dom does no layout, so getBoundingClientRect is all zeros — we don't
// assert coordinates, only that the reposition PATH runs (and stops). The spy
// replaces the (TS-private, runtime-accessible) reposition method.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/popup/dist/index.js";

const raf = () => new Promise((r) => requestAnimationFrame(() => r()));
const frames = async (n = 3) => {
	for (let i = 0; i < n; i++) await raf();
};

async function openPopup() {
	const anchor = document.createElement("div");
	document.body.appendChild(anchor);
	const popup = await mount("dj-popup", { anchor, open: true });
	await frames(); // drain the open-time reposition + any ResizeObserver initial callback
	return popup;
}

/** Replace reposition with a counting spy; returns a getter for the count. */
function spyReposition(popup) {
	let count = 0;
	const orig = popup.reposition.bind(popup);
	popup.reposition = () => {
		count++;
		orig();
	};
	return () => count;
}

test("popup positions itself when opened", async () => {
	const popup = await openPopup();
	assert.match(popup.wrapperStyle, /opacity:1/);
});

test("scrolling repositions an open popup, throttled to one per frame", async () => {
	const popup = await openPopup();
	const count = spyReposition(popup);
	window.dispatchEvent(new Event("scroll"));
	window.dispatchEvent(new Event("scroll"));
	window.dispatchEvent(new Event("scroll"));
	await frames();
	assert.equal(count(), 1, "three scrolls in one frame collapse to a single reposition");
});

test("resizing repositions an open popup", async () => {
	const popup = await openPopup();
	const count = spyReposition(popup);
	window.dispatchEvent(new Event("resize"));
	await frames();
	assert.equal(count(), 1);
});

test("closing stops repositioning", async () => {
	const popup = await openPopup();
	popup.open = false;
	await settled(popup);
	const count = spyReposition(popup);
	window.dispatchEvent(new Event("scroll"));
	await frames();
	assert.equal(count(), 0, "no reposition after close");
});

test("disconnecting stops repositioning", async () => {
	const popup = await openPopup();
	popup.remove();
	const count = spyReposition(popup);
	window.dispatchEvent(new Event("scroll"));
	await frames();
	assert.equal(count(), 0, "no reposition after disconnect");
});
