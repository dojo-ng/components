// Tests for the auto-link plugin. All headless: createEditor({ nodes: [AutoLinkNode, LinkNode] }) with
// the transform registered via the plugin's setup. Transforms run inside editor.update, so assertions
// come after the update returns.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createEditor, $getRoot, $createParagraphNode, $createTextNode, $nodesOfType } from "lexical";
import { AutoLinkNode, LinkNode, $isLinkNode, $isAutoLinkNode } from "@lexical/link";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { autolinkPlugin } from "../packages/rich-text-autolink/dist/index.js";

const setup = () => {
	const editor = createEditor({ nodes: [AutoLinkNode, LinkNode], onError: (e) => { throw e; } });
	const ctx = {
		editor,
		host: document.createElement("div"),
		command: (t, p) => editor.dispatchCommand(t, p),
		onSelectionChange: () => () => {},
		activeFormats: () => new Set(),
		plugins: [],
	};
	const dispose = autolinkPlugin.setup(ctx);
	return { editor, dispose };
};

const typeText = (editor, text) => {
	editor.update(
		() => {
			const root = $getRoot();
			root.clear();
			const p = $createParagraphNode();
			p.append($createTextNode(text));
			root.append(p);
		},
		{ discrete: true },
	);
};

const read = (editor, fn) => { let r; editor.getEditorState().read(() => { r = fn(); }); return r; };
// Read node data INSIDE the read scope (Lexical forbids node access outside read/update).
const linkInfo = (editor) => read(editor, () => $nodesOfType(AutoLinkNode).map((n) => ({ url: n.getURL(), text: n.getTextContent() })));
const rootText = (editor) => read(editor, () => $getRoot().getTextContent());

test("wraps a URL and leaves the surrounding text intact", () => {
	const { editor, dispose } = setup();
	typeText(editor, "see https://example.com now");
	const ls = linkInfo(editor);
	assert.equal(ls.length, 1);
	assert.equal(ls[0].url, "https://example.com");
	assert.equal(ls[0].text, "https://example.com");
	assert.equal(rootText(editor), "see https://example.com now");
	dispose?.();
});

// A URL/email links only once a separator follows it (mimics typing then pressing space); the trailing
// space in these inputs is what triggers the wrap. End-of-text alone must NOT link (see the dedicated test).
test("www. URLs get an https:// href; emails get mailto:", () => {
	const { editor, dispose } = setup();
	typeText(editor, "go www.example.com ");
	assert.equal(linkInfo(editor)[0].url, "https://www.example.com");
	typeText(editor, "mail bill@bitranch.com ");
	assert.equal(linkInfo(editor)[0].url, "mailto:bill@bitranch.com");
	dispose?.();
});

test("a trailing period stays outside the link", () => {
	const { editor, dispose } = setup();
	typeText(editor, "read https://a.example. ");
	const ls = linkInfo(editor);
	assert.equal(ls.length, 1);
	assert.equal(ls[0].text, "https://a.example");
	assert.equal(rootText(editor), "read https://a.example. ");
	dispose?.();
});

test("does NOT link while still typing (no separator yet), only after one", () => {
	const { editor, dispose } = setup();
	// Mid-typing: a valid-but-partial match sits at end-of-text — must not link yet.
	typeText(editor, "https://www.bitranch.c");
	assert.equal(linkInfo(editor).length, 0);
	typeText(editor, "mail bill@bitranch.com"); // finished but no trailing separator
	assert.equal(linkInfo(editor).length, 0);
	// Once a space follows, the WHOLE URL links (not a truncated prefix).
	typeText(editor, "see https://www.bitranch.com ");
	const ls = linkInfo(editor);
	assert.equal(ls.length, 1);
	assert.equal(ls[0].text, "https://www.bitranch.com");
	assert.equal(ls[0].url, "https://www.bitranch.com");
	dispose?.();
});

test("no link when the leading boundary fails or there is no TLD", () => {
	const { editor, dispose } = setup();
	typeText(editor, "xhttps://a.example "); // 'x' before the scheme fails the leading boundary
	assert.equal(linkInfo(editor).length, 0);
	typeText(editor, "ping user@host "); // no dotted TLD -> not an email
	assert.equal(linkInfo(editor).length, 0);
	dispose?.();
});

test("idempotent: re-running the transform on the wrapped text makes no change", () => {
	const { editor, dispose } = setup();
	typeText(editor, "at https://example.com ");
	assert.equal(linkInfo(editor).length, 1);
	// Dirty the inner text node so the transform runs again; it must not nest or duplicate.
	editor.update(() => { $nodesOfType(AutoLinkNode)[0].getFirstChild().markDirty(); }, { discrete: true });
	const ls = linkInfo(editor);
	assert.equal(ls.length, 1);
	assert.equal(ls[0].url, "https://example.com");
	dispose?.();
});

test("editing the inner text so it no longer matches unwraps the link", () => {
	const { editor, dispose } = setup();
	typeText(editor, "x https://example.com ");
	assert.equal(linkInfo(editor).length, 1);
	editor.update(() => { $nodesOfType(AutoLinkNode)[0].getFirstChild().setTextContent("not a url"); }, { discrete: true });
	assert.equal(linkInfo(editor).length, 0);
	assert.match(rootText(editor), /not a url/);
	dispose?.();
});

test("HTML round-trip: exports <a href> and re-imports a link node", () => {
	const { editor, dispose } = setup();
	typeText(editor, "at https://example.com ");
	const out = read(editor, () => $generateHtmlFromNodes(editor, null));
	assert.match(out, /<a[^>]*href="https:\/\/example\.com"/);
	let reimported = false;
	editor.update(
		() => {
			const dom = new DOMParser().parseFromString('<a href="https://x.com">x</a>', "text/html");
			reimported = $generateNodesFromDOM(editor, dom).some((n) => $isLinkNode(n) || $isAutoLinkNode(n));
		},
		{ discrete: true },
	);
	assert.equal(reimported, true);
	dispose?.();
});
