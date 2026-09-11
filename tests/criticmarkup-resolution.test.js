// Track T1/T2 of rich-text-criticmarkup-spec.md: markAtSelection, acceptMark/declineMark (one
// mark), and acceptAllMarks/declineAllMarks (the whole document, no confirm — that's a toolbar-level
// concern, Track T3). Real headless Lexical editors, same policy as the other criticmarkup test
// files. Every node-level resolution is cross-checked against `grammar.accept`/`decline` applied to
// the SAME starting `value` string — the point of having one grammar (decision 2).
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createEditor, $getRoot, DELETE_CHARACTER_COMMAND, INSERT_PARAGRAPH_COMMAND } from "lexical";
import {
	InsertionNode,
	DeletionNode,
	HighlightNode,
	CommentNode,
	BreakNode,
	$isInsertionNode,
	$isDeletionNode,
	$isHighlightNode,
	$isCommentNode,
	deserializeCriticMarkup,
	serializeCriticMarkup,
	markAtSelection,
	acceptMark,
	declineMark,
	acceptAllMarks,
	declineAllMarks,
	parseMarks,
	accept,
	decline,
	acceptAll,
	declineAll,
	setSuggestionMode,
} from "../packages/rich-text-criticmarkup/dist/index.js";

const ALL_NODES = [InsertionNode, DeletionNode, HighlightNode, CommentNode, BreakNode];

function editorWith() {
	const editor = createEditor({ nodes: ALL_NODES, onError: (e) => { throw e; } });
	editor.setRootElement(document.createElement("div"));
	return editor;
}

function importValue(editor, text) {
	editor.update(() => deserializeCriticMarkup(editor, text), { discrete: true });
}

function valueOf(editor) {
	let out = "";
	editor.getEditorState().read(() => { out = serializeCriticMarkup(editor); });
	return out;
}

/** Select at the given flattened-paragraph-text offset, so `markAtSelection` has a real anchor to
 * walk up from. */
function selectAt(editor, paraIndex, offset) {
	editor.update(() => {
		const p = $getRoot().getChildAtIndex(paraIndex);
		const loc = locate(p, offset);
		loc.node.select(loc.offset, loc.offset);
	}, { discrete: true });
}

function locate(block, offset) {
	let acc = 0;
	const children = block.getChildren();
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		const len = child.getTextContent().length;
		const isLast = i === children.length - 1;
		if (offset < acc + len || (isLast && offset === acc + len)) {
			const local = offset - acc;
			if (typeof child.select === "function" && typeof child.getChildren !== "function") return { node: child, offset: local };
			if (typeof child.getChildren === "function") return locate(child, local);
			return null;
		}
		acc += len;
	}
	return null;
}

/** Set the selection and dispatch `command` in ONE update — a headless editor does not retain a
 * RangeSelection across separate `.update()` calls (see suggestion.test.js's own note). */
function dispatchAt(editor, paraIndex, offset, command, payload) {
	let handled;
	editor.update(() => {
		const p = $getRoot().getChildAtIndex(paraIndex);
		const loc = locate(p, offset);
		loc.node.select(loc.offset, loc.offset);
		handled = editor.dispatchCommand(command, payload);
	}, { discrete: true });
	return handled;
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

// --- markAtSelection --------------------------------------------------------------------------

test("markAtSelection finds the nearest mark walking up from the anchor, null in plain prose", () => {
	const editor = editorWith();
	importValue(editor, "plain {++ins++} prose");
	selectAt(editor, 0, 8); // inside "ins"
	let mark = markAtSelection(editor);
	assert.ok(mark && $isInsertionNode(mark));

	selectAt(editor, 0, 2); // inside "plain"
	mark = markAtSelection(editor);
	assert.equal(mark, null);
});

// --- acceptMark / declineMark, each kind, both directions, cross-checked against grammar ----------

function crossCheck(source, markIndex, action) {
	const marks = parseMarks(source);
	const mark = marks[markIndex];
	return action === "accept" ? accept(source, mark) : decline(source, mark);
}

for (const [label, source, kind] of [
	["insertion", "{++foo++}", "insertion"],
	["deletion", "{--foo--}", "deletion"],
	["highlight (bare)", "{==foo==}", "highlight"],
]) {
	test(`acceptMark/declineMark on a lone ${label} matches grammar.accept/decline exactly`, () => {
		for (const action of ["accept", "decline"]) {
			const editor = editorWith();
			importValue(editor, source);
			const node = findMarkNode(editor, (n) =>
				kind === "insertion" ? $isInsertionNode(n) : kind === "deletion" ? $isDeletionNode(n) : $isHighlightNode(n),
			);
			(action === "accept" ? acceptMark : declineMark)(editor, node);
			const expected = crossCheck(source, 0, action);
			assert.equal(valueOf(editor), expected, `${label} ${action}`);
		}
	});
}

test("acceptMark on a bare comment is a no-op — decision 10", () => {
	const editor = editorWith();
	const source = "before {>>note<<} after";
	importValue(editor, source);
	const node = findMarkNode(editor, $isCommentNode);
	acceptMark(editor, node);
	assert.equal(valueOf(editor), source);
	declineMark(editor, node);
	assert.equal(valueOf(editor), source);
});

test("a highlight takes its anchored comment with it, on both accept and decline", () => {
	const source = "{==t==}{>>n<<}";
	for (const action of ["accept", "decline"]) {
		const editor = editorWith();
		importValue(editor, source);
		const node = findMarkNode(editor, $isHighlightNode);
		(action === "accept" ? acceptMark : declineMark)(editor, node);
		const expected = crossCheck(source, 0, action);
		assert.equal(valueOf(editor), expected, action);
		assert.equal(valueOf(editor), "t");
	}
});

test("accepting either half of a substitution resolves the whole pair, never a lone deletion or insertion", () => {
	const source = "before {~~old~>new~~} after";
	for (const [half, action] of [["deletion", "accept"], ["insertion", "accept"], ["deletion", "decline"], ["insertion", "decline"]]) {
		const editor = editorWith();
		importValue(editor, source);
		const node = findMarkNode(editor, half === "deletion" ? $isDeletionNode : $isInsertionNode);
		(action === "accept" ? acceptMark : declineMark)(editor, node);
		assert.equal(findMarkNode(editor, $isDeletionNode), null, `${half}/${action}: no deletion node should remain`);
		assert.equal(findMarkNode(editor, $isInsertionNode), null, `${half}/${action}: no insertion node should remain`);
		const expectedWord = action === "accept" ? "new" : "old";
		assert.equal(valueOf(editor), `before ${expectedWord} after`, `${half}/${action}`);
	}
});

// --- decision 16: a kept break resolves to a real block split/merge, mirroring grammar exactly ----

test("acceptMark on a 'mark'-policy split insertion performs the real paragraph split", () => {
	const editor = editorWith();
	const source = "A{++¶++}B";
	importValue(editor, source);
	const node = findMarkNode(editor, $isInsertionNode);
	acceptMark(editor, node);
	editor.getEditorState().read(() => assert.equal($getRoot().getChildrenSize(), 2));
	assert.equal(valueOf(editor), "A\n\nB");
	assert.equal(valueOf(editor), accept(source, parseMarks(source)[0]));
});

test("declineMark on a 'mark'-policy split insertion drops it, one block, no orphan blank line", () => {
	const editor = editorWith();
	const source = "A{++¶++}B";
	importValue(editor, source);
	const node = findMarkNode(editor, $isInsertionNode);
	declineMark(editor, node);
	editor.getEditorState().read(() => assert.equal($getRoot().getChildrenSize(), 1));
	assert.equal(valueOf(editor), "AB");
	assert.equal(valueOf(editor), decline(source, parseMarks(source)[0]));
});

test("declineMark on a merge-deletion undoes the merge — one block becomes two again", () => {
	const editor = editorWith();
	const source = "A{--¶--}B";
	importValue(editor, source);
	editor.getEditorState().read(() => assert.equal($getRoot().getChildrenSize(), 1));
	const node = findMarkNode(editor, $isDeletionNode);
	declineMark(editor, node);
	editor.getEditorState().read(() => assert.equal($getRoot().getChildrenSize(), 2));
	assert.equal(valueOf(editor), "A\n\nB");
	assert.equal(valueOf(editor), decline(source, parseMarks(source)[0]));
});

test("acceptMark on a merge-deletion keeps the merge — stays one block, with decision 18's space", () => {
	const editor = editorWith();
	const source = "A{--¶--}B";
	importValue(editor, source);
	const node = findMarkNode(editor, $isDeletionNode);
	acceptMark(editor, node);
	editor.getEditorState().read(() => assert.equal($getRoot().getChildrenSize(), 1));
	assert.equal(valueOf(editor), "A B");
	assert.equal(valueOf(editor), accept(source, parseMarks(source)[0]));
});

// --- decision 18: whitespace at the seam, on the live tree, matching grammar exactly -------------
//
// Every case cross-checks against `accept`/`decline` on the same source, which is the only thing
// that keeps the two paths from drifting: the assertion on the literal string says what the rule IS,
// and the assertion against the grammar says the editor does not have its own private opinion of it.

test("accepting a merge adds no space when one side already has whitespace", () => {
	for (const source of ["A. {--¶--}B", "A.{--¶--} B"]) {
		const editor = editorWith();
		importValue(editor, source);
		acceptMark(editor, findMarkNode(editor, $isDeletionNode));
		assert.equal(valueOf(editor), "A. B", source);
		assert.equal(valueOf(editor), accept(source, parseMarks(source)[0]), source);
	}
});

test("accepting a split absorbs the horizontal whitespace on either side of the new break", () => {
	for (const source of ["A. {++¶++}B", "A.{++¶++} B"]) {
		const editor = editorWith();
		importValue(editor, source);
		acceptMark(editor, findMarkNode(editor, $isInsertionNode));
		editor.getEditorState().read(() => assert.equal($getRoot().getChildrenSize(), 2, source));
		assert.equal(valueOf(editor), "A.\n\nB", source);
		assert.equal(valueOf(editor), accept(source, parseMarks(source)[0]), source);
	}
});

test("declining restores the document verbatim — a mid-word split proposal does NOT gain a space", () => {
	const editor = editorWith();
	const source = "run{++¶++}together";
	importValue(editor, source);
	declineMark(editor, findMarkNode(editor, $isInsertionNode));
	assert.equal(valueOf(editor), "runtogether");
	assert.equal(valueOf(editor), decline(source, parseMarks(source)[0]));
});

test("accepting an ordinary deletion that holds no break joins nothing", () => {
	const editor = editorWith();
	const source = "A{--x--}B";
	importValue(editor, source);
	acceptMark(editor, findMarkNode(editor, $isDeletionNode));
	assert.equal(valueOf(editor), "AB");
	assert.equal(valueOf(editor), accept(source, parseMarks(source)[0]));
});

// --- resolving while suggestion mode is still ON (Bill's own browser-confirmation pass, 2026-09-10) -
//
// Every test above imports its starting tree via `deserializeCriticMarkup` with suggestion mode never
// turned on, so `acceptMark`/`declineMark` were only ever exercised with S1's diff-and-wrap listener
// disabled. Real usage never works that way — a mark exists BECAUSE suggestion mode made it, and a
// user resolves it without first turning suggestion mode off. Live-browser testing (rich-text-
// criticmarkup-spec.md's Track B) found that with suggestion mode left on, `resolveMark`/
// `resolveAllMarks`'s `editor.update()` calls (missing S1's own `SKIP_TAG`) let their own text change
// bounce straight back through the diff listener, which re-wrapped it as a brand-new suggestion —
// undoing the very resolution it was asked to perform. Fixed by tagging those updates with the same
// `SKIP_TAG` S1's own command handlers already use on themselves.

test("acceptMark on a live merge-deletion (suggestion mode ON throughout) actually finalizes the merge, not re-wraps it", () => {
	const editor = editorWith();
	editor.update(() => deserializeCriticMarkup(editor, "A\n\nB"), { discrete: true });
	setSuggestionMode(editor, true);
	const handled = dispatchAt(editor, 1, 0, DELETE_CHARACTER_COMMAND, true);
	assert.equal(handled, true);
	assert.equal(valueOf(editor), "A{--¶--}B", "sanity: the merge marker was made live, the way it really happens");

	const node = findMarkNode(editor, $isDeletionNode);
	acceptMark(editor, node);
	assert.equal(valueOf(editor), "A B", "the diff listener must not see this as new text disappearing and re-wrap it");
	editor.getEditorState().read(() => assert.equal($getRoot().getChildrenSize(), 1));
});

test("declineMark on a live merge-deletion (suggestion mode ON throughout) restores the split, not a fresh insertion", () => {
	const editor = editorWith();
	editor.update(() => deserializeCriticMarkup(editor, "A\n\nB"), { discrete: true });
	setSuggestionMode(editor, true);
	dispatchAt(editor, 1, 0, DELETE_CHARACTER_COMMAND, true);

	const node = findMarkNode(editor, $isDeletionNode);
	declineMark(editor, node);
	assert.equal(valueOf(editor), "A\n\nB", "restoring the break must not also get re-wrapped as a new insertion");
	editor.getEditorState().read(() => assert.equal($getRoot().getChildrenSize(), 2));
});

test("acceptMark on a live split-insertion (suggestion mode ON throughout) performs the real split, not a re-wrap", () => {
	const editor = editorWith();
	editor.update(() => deserializeCriticMarkup(editor, "AB"), { discrete: true });
	setSuggestionMode(editor, true);
	const handled = dispatchAt(editor, 0, 1, INSERT_PARAGRAPH_COMMAND, undefined);
	assert.equal(handled, true);

	const node = findMarkNode(editor, $isInsertionNode);
	acceptMark(editor, node);
	assert.equal(valueOf(editor), "A\n\nB");
	editor.getEditorState().read(() => assert.equal($getRoot().getChildrenSize(), 2));
});

test("Bill's exact repro: accept a paragraph break, then accept a substitution of the new paragraph's first letter — no leftover strikethrough", () => {
	const editor = editorWith();
	// "A", then a proposed break, then the new paragraph's first letter "B" proposed-replaced by "C", then "xyz"
	editor.update(() => deserializeCriticMarkup(editor, "A{++¶++}{--B--}{++C++}xyz"), { discrete: true });
	setSuggestionMode(editor, true); // the marks were made live; suggestion mode stays on through resolution, same as real usage

	// accept the split first — the FIRST insertion in document order (`findMarkNode`'s stack-based
	// walk visits a paragraph's children last-to-first, which would find the substitution's {++C++}
	// instead when, as here, more than one insertion is present)
	let breakHolder;
	editor.getEditorState().read(() => {
		breakHolder = $getRoot().getFirstChild().getChildren().find($isInsertionNode);
	});
	acceptMark(editor, breakHolder);
	editor.getEditorState().read(() => assert.equal($getRoot().getChildrenSize(), 2));
	assert.equal(valueOf(editor), "A\n\n{~~B~>C~~}xyz", "sanity: the substitution must survive the split intact");

	// then accept the substitution now living in the new (second) paragraph
	const delNode = findMarkNode(editor, $isDeletionNode);
	assert.ok(delNode, "the deletion half of the substitution must still be findable after the split");
	acceptMark(editor, delNode);

	assert.equal(valueOf(editor), "A\n\nCxyz", "no strikethrough 'B' should survive alongside the accepted 'C'");
});

// --- dj-criticmarkup-change ----------------------------------------------------------------------

test("acceptMark/declineMark emit dj-criticmarkup-change with the right kind and action", () => {
	const editor = editorWith();
	importValue(editor, "{++ins++}");
	const events = [];
	editor.getRootElement().addEventListener("dj-criticmarkup-change", (e) => events.push(e.detail));
	const node = findMarkNode(editor, $isInsertionNode);
	acceptMark(editor, node);
	assert.deepEqual(events, [{ kind: "insertion", action: "accept" }]);
});

test("resolving a substitution pair emits ONE dj-criticmarkup-change with kind 'substitution'", () => {
	const editor = editorWith();
	importValue(editor, "{~~old~>new~~}");
	const events = [];
	editor.getRootElement().addEventListener("dj-criticmarkup-change", (e) => events.push(e.detail));
	const node = findMarkNode(editor, $isDeletionNode);
	acceptMark(editor, node);
	assert.deepEqual(events, [{ kind: "substitution", action: "accept" }]);
});

// --- T2: acceptAllMarks / declineAllMarks ---------------------------------------------------------

test("acceptAllMarks / declineAllMarks match grammar.acceptAll/declineAll on the same starting value", () => {
	const source = "{++ins++} {--del--} {~~old~>new~~} {==hl==}{>>anchored<<} {>>bare<<}";
	for (const [fn, grammarFn] of [[acceptAllMarks, acceptAll], [declineAllMarks, declineAll]]) {
		const editor = editorWith();
		importValue(editor, source);
		fn(editor);
		assert.equal(valueOf(editor), grammarFn(source));
	}
});

test("acceptAllMarks/declineAllMarks leave bare comments standing", () => {
	const source = "{++x++}{>>bare<<}";
	const editorA = editorWith();
	importValue(editorA, source);
	acceptAllMarks(editorA);
	assert.match(valueOf(editorA), /\{>>bare<<\}/);

	const editorD = editorWith();
	importValue(editorD, source);
	declineAllMarks(editorD);
	assert.match(valueOf(editorD), /\{>>bare<<\}/);
});

test("acceptAllMarks resolves a substitution as one pair, not duplicated or left dangling", () => {
	const editor = editorWith();
	importValue(editor, "{~~old~>new~~} and {~~a~>b~~}");
	acceptAllMarks(editor);
	assert.equal(valueOf(editor), "new and b");
});

test("declineAllMarks on a document with no marks is identity", () => {
	const editor = editorWith();
	importValue(editor, "plain prose, no marks here.");
	declineAllMarks(editor);
	assert.equal(valueOf(editor), "plain prose, no marks here.");
});

test("acceptAllMarks on a document with a 'mark'-policy split resolves it to a real two-block split, matching grammar.acceptAll", () => {
	const editor = editorWith();
	const source = "A{++¶++}B";
	importValue(editor, source);
	acceptAllMarks(editor);
	editor.getEditorState().read(() => assert.equal($getRoot().getChildrenSize(), 2));
	assert.equal(valueOf(editor), acceptAll(source));
});
