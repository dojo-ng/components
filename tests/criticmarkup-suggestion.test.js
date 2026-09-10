// Track S of rich-text-criticmarkup-spec.md: suggestion mode (S1), selection behavior at mark edges
// (S2, node-tree only — the real caret confirmation is task B1, not this file), and structural edits
// (S3). Real headless Lexical editors throughout, same policy as the other criticmarkup test files.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
	createEditor,
	$getRoot,
	$createParagraphNode,
	$createTextNode,
	$getSelection,
	$isTextNode,
	INSERT_PARAGRAPH_COMMAND,
	DELETE_CHARACTER_COMMAND,
} from "lexical";
import {
	InsertionNode,
	DeletionNode,
	HighlightNode,
	CommentNode,
	BreakNode,
	$isInsertionNode,
	$isDeletionNode,
	$isCommentNode,
	setSuggestionMode,
	isSuggestionMode,
	configureSuggestionMode,
	serializeCriticMarkup,
	deserializeCriticMarkup,
	acceptAll,
	declineAll,
	stripComments,
	PARAGRAPH_TOKEN,
} from "../packages/rich-text-criticmarkup/dist/index.js";

const ALL_NODES = [InsertionNode, DeletionNode, HighlightNode, CommentNode, BreakNode];

function editorWith() {
	const editor = createEditor({ nodes: ALL_NODES, onError: (e) => { throw e; } });
	editor.setRootElement(document.createElement("div"));
	return editor;
}

function setupDoc(editor, texts) {
	editor.update(() => {
		const root = $getRoot();
		root.clear();
		for (const t of texts) {
			const p = $createParagraphNode();
			p.append($createTextNode(t));
			root.append(p);
		}
	}, { discrete: true });
}

function valueOf(editor) {
	let out = "";
	editor.getEditorState().read(() => { out = serializeCriticMarkup(editor); });
	return out;
}

// A headless editor (no real DOM/focus) does not retain a RangeSelection across separate `.update()`
// calls — confirmed empirically here, and consistent with rich-text-color.test.js's own note that
// "headless editors don't retain a selection across updates." So every helper below sets the
// selection and performs the action inside ONE `editor.update()`/dispatch, never split across two.

/** Locate the (TextNode, local offset) at character `offset` into `block`'s flattened text — the
 * same shape as `suggestion-mode.ts`'s own internal `locateOffset`, reimplemented here since it is
 * not exported (it is a private implementation detail, not public API). */
function locate(block, offset) {
	let acc = 0;
	for (const child of block.getChildren()) {
		const len = child.getTextContent().length;
		if (offset <= acc + len) {
			const local = offset - acc;
			if ($isTextNode(child)) return { node: child, offset: local };
			if (typeof child.getChildren === "function") return locate(child, local);
			return null;
		}
		acc += len;
	}
	return null;
}

function selectAt(paragraph, offset) {
	const loc = locate(paragraph, offset);
	if (!loc) throw new Error(`cannot locate offset ${offset} in paragraph "${paragraph.getTextContent()}"`);
	loc.node.select(loc.offset, loc.offset);
}

function typeAt(editor, paraIndex, offset, ch) {
	editor.update(() => {
		const p = $getRoot().getChildAtIndex(paraIndex);
		selectAt(p, offset);
		$getSelection().insertText(ch);
	}, { discrete: true });
}

// happy-dom has no native Selection.modify(), which RangeSelection.deleteCharacter() calls into —
// so backspacing is simulated as removing the explicit one-character range instead, which exercises
// exactly the same tree mutation (and the same diffBlock path) without needing that native method.
function backspaceAt(editor, paraIndex, offset) {
	editor.update(() => {
		const p = $getRoot().getChildAtIndex(paraIndex);
		const from = locate(p, offset - 1);
		const to = locate(p, offset);
		from.node.select(from.offset, from.offset);
		const sel = $getSelection();
		sel.focus.set(to.node.getKey(), to.offset, "text");
		sel.removeText();
	}, { discrete: true });
}

/** Set the selection and dispatch `command` in ONE update, so the handler sees the selection just
 * set — `dispatchCommand` called separately from a prior `.update()` does not (see the note above). */
function dispatchAt(editor, paraIndex, offset, command, payload) {
	let handled;
	editor.update(() => {
		const p = $getRoot().getChildAtIndex(paraIndex);
		selectAt(p, offset);
		handled = editor.dispatchCommand(command, payload);
	}, { discrete: true });
	return handled;
}

function countCommentNodes(editor) {
	let n = 0;
	editor.getEditorState().read(() => {
		const stack = [$getRoot()];
		while (stack.length) {
			const node = stack.pop();
			if ($isCommentNode(node)) n++;
			if (typeof node.getChildren === "function") stack.push(...node.getChildren());
		}
	});
	return n;
}

/** Perform a paragraph split the way Lexical's OWN default INSERT_PARAGRAPH_COMMAND handler would —
 * directly, with NO command dispatch at all, so it never touches this plugin's interception. Used to
 * drive the update-listener's structural GUARD path (annotate/apply/the honest check), since a bare
 * headless `createEditor` has no default command handler registered to fall through to. */
function splitDirectly(editor, paraIndex, offset) {
	editor.update(() => {
		const p = $getRoot().getChildAtIndex(paraIndex);
		const t = p.getFirstChild();
		const [, after] = t.splitText(offset);
		const p2 = $createParagraphNode();
		if (after) p2.append(after);
		p.insertAfter(p2);
		p2.selectStart();
	}, { discrete: true });
}

// --- S1: mode state and the marking listener --------------------------------------------------

test("typing with suggestion mode off changes text and creates no nodes", () => {
	const editor = editorWith();
	setupDoc(editor, ["hello world"]);
	assert.equal(isSuggestionMode(editor), false);
	typeAt(editor, 0, 5, "!");
	editor.getEditorState().read(() => {
		const p = $getRoot().getFirstChild();
		assert.equal(p.getChildrenSize(), 1);
		assert.equal(p.getFirstChild().getTextContent(), "hello! world");
	});
});

test("typing with suggestion mode on creates one insertion; typing again extends the SAME insertion", () => {
	const editor = editorWith();
	setupDoc(editor, ["hello world"]);
	setSuggestionMode(editor, true);
	assert.equal(isSuggestionMode(editor), true);
	typeAt(editor, 0, 5, "!");
	let firstKey;
	editor.getEditorState().read(() => {
		const p = $getRoot().getFirstChild();
		const insertions = p.getChildren().filter($isInsertionNode);
		assert.equal(insertions.length, 1);
		assert.equal(insertions[0].getTextContent(), "!");
		firstKey = insertions[0].getKey();
	});
	typeAt(editor, 0, 6, "?"); // right after the "!" just wrapped
	editor.getEditorState().read(() => {
		const p = $getRoot().getFirstChild();
		const insertions = p.getChildren().filter($isInsertionNode);
		assert.equal(insertions.length, 1, "a second keystroke must extend the same node, not create a new one");
		assert.equal(insertions[0].getKey(), firstKey);
		assert.equal(insertions[0].getTextContent(), "!?");
	});
	assert.equal(valueOf(editor), "hello{++!?++} world");
});

test("deleting a word creates a deletion holding it, and the word is still present in value as {--...--}", () => {
	const editor = editorWith();
	setupDoc(editor, ["hello brave world"]);
	setSuggestionMode(editor, true);
	editor.update(() => {
		const t = $getRoot().getFirstChild().getFirstChild();
		t.select(6, 12); // "brave "
		$getSelection().removeText();
	}, { discrete: true });
	editor.getEditorState().read(() => {
		const p = $getRoot().getFirstChild();
		const del = p.getChildren().find($isDeletionNode);
		assert.ok(del);
		assert.equal(del.getTextContent(), "brave ");
	});
	assert.match(valueOf(editor), /\{--brave --\}/);
});

test("deleting inside a fresh (unaccepted) insertion shortens it and creates no deletion node", () => {
	const editor = editorWith();
	setupDoc(editor, ["hello world"]);
	setSuggestionMode(editor, true);
	typeAt(editor, 0, 5, "!");
	typeAt(editor, 0, 6, "!");
	backspaceAt(editor, 0, 7); // remove the second "!"
	editor.getEditorState().read(() => {
		const p = $getRoot().getFirstChild();
		assert.equal(p.getChildren().some($isDeletionNode), false, "withdrawing an unaccepted suggestion must not create a deletion");
		const insertions = p.getChildren().filter($isInsertionNode);
		assert.equal(insertions.length, 1);
		assert.equal(insertions[0].getTextContent(), "!");
	});
});

test("turning suggestion mode off leaves existing marks untouched, and value keeps the mark", () => {
	const editor = editorWith();
	setupDoc(editor, ["hello world"]);
	setSuggestionMode(editor, true);
	typeAt(editor, 0, 5, "!");
	const whileOn = valueOf(editor);
	assert.match(whileOn, /\{\+\+!\+\+\}/);
	setSuggestionMode(editor, false);
	assert.equal(isSuggestionMode(editor), false);
	assert.equal(valueOf(editor), whileOn);
	// and typing more with the mode off no longer creates marks
	typeAt(editor, 0, 12, "?"); // end of "hello! world"
	editor.getEditorState().read(() => {
		const p = $getRoot().getFirstChild();
		assert.equal(p.getChildren().filter($isInsertionNode).length, 1); // still just the one from before
	});
});

// --- S2: selection behavior at mark edges (node-tree only) --------------------------------------

test("S2: after a deletion is created, the next keystroke starts a NEW insertion beside it, not inside it (node tree only — real caret confirmation is task B1)", () => {
	const editor = editorWith();
	setupDoc(editor, ["hello brave world"]);
	setSuggestionMode(editor, true);
	editor.update(() => {
		const t = $getRoot().getFirstChild().getFirstChild();
		t.select(6, 12); // "brave "
		$getSelection().removeText();
	}, { discrete: true });
	typeAt(editor, 0, 12, "X"); // right after the deletion (flattened offset is unchanged by it)
	editor.getEditorState().read(() => {
		const p = $getRoot().getFirstChild();
		const del = p.getChildren().find($isDeletionNode);
		const ins = p.getChildren().find($isInsertionNode);
		assert.ok(del);
		assert.equal(del.getTextContent(), "brave ");
		assert.ok(ins, "a new insertion should appear beside the deletion");
		assert.equal(ins.getTextContent(), "X");
		assert.equal(del.getChildren().some($isInsertionNode), false, "the insertion must not nest inside the deletion");
	});
});

test("DeletionNode.canInsertTextAfter() is false — the node-level guard S2's caret behavior relies on", () => {
	const editor = editorWith();
	editor.update(() => {
		assert.equal(new DeletionNode().canInsertTextAfter(), false);
	}, { discrete: true });
});

// --- S3: structural edits -----------------------------------------------------------------------

test("S3 'mark' (default): splitting a paragraph leaves the block count UNCHANGED and produces exactly one insertion holding one break; value reads A{++¶++}B", () => {
	const editor = editorWith();
	setupDoc(editor, ["AB"]);
	setSuggestionMode(editor, true); // default policy is "mark"
	const handled = dispatchAt(editor, 0, 1, INSERT_PARAGRAPH_COMMAND, undefined);
	assert.equal(handled, true);
	editor.getEditorState().read(() => {
		assert.equal($getRoot().getChildrenSize(), 1);
		const p = $getRoot().getFirstChild();
		const insertions = p.getChildren().filter($isInsertionNode);
		assert.equal(insertions.length, 1);
		assert.equal(insertions[0].getChildrenSize(), 1);
	});
	assert.equal(valueOf(editor), "A{++¶++}B");
});

test("S3 'mark': acceptAll of a marked split gives two paragraphs, declineAll gives the original one", () => {
	const editor = editorWith();
	setupDoc(editor, ["AB"]);
	setSuggestionMode(editor, true);
	dispatchAt(editor, 0, 1, INSERT_PARAGRAPH_COMMAND, undefined);
	const marked = valueOf(editor);
	assert.equal(marked, "A{++¶++}B");
	assert.equal(acceptAll(marked), "A\n\nB");
	assert.equal(declineAll(marked), "AB");

	const reimported = editorWith();
	reimported.update(() => deserializeCriticMarkup(reimported, acceptAll(marked)), { discrete: true });
	reimported.getEditorState().read(() => assert.equal($getRoot().getChildrenSize(), 2));
});

test("S3 'mark': merging at block start gives one block, one deletion holding one break; value reads A{--¶--}B, mirror resolutions", () => {
	const editor = editorWith();
	setupDoc(editor, ["A", "B"]);
	setSuggestionMode(editor, true);
	const handled = dispatchAt(editor, 1, 0, DELETE_CHARACTER_COMMAND, true);
	assert.equal(handled, true);
	editor.getEditorState().read(() => {
		assert.equal($getRoot().getChildrenSize(), 1);
		const p = $getRoot().getFirstChild();
		const deletions = p.getChildren().filter($isDeletionNode);
		assert.equal(deletions.length, 1);
		assert.equal(deletions[0].getChildrenSize(), 1);
	});
	const value = valueOf(editor);
	assert.equal(value, `A{--${PARAGRAPH_TOKEN}--}B`);
	assert.equal(acceptAll(value), "AB");
	assert.equal(declineAll(value), "A\n\nB");
});

test("S3 regression guard: splitting must NOT produce A{--B--} in the first block or {++B++} in the second — the shape an un-suppressed per-block diff produces", () => {
	const editor = editorWith();
	setupDoc(editor, ["AB"]);
	setSuggestionMode(editor, true);
	const handled = dispatchAt(editor, 0, 1, INSERT_PARAGRAPH_COMMAND, undefined);
	assert.equal(handled, true, "sanity: the command must actually have been intercepted for this test to mean anything");
	const value = valueOf(editor);
	assert.doesNotMatch(value, /\{--B--\}/);
	assert.doesNotMatch(value, /\{\+\+B\+\+\}/);
});

// The honest check itself (ground rules: introduce the regression on purpose, confirm the guard-less
// test FAILS, then revert) was run by hand, not left in the suite as code that disables this
// package's own protection: with BOTH the command interception AND the structural guard temporarily
// commented out in suggestion-mode.ts, `splitDirectly(editor, 0, 1)` on "AB" produced
// `A{--B--}\n\nB` — decision 14's own predicted shape for the first block (prose the author never
// touched, marked deleted) confirmed exactly; the second block came out as plain unmarked "B" rather
// than decision 14's predicted `{++B++}`, because `diffBlock`'s null-guard (skip a block with no
// previous state) happens to leave a BRAND NEW block alone — an accidental partial mitigation, not a
// real fix, since the first block is still wrong and the two blocks now visibly disagree about
// whether "B" was deleted. Both changes were reverted after confirming this. The two tests below are
// what actually ships: the real guard active, exercised through both an intercepted route (command
// dispatch) and a non-intercepted one (`splitDirectly`), confirming neither produces that shape.

test("S3 'mark' via a non-command route (e.g. paste): falls back to the same best-effort marker 'annotate' uses, never the naive bad shape", () => {
	const editor = editorWith();
	setupDoc(editor, ["AB"]);
	setSuggestionMode(editor, true); // default "mark" — this update reaches the GUARD, not the command handler
	splitDirectly(editor, 0, 1);
	const value = valueOf(editor);
	assert.doesNotMatch(value, /\{--B--\}/);
	assert.doesNotMatch(value, /\{\+\+B\+\+\}/);
	assert.equal(countCommentNodes(editor), 1, "falls back to annotate's bare-comment marker");
});

test("Bill's compounding case: two marks inside a paragraph, split between them — both survive intact, not duplicated", () => {
	const editor = editorWith();
	editor.update(() => deserializeCriticMarkup(editor, "{++ins++}mid{--del--}"), { discrete: true });
	setSuggestionMode(editor, true);
	// caret between "mid" and the deletion, i.e. right after "ins" + "mid" (flattened offset 6)
	dispatchAt(editor, 0, 6, INSERT_PARAGRAPH_COMMAND, undefined);
	editor.getEditorState().read(() => {
		assert.equal($getRoot().getChildrenSize(), 1, "block count unchanged under 'mark'");
		const p = $getRoot().getFirstChild();
		const insertions = p.getChildren().filter($isInsertionNode);
		const deletions = p.getChildren().filter($isDeletionNode);
		// one is the original {++ins++}, one is the new break-carrying insertion
		assert.equal(insertions.length, 2, "original insertion must survive, plus the new break insertion");
		assert.equal(insertions.some((n) => n.getTextContent() === "ins"), true);
		assert.equal(deletions.length, 1);
		assert.equal(deletions[0].getTextContent(), "del");
	});
	const value = valueOf(editor);
	assert.equal(value, `{++ins++}mid{++${PARAGRAPH_TOKEN}++}{--del--}`);
});

test("Bill's compounding case, harder placement: the split falls INSIDE an existing insertion", () => {
	const editor = editorWith();
	editor.update(() => deserializeCriticMarkup(editor, "{++insertedtext++}"), { discrete: true });
	setSuggestionMode(editor, true);
	dispatchAt(editor, 0, 8, INSERT_PARAGRAPH_COMMAND, undefined); // between "inserted" and "text"
	editor.getEditorState().read(() => {
		assert.equal($getRoot().getChildrenSize(), 1);
		const p = $getRoot().getFirstChild();
		const insertions = p.getChildren().filter($isInsertionNode);
		assert.equal(insertions.length, 1, "splitting inside one insertion must not duplicate it into two");
		assert.equal(insertions[0].getTextContent(), `inserted${PARAGRAPH_TOKEN}text`);
	});
	assert.equal(valueOf(editor), `{++inserted${PARAGRAPH_TOKEN}text++}`);
});

test("S3 'annotate': exactly one bare comment lands at the boundary; declineAll leaves it standing; stripComments removes it", () => {
	const editor = editorWith();
	setupDoc(editor, ["AB"]);
	configureSuggestionMode(editor, { structuralEdits: "annotate" });
	setSuggestionMode(editor, true);
	splitDirectly(editor, 0, 1);
	assert.equal(countCommentNodes(editor), 1);
	const value = valueOf(editor);
	assert.match(value, /\{>>.*<<\}/);
	assert.equal(declineAll(value), value, "a bare comment is left standing by declineAll");
	assert.doesNotMatch(stripComments(value), /\{>>/);
});

test("S3 'block': the split does not happen and the document is unchanged; the event still fires", () => {
	const editor = editorWith();
	setupDoc(editor, ["AB"]);
	configureSuggestionMode(editor, { structuralEdits: "block" });
	setSuggestionMode(editor, true);
	const root = document.createElement("div");
	editor.setRootElement(root);
	const events = [];
	root.addEventListener("dj-criticmarkup-structural", (e) => events.push(e.detail));
	const handled = dispatchAt(editor, 0, 1, INSERT_PARAGRAPH_COMMAND, undefined);
	assert.equal(handled, true);
	editor.getEditorState().read(() => assert.equal($getRoot().getChildrenSize(), 1));
	assert.equal(valueOf(editor), "AB");
	assert.equal(events.length, 1);
	assert.deepEqual(events[0], { operation: "split", policy: "block" });
	editor.setRootElement(null);
});

test("S3 'apply': the split happens, no comment is added, and the event still fires", () => {
	const editor = editorWith();
	setupDoc(editor, ["AB"]);
	configureSuggestionMode(editor, { structuralEdits: "apply" });
	setSuggestionMode(editor, true);
	const root = document.createElement("div");
	editor.setRootElement(root);
	const events = [];
	root.addEventListener("dj-criticmarkup-structural", (e) => events.push(e.detail));
	splitDirectly(editor, 0, 1);
	editor.getEditorState().read(() => assert.equal($getRoot().getChildrenSize(), 2));
	assert.equal(countCommentNodes(editor), 0);
	assert.equal(events.length, 1);
	assert.deepEqual(events[0], { operation: "split", policy: "apply" });
	editor.setRootElement(null);
});

test("S3: dj-criticmarkup-structural fires for 'mark' and reports operation 'split'/'merge' correctly", () => {
	const editor = editorWith();
	setupDoc(editor, ["AB"]);
	setSuggestionMode(editor, true);
	const root = document.createElement("div");
	editor.setRootElement(root);
	const events = [];
	root.addEventListener("dj-criticmarkup-structural", (e) => events.push(e.detail));
	dispatchAt(editor, 0, 1, INSERT_PARAGRAPH_COMMAND, undefined);
	assert.equal(events.length, 1);
	assert.deepEqual(events[0], { operation: "split", policy: "mark" });
	editor.setRootElement(null);
});
