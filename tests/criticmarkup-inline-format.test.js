// A CriticMarkup mark whose content carries markdown emphasis, imported through the MARKDOWN format
// (`criticMarkupTransformers` alongside `@lexical/markdown`'s own transformers), the way NovelMaker
// loads a chapter. `$importBlocks` runs text-format transformers before text-match ones, so without
// `maskInlineFormat` the italic transformer splits `{--a *b* c--}` into three text nodes and no
// mark is ever built; the braces stay behind as literal text. Found in NovelMaker, 2026-09-20 and
// again 2026-09-27: the stranded mark could not be accepted or rejected, and blocked a promote.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createEditor, $getRoot, $isTextNode } from "lexical";
import { $convertFromMarkdownString, $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import {
	InsertionNode,
	DeletionNode,
	HighlightNode,
	CommentNode,
	BreakNode,
	criticMarkupTransformers,
	maskInlineFormat,
	unmaskInlineFormat,
	inlineFormatSegments,
} from "../packages/rich-text-criticmarkup/dist/index.js";

// NovelMaker's own set: `~~` and `==` dropped, since they collide with substitution and highlight.
const MARKDOWN = [...criticMarkupTransformers, ...TRANSFORMERS.filter((t) => t.tag !== "~~" && t.tag !== "==")];

function load(markdown, prepare = maskInlineFormat) {
	const editor = createEditor({
		nodes: [InsertionNode, DeletionNode, HighlightNode, CommentNode, BreakNode],
		onError: (e) => { throw e; },
	});
	editor.update(() => $convertFromMarkdownString(prepare(markdown), MARKDOWN), { discrete: true });
	return editor;
}

function save(editor) {
	let out = "";
	editor.getEditorState().read(() => { out = $convertToMarkdownString(MARKDOWN); });
	return out;
}

function paragraph(editor) {
	let kids = [];
	editor.getEditorState().read(() => {
		kids = $getRoot().getFirstChild().getChildren().map((n) => ({
			type: n.getType(),
			text: n.getTextContent(),
			children: n.getChildren ? n.getChildren().map((c) => ({ text: c.getTextContent(), italic: $isTextNode(c) && c.hasFormat("italic"), bold: $isTextNode(c) && c.hasFormat("bold") })) : [],
		}));
	});
	return kids;
}

const PRIVATE_USE = /[-]/;

test("a deletion holding *emphasis* imports as ONE deletion node, the emphasis italic inside it", () => {
	const editor = load("Angelo {--he thought *what?* and shook--} waited.");
	const kids = paragraph(editor);
	const marks = kids.filter((k) => k.type === "dj-criticmarkup-deletion");
	assert.equal(marks.length, 1);
	assert.deepEqual(
		marks[0].children.map((c) => [c.text, c.italic]),
		[["he thought ", false], ["what?", true], [" and shook", false]],
	);
	assert.ok(!kids.some((k) => k.text.includes("{--")), "no stranded delimiter text");
});

test("the real ch03 shape: a deletion/insertion pair with italics on both sides imports as two marks", () => {
	const pair =
		"The words sat between them. {--She had voted no. *Is she really saying she'd rather we all died.*--}" +
		"{++She had voted no. He had known that. *Is she really saying she'd rather we all died.*++} Then.";
	const editor = load(pair);
	const types = paragraph(editor).map((k) => k.type);
	assert.deepEqual(types, ["text", "dj-criticmarkup-deletion", "dj-criticmarkup-insertion", "text"]);
	// Decision 4 exports an adjacent pair as one substitution; the italics survive on both sides.
	assert.equal(
		save(editor),
		"The words sat between them. {~~She had voted no. *Is she really saying she'd rather we all died.*~>" +
			"She had voted no. He had known that. *Is she really saying she'd rather we all died.*~~} Then.",
	);
});

test("every mark kind, bold, bold-italic, nested emphasis, and inline code survive the round trip", () => {
	for (const source of [
		"A {++an *inserted* word++} B.",
		"A {~~the *old* one~>the **new** one~~} B.",
		"A {==a ***loud*** phrase==}{>>why *this*?<<} B.",
		"A {>>a *bare* comment<<} B.",
		"A {--**bold *and italic* inside**--} B.",
		"A {++use `code_with_underscores` here++} B.",
		"*Outside* and {--inside *too*--} and *after*.",
	]) {
		const out = save(load(source));
		assert.equal(out, source, source);
		assert.ok(!PRIVATE_USE.test(out), `no sentinel leaked for ${source}`);
	}
});

test("underscores and unpaired stars inside a mark stay literal, and the mark is still a mark", () => {
	const source = "A {--snake_case and 5 * 3 and _not rebuilt_--} B.";
	const editor = load(source);
	assert.equal(paragraph(editor).filter((k) => k.type === "dj-criticmarkup-deletion").length, 1);
	assert.equal(save(editor), source);
});

test("the honest version: WITHOUT maskInlineFormat the same deletion strands as literal text", () => {
	const kids = paragraph(load("Angelo {--he thought *what?* and shook--} waited.", (s) => s));
	assert.equal(kids.filter((k) => k.type === "dj-criticmarkup-deletion").length, 0);
	assert.ok(kids.some((k) => k.text.includes("{--")));
});

test("maskInlineFormat touches only mark content, and unmaskInlineFormat is its exact inverse", () => {
	const source = "*a* {--*b* _c_ `d`--} **e** {++plain++}";
	const masked = maskInlineFormat(source);
	assert.equal(masked.length, source.length);
	assert.equal(masked.slice(0, 4), "*a* ");
	assert.ok(masked.endsWith(" **e** {++plain++}"));
	assert.ok(!masked.slice(4, 21).match(/[*_`]/));
	assert.equal(unmaskInlineFormat(masked), source);
	assert.equal(maskInlineFormat("no marks *here*"), "no marks *here*");
});

test("inlineFormatSegments: spacing rules keep `5 * 3 * 2` literal", () => {
	const masked = maskInlineFormat("{--5 * 3 * 2--}").slice(3, -3);
	assert.deepEqual(inlineFormatSegments(masked), [{ text: "5 * 3 * 2", format: 0 }]);
});
