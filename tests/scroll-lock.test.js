// Smoke for the shared refcounted body scroll lock (review task 2.2): the body
// stays locked until the last holder releases, the pre-existing inline overflow
// is saved and restored, and release is idempotent (counts once).
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { lockBodyScroll } from "../packages/dojo-element/dist/index.js";

test("body stays locked until the last holder releases; prior overflow restored", () => {
	document.body.style.overflow = "auto"; // a pre-existing inline value
	const releaseA = lockBodyScroll();
	assert.equal(document.body.style.overflow, "hidden");
	const releaseB = lockBodyScroll();
	assert.equal(document.body.style.overflow, "hidden");
	releaseA();
	assert.equal(document.body.style.overflow, "hidden", "still hidden while one holder remains");
	releaseB();
	assert.equal(document.body.style.overflow, "auto", "prior inline overflow restored, not clobbered to empty");
});

test("release is idempotent — extra calls do not under-count", () => {
	document.body.style.overflow = "";
	const releaseA = lockBodyScroll();
	const releaseB = lockBodyScroll();
	releaseA();
	releaseA();
	releaseA(); // extra releases must be no-ops
	assert.equal(document.body.style.overflow, "hidden", "B still holds the lock");
	releaseB();
	assert.equal(document.body.style.overflow, "");
});
