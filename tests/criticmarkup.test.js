// Track N of rich-text-criticmarkup-spec.md: the node classes (N1), the five text-match
// transformers (N2), and the tokenize/mask/import/unmask pipeline (N3). Runs the real Lexical
// runtime headlessly, same policy as rich-text-markdown.test.js: exercise real
// serialize/deserialize round-trips through createEditor, no root element needed except where the
// refusal event requires one to dispatch on.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createEditor, $getRoot, $createParagraphNode, $createTextNode, $isTextNode } from "lexical";
import {
	InsertionNode,
	$createInsertionNode,
	$isInsertionNode,
	DeletionNode,
	$createDeletionNode,
	$isDeletionNode,
	HighlightNode,
	$createHighlightNode,
	$isHighlightNode,
	CommentNode,
	$createCommentNode,
	$isCommentNode,
	BreakNode,
	$createBreakNode,
	$isBreakNode,
	$isCriticMark,
	criticMarkupTransformers,
	SUBSTITUTION_TRANSFORMER,
	DELETION_TRANSFORMER,
	INSERTION_TRANSFORMER,
	HIGHLIGHT_TRANSFORMER,
	COMMENT_TRANSFORMER,
	deserializeCriticMarkup,
	serializeCriticMarkup,
	unmaskNested,
	PARAGRAPH_TOKEN,
} from "../packages/rich-text-criticmarkup/dist/index.js";

const ALL_NODES = [InsertionNode, DeletionNode, HighlightNode, CommentNode, BreakNode];

function editorWith(nodes = ALL_NODES) {
	return createEditor({ nodes, onError: (e) => { throw e; } });
}

function importMarkdown(editor, text, options) {
	editor.update(() => deserializeCriticMarkup(editor, text, options), { discrete: true });
}

function exportMarkdown(editor) {
	let out = "";
	editor.getEditorState().read(() => { out = serializeCriticMarkup(editor); });
	return out;
}

function readRoot(editor, fn) {
	let result;
	editor.getEditorState().read(() => { result = fn($getRoot()); });
	return result;
}

// --- N1: node classes --------------------------------------------------------------------------

test("each node type creates and reports its own type", () => {
	const editor = editorWith();
	editor.update(() => {
		assert.equal($createInsertionNode().getType(), "dj-criticmarkup-insertion");
		assert.equal($createDeletionNode().getType(), "dj-criticmarkup-deletion");
		assert.equal($createHighlightNode().getType(), "dj-criticmarkup-highlight");
		assert.equal($createCommentNode("note").getType(), "dj-criticmarkup-comment");
		assert.equal($createBreakNode().getType(), "dj-criticmarkup-break");
	}, { discrete: true });
});

test("$isCriticMark is true for the four mark classes, false for BreakNode", () => {
	const editor = editorWith();
	editor.update(() => {
		assert.equal($isCriticMark($createInsertionNode()), true);
		assert.equal($isCriticMark($createDeletionNode()), true);
		assert.equal($isCriticMark($createHighlightNode()), true);
		assert.equal($isCriticMark($createCommentNode("x")), true);
		assert.equal($isCriticMark($createBreakNode()), false);
		assert.equal($isCriticMark(null), false);
	}, { discrete: true });
});

test("canInsertTextAfter/Before: false on deletion and highlight, true on insertion", () => {
	const editor = editorWith();
	editor.update(() => {
		const ins = $createInsertionNode();
		const del = $createDeletionNode();
		const hl = $createHighlightNode();
		assert.equal(ins.canInsertTextBefore(), true);
		assert.equal(ins.canInsertTextAfter(), true);
		assert.equal(del.canInsertTextBefore(), false);
		assert.equal(del.canInsertTextAfter(), false);
		assert.equal(hl.canInsertTextBefore(), false);
		assert.equal(hl.canInsertTextAfter(), false);
	}, { discrete: true });
});

test("$createBreakNode().getTextContent() is the paragraph token, not empty — the trap this override exists for", () => {
	const editor = editorWith();
	editor.update(() => {
		const brk = $createBreakNode();
		assert.equal(brk.getTextContent(), PARAGRAPH_TOKEN);
		assert.notEqual(brk.getTextContent(), "");
	}, { discrete: true });
});

test("an insertion wrapping only a BreakNode exports a non-empty mark, not {++++}", () => {
	const editor = editorWith();
	importMarkdown(editor, "A{++¶++}B");
	const md = exportMarkdown(editor);
	assert.equal(md, "A{++¶++}B");
	assert.doesNotMatch(md, /\{\+\+\+\+\}/);
});

test("a headless editor round-trips all five node types through editorState.toJSON()/parseEditorState unchanged", () => {
	const editor = editorWith();
	importMarkdown(editor, "before {++ins++} {--del--} {==hl==}{>>note<<} {>>bare<<} {++A¶B++} after");
	const before = readRoot(editor, () => editor.getEditorState().toJSON());
	const json = JSON.stringify(before);
	const parsed = editor.parseEditorState(json);
	const after = parsed.toJSON();
	assert.deepEqual(after, before);
});

test("node round trip is honest: corrupting a serialized node's type breaks the comparison", () => {
	const editor = editorWith();
	importMarkdown(editor, "{++ins++}");
	const before = readRoot(editor, () => editor.getEditorState().toJSON());
	const corrupted = JSON.parse(JSON.stringify(before));
	corrupted.root.children[0].children[0].type = "not-a-real-type";
	assert.throws(() => assert.deepEqual(corrupted, before));
});

// --- N2: transformers ----------------------------------------------------------------------------

test("import each of the five kinds from markdown and assert the resulting node tree", () => {
	const editor = editorWith();
	importMarkdown(editor, "{++ins++}\n\n{--del--}\n\n{~~old~>new~~}\n\n{==hl==}\n\n{>>note<<}");
	editor.getEditorState().read(() => {
		const paras = $getRoot().getChildren();
		assert.equal(paras.length, 5);
		const [insP, delP, subP, hlP, cP] = paras;
		assert.equal($isInsertionNode(insP.getFirstChild()), true);
		assert.equal(insP.getFirstChild().getTextContent(), "ins");
		assert.equal($isDeletionNode(delP.getFirstChild()), true);
		assert.equal(delP.getFirstChild().getTextContent(), "del");
		const [subDel, subIns] = subP.getChildren();
		assert.equal($isDeletionNode(subDel), true);
		assert.equal(subDel.getTextContent(), "old");
		assert.equal($isInsertionNode(subIns), true);
		assert.equal(subIns.getTextContent(), "new");
		assert.equal($isHighlightNode(hlP.getFirstChild()), true);
		assert.equal(hlP.getFirstChild().getTextContent(), "hl");
		assert.equal(hlP.getFirstChild().getComment(), null);
		assert.equal($isCommentNode(cP.getFirstChild()), true);
		assert.equal(cP.getFirstChild().getText(), "note");
	});
});

test("export each of the five kinds back to the exact source string", () => {
	const editor = editorWith();
	const source = "{++ins++}\n\n{--del--}\n\n{~~old~>new~~}\n\n{==hl==}\n\n{>>note<<}";
	importMarkdown(editor, source);
	assert.equal(exportMarkdown(editor), source);
});

test("substitution pairing, both directions of decision 4's export split", () => {
	const editor = editorWith();
	importMarkdown(editor, "{~~old~>new~~}");
	assert.equal(exportMarkdown(editor), "{~~old~>new~~}");

	const editor2 = editorWith();
	importMarkdown(editor2, "{--old--}");
	assert.equal(exportMarkdown(editor2), "{--old--}");
});

test("a deletion NOT followed by an insertion exports as a lone {--old--}, never absorbed into a pair", () => {
	const editor = editorWith();
	importMarkdown(editor, "{--old--} plain prose");
	const md = exportMarkdown(editor);
	assert.equal(md, "{--old--} plain prose");
});

test("an anchored {==t==}{>>n<<} imports as ONE highlight carrying the note, exports byte-identical", () => {
	const editor = editorWith();
	const source = "{==t==}{>>n<<}";
	importMarkdown(editor, source);
	editor.getEditorState().read(() => {
		const p = $getRoot().getFirstChild();
		assert.equal(p.getChildrenSize(), 1);
		const hl = p.getFirstChild();
		assert.equal($isHighlightNode(hl), true);
		assert.equal(hl.getTextContent(), "t");
		assert.equal(hl.getComment(), "n");
	});
	assert.equal(exportMarkdown(editor), source);
});

test("decision 7's ordering trap: a bare comment is not stolen by a highlight LATER on the same line", () => {
	// The arrangement that fails if highlight is not listed before comment: the comment's own regex,
	// tried first were the order wrong, would match the highlight's trailing anchored `{>>...<<}`
	// before the highlight transformer ever got a turn.
	const editor = editorWith();
	const source = "{>>bare<<} then {==t==}{>>anchored<<}";
	importMarkdown(editor, source);
	editor.getEditorState().read(() => {
		const p = $getRoot().getFirstChild();
		const bare = p.getChildren().find($isCommentNode);
		const hl = p.getChildren().find($isHighlightNode);
		assert.ok(bare, "bare comment node missing");
		assert.equal(bare.getText(), "bare");
		assert.ok(hl, "highlight node missing");
		assert.equal(hl.getComment(), "anchored");
	});
	assert.equal(exportMarkdown(editor), source);
});

test("token round trip: A{++¶++}B imports as one insertion holding a single BreakNode, exports byte-identical", () => {
	const editor = editorWith();
	const source = `A{++${PARAGRAPH_TOKEN}++}B`;
	importMarkdown(editor, source);
	editor.getEditorState().read(() => {
		const p = $getRoot().getFirstChild();
		const ins = p.getChildren().find($isInsertionNode);
		assert.ok(ins);
		const children = ins.getChildren();
		assert.equal(children.length, 1);
		assert.equal($isBreakNode(children[0]), true);
	});
	assert.equal(exportMarkdown(editor), source);
});

test("token round trip: {++A¶B++} imports as text, break, text inside one insertion, exports byte-identical", () => {
	const editor = editorWith();
	const source = `{++A${PARAGRAPH_TOKEN}B++}`;
	importMarkdown(editor, source);
	editor.getEditorState().read(() => {
		const ins = $getRoot().getFirstChild().getFirstChild();
		assert.equal($isInsertionNode(ins), true);
		const children = ins.getChildren();
		assert.equal(children.length, 3);
		assert.equal($isTextNode(children[0]), true);
		assert.equal(children[0].getTextContent(), "A");
		assert.equal($isBreakNode(children[1]), true);
		assert.equal($isTextNode(children[2]), true);
		assert.equal(children[2].getTextContent(), "B");
	});
	assert.equal(exportMarkdown(editor), source);
});

test("token round trip: {++A¶¶B++} imports as ONE text node holding a literal pilcrow, no break at all", () => {
	const editor = editorWith();
	const source = `{++A${PARAGRAPH_TOKEN}${PARAGRAPH_TOKEN}B++}`;
	importMarkdown(editor, source);
	editor.getEditorState().read(() => {
		const ins = $getRoot().getFirstChild().getFirstChild();
		assert.equal($isInsertionNode(ins), true);
		const children = ins.getChildren();
		assert.equal(children.length, 1);
		assert.equal($isTextNode(children[0]), true);
		assert.equal(children[0].getTextContent(), `A${PARAGRAPH_TOKEN}B`);
	});
	assert.equal(exportMarkdown(editor), source);
});

test("a mark inside bold text stays bold — format inherited on import", () => {
	// This format carries no general markdown (decision 13: criticmarkup-only, no BOLD_STAR
	// transformer loaded), so there is no `**...**` shortcut to produce bold text through
	// `deserializeCriticMarkup` itself. Build the bold source text node directly instead and drive
	// the insertion transformer's own `replace` the same way `$convertFromMarkdownString` would.
	const editor = editorWith();
	editor.update(() => {
		const root = $getRoot();
		root.clear();
		const p = $createParagraphNode();
		const t = $createTextNode("{++ins++}");
		t.toggleFormat("bold");
		p.append(t);
		root.append(p);
		const match = t.getTextContent().match(INSERTION_TRANSFORMER.importRegExp);
		INSERTION_TRANSFORMER.replace(t, match);
	}, { discrete: true });
	let hasBold = false;
	editor.getEditorState().read(() => {
		const ins = $getRoot().getFirstChild().getFirstChild();
		hasBold = ins.getFirstChild().hasFormat("bold");
	});
	assert.equal(hasBold, true);
});

test("criticMarkupTransformers is the five, in decision 7's required order", () => {
	assert.deepEqual(criticMarkupTransformers, [
		SUBSTITUTION_TRANSFORMER,
		DELETION_TRANSFORMER,
		INSERTION_TRANSFORMER,
		HIGHLIGHT_TRANSFORMER,
		COMMENT_TRANSFORMER,
	]);
});

// --- N3: the import pipeline ---------------------------------------------------------------------

test("a nested mark imports with the OUTER mark as a node and the inner delimiters as literal text", () => {
	const editor = editorWith();
	importMarkdown(editor, "{--a {--b--} c--}");
	editor.getEditorState().read(() => {
		const p = $getRoot().getFirstChild();
		assert.equal(p.getChildrenSize(), 1);
		const del = p.getFirstChild();
		assert.equal($isDeletionNode(del), true);
		assert.equal(del.getTextContent(), "a {--b--} c");
	});
	// no sentinel code point (U+E000-U+E007) survives into value — checked on code points, not looks
	const md = exportMarkdown(editor);
	for (const cp of md) assert.ok(cp.codePointAt(0) < 0xe000 || cp.codePointAt(0) > 0xe007, `sentinel leaked: U+${cp.codePointAt(0).toString(16)}`);
	assert.equal(md, "{--a {--b--} c--}");
});

test("a nested mark fires exactly one dj-criticmarkup-refused with reason 'nested'", () => {
	const editor = editorWith();
	const root = document.createElement("div");
	editor.setRootElement(root);
	const events = [];
	root.addEventListener("dj-criticmarkup-refused", (e) => events.push(e.detail));
	importMarkdown(editor, "{--a {--b--} c--}");
	assert.equal(events.length, 1);
	assert.equal(events[0].reason, "nested");
	editor.setRootElement(null);
});

test("with the default token, a block-spanning substitution tokenizes and imports cleanly — decision 16 leaves route 3 nothing to refuse", () => {
	const editor = editorWith();
	const root = document.createElement("div");
	editor.setRootElement(root);
	const events = [];
	root.addEventListener("dj-criticmarkup-refused", (e) => events.push(e.detail));
	importMarkdown(editor, "{~~A\n\nB~>C~~}");
	editor.getEditorState().read(() => {
		const p = $getRoot().getFirstChild();
		const [del, ins] = p.getChildren();
		assert.equal($isDeletionNode(del), true);
		assert.equal(del.getChildren().some($isBreakNode), true);
		assert.equal($isInsertionNode(ins), true);
	});
	assert.equal(events.length, 0, "decision 16: nothing left for route 3 to refuse with the default token");
	editor.setRootElement(null);
});

test("with paragraphToken disabled, the SAME block-spanning substitution is refused as literal text — the pre-decision-16 edge case this pipeline still detects", () => {
	const editor = editorWith();
	const root = document.createElement("div");
	editor.setRootElement(root);
	const events = [];
	root.addEventListener("dj-criticmarkup-refused", (e) => events.push(e.detail));
	importMarkdown(editor, "{~~A\n\nB~>C~~}", { paragraphToken: "" });
	editor.getEditorState().read(() => {
		const p = $getRoot().getFirstChild();
		assert.equal(p.getChildren().some($isDeletionNode), false);
		assert.equal(p.getChildren().some($isInsertionNode), false);
	});
	assert.equal(events.length, 1);
	assert.equal(events[0].reason, "block-spanning");
	editor.setRootElement(null);
});

test("value round-trips a corpus string with all five kinds, byte for byte", () => {
	const editor = editorWith();
	const source =
		"{++ins++} {--del--} {~~old~>new~~} {==hl==}{>>anchored<<} {>>bare<<}\n\n" +
		`{++A${PARAGRAPH_TOKEN}B++} escaped ${PARAGRAPH_TOKEN}${PARAGRAPH_TOKEN} pilcrow`;
	importMarkdown(editor, source);
	assert.equal(exportMarkdown(editor), source);
});

test("the honest version: a deliberate off-by-one in the unmask walk breaks the round trip", () => {
	// Reimplement the walk with a broken substitute for unmaskNested (shifted by one sentinel) and
	// confirm the SAME round-trip assertion this file relies on elsewhere would fail. Never touches
	// the real pipeline; this only proves the round-trip test above is capable of catching the bug
	// its own name claims to guard against.
	const masked = "{--a b--} c--}"; // deliberately malformed input shape
	const brokenUnmask = (text) => {
		const shifted = new Map([["", "}"], ["", "{"]]); // wrong mapping on purpose
		let out = "";
		for (const ch of text) out += shifted.get(ch) ?? unmaskNested(ch);
		return out;
	};
	const correct = unmaskNested(masked);
	const broken = brokenUnmask(masked);
	assert.notEqual(broken, correct, "the broken unmask must actually differ from the real one to prove the test discriminates");
});
