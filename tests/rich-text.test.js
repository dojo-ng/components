// E1: DjRichText.editor — a public read-only getter onto the live Lexical editor, so export code
// outside a plugin (E4/E5/E6) can reach it. Mirrors the DjDataGrid.table precedent: undefined
// before the first build, live after, and a NEW instance after a `plugins` reassignment triggers
// the serialize → recreate → deserialize rebuild — the assertion that would catch someone
// "optimizing" the getter into a stored reference instead of reading `#editor` live.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/rich-text/dist/index.js";

test("editor is undefined before first update", () => {
	const el = document.createElement("dj-rich-text");
	assert.equal(el.editor, undefined);
});

test("editor returns the live editor after updateComplete", async () => {
	const el = await mount("dj-rich-text");
	assert.ok(el.editor, "editor should be built after first update");
	assert.equal(typeof el.editor.getEditorState, "function");
});

test("editor is a different instance after assigning a new plugins array", async () => {
	const el = await mount("dj-rich-text");
	const before = el.editor;
	assert.ok(before);

	el.plugins = [{ name: "noop" }];
	await settled(el);

	const after = el.editor;
	assert.ok(after);
	assert.notEqual(after, before, "plugins reassignment must rebuild the editor, not reuse it");
});
