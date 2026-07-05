// Tests for the rich-text markdown plugin. Unlike most component tests, these run the Lexical
// runtime headlessly: `createEditor` works for programmatic update/read with no root element, so we
// exercise the real serialize/deserialize round-trips (the links-plugin test policy: unit-test pure
// functions and whatever createEditor allows; full editor interaction is the playground + browser).
// setup.js is imported for the DOM globals Lexical touches at import time.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
	createEditor,
	$getRoot,
	$createParagraphNode,
	$createTextNode,
} from "lexical";
import { HeadingNode, $createHeadingNode } from "@lexical/rich-text";
import { TRANSFORMERS, HEADING } from "@lexical/markdown";
import {
	markdownPlugin,
	createMarkdownPlugin,
	usableTransformers,
} from "../packages/rich-text-markdown/dist/index.js";

/** A fresh headless editor, optionally with extra node classes registered. */
function editorWith(nodes = []) {
	return createEditor({ nodes, onError: (e) => { throw e; } });
}

test("usableTransformers keeps HEADING only when HeadingNode is registered", () => {
	const withHeading = editorWith([HeadingNode]);
	const without = editorWith([]);
	assert.equal(usableTransformers(withHeading, TRANSFORMERS).includes(HEADING), true);
	assert.equal(usableTransformers(without, TRANSFORMERS).includes(HEADING), false);
});

test("usableTransformers always keeps text-format transformers (no node deps)", () => {
	const without = editorWith([]);
	const kept = usableTransformers(without, TRANSFORMERS);
	const textFormat = TRANSFORMERS.filter((t) => t.type === "text-format");
	assert.equal(textFormat.length > 0, true);
	for (const t of textFormat) assert.equal(kept.includes(t), true);
});

test("serialize of a heading + bold document produces `# ` and `**`", () => {
	const editor = editorWith([HeadingNode]);
	editor.update(
		() => {
			const root = $getRoot();
			root.clear();
			const h = $createHeadingNode("h1");
			h.append($createTextNode("Title"));
			const p = $createParagraphNode();
			const b = $createTextNode("bold");
			b.toggleFormat("bold");
			p.append(b);
			root.append(h, p);
		},
		{ discrete: true },
	);
	let md = "";
	const fmt = markdownPlugin.formats.markdown;
	editor.getEditorState().read(() => {
		md = fmt.serialize(editor);
	});
	assert.match(md, /# Title/);
	assert.match(md, /\*\*bold\*\*/);
});

test("deserialize of `# Hi` with HeadingNode registered yields a heading", () => {
	const editor = editorWith([HeadingNode]);
	const fmt = markdownPlugin.formats.markdown;
	editor.update(() => fmt.deserialize(editor, "# Hi\n\n**b**"), { discrete: true });
	let firstType = "";
	let firstText = "";
	let hasBold = false;
	editor.getEditorState().read(() => {
		const first = $getRoot().getFirstChild();
		firstType = first.getType();
		firstText = first.getTextContent();
		// walk all text nodes for a bold one
		const stack = [$getRoot()];
		while (stack.length) {
			const n = stack.pop();
			if (typeof n.hasFormat === "function" && n.hasFormat("bold")) hasBold = true;
			if (typeof n.getChildren === "function") stack.push(...n.getChildren());
		}
	});
	assert.equal(firstType, "heading");
	assert.equal(firstText, "Hi");
	assert.equal(hasBold, true);
});

test("without HeadingNode, `# Hi` deserializes to literal paragraph text", () => {
	const editor = editorWith([]); // no HeadingNode registered
	const fmt = markdownPlugin.formats.markdown;
	editor.update(() => fmt.deserialize(editor, "# Hi"), { discrete: true });
	let firstType = "";
	let firstText = "";
	editor.getEditorState().read(() => {
		const first = $getRoot().getFirstChild();
		firstType = first.getType();
		firstText = first.getTextContent();
	});
	assert.equal(firstType, "paragraph");
	assert.equal(firstText, "# Hi");
});

test("plugin shape: markdown format, no nodes, no toolbar", () => {
	assert.equal(markdownPlugin.name, "markdown");
	assert.equal(markdownPlugin.nodes, undefined);
	assert.equal(markdownPlugin.toolbar, undefined);
	assert.equal(typeof markdownPlugin.formats.markdown.serialize, "function");
	assert.equal(typeof markdownPlugin.formats.markdown.deserialize, "function");
});

test("createMarkdownPlugin({ shortcuts: false }) still provides the markdown format", () => {
	const p = createMarkdownPlugin({ shortcuts: false });
	assert.equal(typeof p.formats.markdown.serialize, "function");
	// setup returns nothing when shortcuts are off (no disposer to run)
	const editor = editorWith([]);
	const disposer = p.setup({ editor });
	assert.equal(disposer, undefined);
});
