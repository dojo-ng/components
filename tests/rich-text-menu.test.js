// Tests for the shared caret-anchored menu machinery. Popup geometry and the interactive feel are
// browser checks (MN4); here we verify the pure matcher, that the trigger watch calls onQueryChange
// with the query, and that the Escape key command is registered while open and disposed on close.
// The update listener CAN read a collapsed selection headlessly (verified), so the primary path works.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
	createEditor,
	$getRoot,
	$createParagraphNode,
	$createTextNode,
	KEY_ESCAPE_COMMAND,
} from "lexical";
import { createEditorMenu, computeMatch } from "../packages/rich-text-menu/dist/index.js";

// Mention-style trigger: "@" at start-of-text or after whitespace, up to 30 word/./-/underscore chars.
const MATCH = (text) => {
	const m = /(^|\s)@([\w.-]{0,30})$/.exec(text);
	return m ? { start: m.index + m[1].length, query: m[2] } : null;
};

const fakeCtx = (editor, host) => ({
	editor,
	host,
	command: (type, payload) => editor.dispatchCommand(type, payload),
	onSelectionChange: () => () => {},
	activeFormats: () => new Set(),
});

const mountEditor = () => {
	const editor = createEditor({ onError: (e) => { throw e; } });
	const host = document.createElement("div");
	const editable = document.createElement("div");
	editable.className = "dj-rt-editable";
	host.appendChild(editable);
	document.body.appendChild(host);
	editor.setRootElement(editable);
	return { editor, host };
};

const typeWithCaret = (editor, text) => {
	editor.update(
		() => {
			const p = $createParagraphNode();
			const t = $createTextNode(text);
			p.append(t);
			$getRoot().clear();
			$getRoot().append(p);
			t.select(text.length, text.length);
		},
		{ discrete: true },
	);
};

test("computeMatch runs the matcher over the text before the caret", () => {
	assert.deepEqual(computeMatch("hi @jo", MATCH), { start: 3, query: "jo" });
	assert.deepEqual(computeMatch("@", MATCH), { start: 0, query: "" });
	assert.equal(computeMatch("email@host", MATCH), null);
});

test("onQueryChange fires with the query when the trigger matches behind the caret", () => {
	const { editor, host } = mountEditor();
	const queries = [];
	const menu = createEditorMenu(fakeCtx(editor, host), {
		match: MATCH,
		onQueryChange: (q) => queries.push(q),
		onPick: () => {},
	});
	typeWithCaret(editor, "hello @jo");
	assert.deepEqual(queries, ["jo"]);
	assert.equal(menu.open, true);
	menu.dispose();
});

test("the Escape key command is registered while open and disposed on close", () => {
	const { editor, host } = mountEditor();
	const menu = createEditorMenu(fakeCtx(editor, host), {
		match: MATCH,
		onQueryChange: () => {},
		onPick: () => {},
	});
	typeWithCaret(editor, "x @a");
	assert.equal(menu.open, true);
	// While open, Escape is consumed (and closes the menu).
	assert.equal(editor.dispatchCommand(KEY_ESCAPE_COMMAND, null), true);
	assert.equal(menu.open, false);
	// Closed: the Escape command is no longer handled by the menu.
	assert.equal(editor.dispatchCommand(KEY_ESCAPE_COMMAND, null), false);
	menu.dispose();
});

test("no trigger match leaves the menu closed", () => {
	const { editor, host } = mountEditor();
	let calls = 0;
	const menu = createEditorMenu(fakeCtx(editor, host), {
		match: MATCH,
		onQueryChange: () => calls++,
		onPick: () => {},
	});
	typeWithCaret(editor, "just some text");
	assert.equal(menu.open, false);
	assert.equal(calls, 0);
	menu.dispose();
});
