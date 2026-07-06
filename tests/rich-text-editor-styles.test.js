// Unit tests for ensureEditorStyles: idempotent, id-keyed <style> injection into document.head.
// setup.js installs happy-dom's document. Pure DOM helper, no component mount.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { ensureEditorStyles } from "../packages/rich-text/dist/index.js";

test("calling twice with the same id yields one <style>", () => {
	const id = "dj-rt-test-same";
	ensureEditorStyles(id, "dj-rich-text{color:red}");
	ensureEditorStyles(id, "dj-rich-text{color:blue}");
	const matches = document.head.querySelectorAll(`style#${id}`);
	assert.equal(matches.length, 1);
	// First writer wins; the second call is a no-op and does not overwrite content.
	assert.equal(matches[0].textContent, "dj-rich-text{color:red}");
});

test("different ids yield two <style> elements", () => {
	ensureEditorStyles("dj-rt-test-a", "a{}");
	ensureEditorStyles("dj-rt-test-b", "b{}");
	assert.ok(document.getElementById("dj-rt-test-a"));
	assert.ok(document.getElementById("dj-rt-test-b"));
	assert.notEqual(
		document.getElementById("dj-rt-test-a"),
		document.getElementById("dj-rt-test-b"),
	);
});
