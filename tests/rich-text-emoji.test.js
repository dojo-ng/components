// Tests for the emoji plugin: the curated data invariants, the pure filter helper, the :shortcode:
// transform (headless), and plugin shape. The picker geometry/roving is a browser check (EA3).
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createEditor, $getRoot, $createParagraphNode, $createTextNode, $nodesOfType } from "lexical";
import { EMOJI, filterEmoji, emojiPlugin, createEmojiPlugin } from "../packages/rich-text-emoji/dist/index.js";

const CATEGORIES = ["smileys", "people", "hearts", "animals", "food", "activities", "objects", "symbols"];
const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });

test("data: >=160 entries, unique GitHub-style shortcodes, non-empty names, valid categories", () => {
	assert.ok(EMOJI.length >= 160, `expected >=160, got ${EMOJI.length}`);
	const codes = new Set();
	for (const e of EMOJI) {
		assert.match(e.shortcode, /^[a-z0-9_+-]+$/, `bad shortcode: ${e.shortcode}`);
		assert.ok(!codes.has(e.shortcode), `duplicate shortcode: ${e.shortcode}`);
		codes.add(e.shortcode);
		assert.ok(e.name && e.name.trim().length > 0, `empty name for ${e.shortcode}`);
		assert.ok(CATEGORIES.includes(e.category), `bad category: ${e.category}`);
	}
});

test("data: every ch is a single grapheme", () => {
	for (const e of EMOJI) {
		assert.equal([...seg.segment(e.ch)].length, 1, `not one grapheme: ${e.shortcode} (${e.ch})`);
	}
});

test("data: all 8 categories are represented", () => {
	const present = new Set(EMOJI.map((e) => e.category));
	for (const c of CATEGORIES) assert.ok(present.has(c), `missing category: ${c}`);
});

test("filterEmoji matches name, shortcode, and keywords case-insensitively", () => {
	const set = [
		{ ch: "🙂", name: "slightly smiling face", shortcode: "slight_smile", keywords: ["happy"], category: "smileys" },
		{ ch: "🐱", name: "cat face", shortcode: "cat", category: "animals" },
		{ ch: "🎉", name: "party popper", shortcode: "tada", keywords: ["celebrate"], category: "symbols" },
	];
	assert.deepEqual(filterEmoji(set, "CAT").map((e) => e.shortcode), ["cat"]); // name/shortcode, case-insensitive
	assert.deepEqual(filterEmoji(set, "happy").map((e) => e.shortcode), ["slight_smile"]); // keyword
	assert.deepEqual(filterEmoji(set, "TADA").map((e) => e.shortcode), ["tada"]); // shortcode, case-insensitive
	assert.equal(filterEmoji(set, "").length, 3); // empty -> all
	assert.equal(filterEmoji(set, "zzz").length, 0);
});

test("plugin shape: name emoji, no nodes, one render toolbar item", () => {
	assert.equal(emojiPlugin.name, "emoji");
	assert.equal(emojiPlugin.nodes, undefined);
	assert.equal(emojiPlugin.toolbar.length, 1);
	assert.equal(typeof emojiPlugin.toolbar[0].render, "function");
});

test("shortcode transform: a known :shortcode: becomes its char, unknown stays literal", () => {
	const heart = EMOJI.find((e) => e.shortcode === "heart"); // read the char from the set, don't hardcode
	assert.ok(heart, "the set defines a :heart: shortcode");
	const editor = createEditor({ onError: (e) => { throw e; } });
	const ctx = {
		editor,
		host: document.createElement("div"),
		command: (t, p) => editor.dispatchCommand(t, p),
		onSelectionChange: () => () => {},
		activeFormats: () => new Set(),
		plugins: [],
	};
	const dispose = emojiPlugin.setup(ctx);

	const type = (text) => editor.update(() => {
		const root = $getRoot();
		root.clear();
		const p = $createParagraphNode();
		p.append($createTextNode(text));
		root.append(p);
	}, { discrete: true });

	type("love :heart: this");
	let out = "";
	editor.getEditorState().read(() => { out = $getRoot().getTextContent(); });
	assert.equal(out, `love ${heart.ch} this`);

	type("what :notreal: is");
	editor.getEditorState().read(() => { out = $getRoot().getTextContent(); });
	assert.equal(out, "what :notreal: is"); // unknown shortcode untouched

	if (typeof dispose === "function") dispose();
});

test("createEmojiPlugin({ shortcodes: false }) registers no transform", () => {
	const p = createEmojiPlugin({ shortcodes: false });
	const editor = createEditor({ onError: (e) => { throw e; } });
	const ctx = {
		editor, host: document.createElement("div"),
		command: (t, pl) => editor.dispatchCommand(t, pl),
		onSelectionChange: () => () => {}, activeFormats: () => new Set(), plugins: [],
	};
	const dispose = p.setup(ctx);
	assert.equal(dispose, undefined); // no transform disposer when shortcodes are off
});
