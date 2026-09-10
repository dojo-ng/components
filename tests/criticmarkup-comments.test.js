// Track T4 of rich-text-criticmarkup-spec.md: comment authoring (decision 15) — insert (bare and
// anchored), edit, the two deletes, and isValidCommentText. The UI shell (popup, keyboard, axe) is
// covered separately in components/tests/browser/; this file is the plain editor-level operations,
// headless, same policy as the other criticmarkup test files.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createEditor, $getRoot, $createParagraphNode, $createTextNode, UNDO_COMMAND } from "lexical";
import { registerHistory, createEmptyHistoryState } from "@lexical/history";
import {
	InsertionNode,
	DeletionNode,
	HighlightNode,
	CommentNode,
	BreakNode,
	$isCommentNode,
	$isHighlightNode,
	deserializeCriticMarkup,
	serializeCriticMarkup,
	insertComment,
	editComment,
	removeComment,
	removeHighlight,
	isValidCommentText,
} from "../packages/rich-text-criticmarkup/dist/index.js";

const ALL_NODES = [InsertionNode, DeletionNode, HighlightNode, CommentNode, BreakNode];

function editorWith() {
	const editor = createEditor({ nodes: ALL_NODES, onError: (e) => { throw e; } });
	editor.setRootElement(document.createElement("div"));
	return editor;
}

function valueOf(editor) {
	let out = "";
	editor.getEditorState().read(() => { out = serializeCriticMarkup(editor); });
	return out;
}

function findMarkNode(editor, predicate) {
	let found = null;
	editor.getEditorState().read(() => {
		const stack = [$getRoot()];
		while (stack.length) {
			const node = stack.pop();
			if (predicate(node)) { found = node; return; }
			if (typeof node.getChildren === "function") stack.push(...node.getChildren());
		}
	});
	return found;
}

// --- isValidCommentText ---------------------------------------------------------------------------

test("isValidCommentText rejects a note containing <<} or {>>, accepts a bare > or a lone }", () => {
	assert.equal(isValidCommentText("has <<} inside"), false);
	assert.equal(isValidCommentText("has {>> inside"), false);
	assert.equal(isValidCommentText("a bare > is fine"), true);
	assert.equal(isValidCommentText("a lone } is fine"), true);
	assert.equal(isValidCommentText("plain note"), true);
});

test("every accepted note round-trips through value unchanged", () => {
	for (const note of ["plain note", "a bare > is fine", "a lone } is fine", "punctuation! ok?"]) {
		const editor = editorWith();
		editor.update(() => {
			const root = $getRoot();
			root.clear();
			root.append($createParagraphNode().append($createTextNode("")));
			const p = root.getFirstChild();
			p.getFirstChild().select(0, 0);
		}, { discrete: true });
		insertComment(editor, note);
		editor.getEditorState().read(() => {
			const c = findMarkNode(editor, $isCommentNode);
			assert.equal(c.getText(), note);
		});
	}
});

// --- insertComment: bare and anchored -------------------------------------------------------------

test("insertComment at a collapsed caret produces {>>note<<} in value", () => {
	const editor = editorWith();
	editor.update(() => {
		const root = $getRoot();
		root.clear();
		const p = $createParagraphNode();
		p.append($createTextNode("hello world"));
		root.append(p);
		p.getFirstChild().select(5, 5); // caret after "hello"
	}, { discrete: true });
	insertComment(editor, "note");
	assert.equal(valueOf(editor), "hello{>>note<<} world");
});

test("insertComment over a range selection produces {==selected==}{>>note<<} — one highlight, not a highlight plus a stray comment", () => {
	const editor = editorWith();
	editor.update(() => {
		const root = $getRoot();
		root.clear();
		const p = $createParagraphNode();
		p.append($createTextNode("hello brave world"));
		root.append(p);
		p.getFirstChild().select(6, 11); // "brave"
	}, { discrete: true });
	insertComment(editor, "note");
	assert.equal(valueOf(editor), "hello {==brave==}{>>note<<} world");

	// imports back as ONE highlight carrying the note
	const reimported = editorWith();
	reimported.update(() => deserializeCriticMarkup(reimported, valueOf(editor)), { discrete: true });
	reimported.getEditorState().read(() => {
		const p = $getRoot().getFirstChild();
		const marks = p.getChildren().filter((n) => $isHighlightNode(n) || $isCommentNode(n));
		assert.equal(marks.length, 1, "must be one highlight, not a highlight plus a stray comment");
		assert.equal($isHighlightNode(marks[0]), true);
		assert.equal(marks[0].getComment(), "note");
	});
});

// --- editComment ------------------------------------------------------------------------------

test("editComment changes a bare comment's text and the new text survives a value round trip", () => {
	const editor = editorWith();
	editor.update(() => {
		const root = $getRoot();
		root.clear();
		root.append($createParagraphNode().append($createTextNode("")));
		root.getFirstChild().getFirstChild().select(0, 0);
	}, { discrete: true });
	insertComment(editor, "original");
	const node = findMarkNode(editor, $isCommentNode);
	editComment(editor, node, "changed");
	assert.equal(valueOf(editor), "{>>changed<<}");
});

test("editComment changes an anchored highlight's comment", () => {
	const editor = editorWith();
	editor.update(() => deserializeCriticMarkup(editor, "{==hl==}{>>original<<}"), { discrete: true });
	const node = findMarkNode(editor, $isHighlightNode);
	editComment(editor, node, "changed");
	assert.equal(valueOf(editor), "{==hl==}{>>changed<<}");
});

// --- removeComment vs removeHighlight — the two that are easy to swap -----------------------------

test("removeComment on an anchored comment leaves the highlight and its text standing", () => {
	const editor = editorWith();
	editor.update(() => deserializeCriticMarkup(editor, "{==hl==}{>>note<<}"), { discrete: true });
	const node = findMarkNode(editor, $isHighlightNode);
	removeComment(editor, node);
	assert.equal(valueOf(editor), "{==hl==}");
});

test("removeHighlight removes both the note and the highlight, leaving the text unmarked", () => {
	const editor = editorWith();
	editor.update(() => deserializeCriticMarkup(editor, "{==hl==}{>>note<<}"), { discrete: true });
	const node = findMarkNode(editor, $isHighlightNode);
	removeHighlight(editor, node);
	assert.equal(valueOf(editor), "hl");
});

// --- refusal --------------------------------------------------------------------------------------

test("insertComment/editComment refuse a note that would not round-trip, naming the offending sequence", () => {
	const editor = editorWith();
	editor.update(() => {
		const root = $getRoot();
		root.clear();
		root.append($createParagraphNode().append($createTextNode("")));
		root.getFirstChild().getFirstChild().select(0, 0);
	}, { discrete: true });
	assert.throws(() => insertComment(editor, "bad <<} note"), /<<\}/);
	assert.throws(() => insertComment(editor, "bad {>> note"), /\{>>/);

	insertComment(editor, "ok");
	const node = findMarkNode(editor, $isCommentNode);
	assert.throws(() => editComment(editor, node, "bad <<} note"), /<<\}/);
	assert.equal(valueOf(editor), "{>>ok<<}", "a refused edit must not have changed the note");
});

// --- undo -------------------------------------------------------------------------------------

function editorWithHistory() {
	const editor = editorWith();
	registerHistory(editor, createEmptyHistoryState(), 0);
	return editor;
}

// @lexical/history's undo() applies the restored state via `editor.setEditorState(..., {tag:
// "historic"})` with no `discrete` option, so — like every other non-discrete Lexical update — it
// is batched to a microtask rather than applied synchronously. Flush one before reading.
async function undoAndFlush(editor) {
	editor.dispatchCommand(UNDO_COMMAND, undefined);
	await Promise.resolve();
}

test("undo after each of the four operations restores the previous state exactly", async () => {
	// registerHistory from @lexical/history — not loaded by default in these headless tests — so
	// this is the real check that insertComment/editComment/removeComment/removeHighlight run
	// inside editor.update() the way every other mutation here does, with nothing tagged to skip
	// history, since that's what undo/redo coverage actually depends on.
	{
		const editor = editorWithHistory();
		editor.update(() => {
			const root = $getRoot();
			root.clear();
			const p = $createParagraphNode();
			p.append($createTextNode(""));
			root.append(p);
			p.getFirstChild().select(0, 0);
		}, { discrete: true });
		const before = valueOf(editor);
		insertComment(editor, "note");
		assert.notEqual(valueOf(editor), before);
		await undoAndFlush(editor);
		assert.equal(valueOf(editor), before, "undo after insertComment");
	}
	{
		const editor = editorWithHistory();
		editor.update(() => deserializeCriticMarkup(editor, "{>>original<<}"), { discrete: true });
		const before = valueOf(editor);
		const node = findMarkNode(editor, $isCommentNode);
		editComment(editor, node, "changed");
		assert.notEqual(valueOf(editor), before);
		await undoAndFlush(editor);
		assert.equal(valueOf(editor), before, "undo after editComment");
	}
	{
		const editor = editorWithHistory();
		editor.update(() => deserializeCriticMarkup(editor, "{==hl==}{>>note<<}"), { discrete: true });
		const before = valueOf(editor);
		const node = findMarkNode(editor, $isHighlightNode);
		removeComment(editor, node);
		assert.notEqual(valueOf(editor), before);
		await undoAndFlush(editor);
		assert.equal(valueOf(editor), before, "undo after removeComment");
	}
	{
		const editor = editorWithHistory();
		editor.update(() => deserializeCriticMarkup(editor, "{==hl==}{>>note<<}"), { discrete: true });
		const before = valueOf(editor);
		const node = findMarkNode(editor, $isHighlightNode);
		removeHighlight(editor, node);
		assert.notEqual(valueOf(editor), before);
		await undoAndFlush(editor);
		assert.equal(valueOf(editor), before, "undo after removeHighlight");
	}
});
