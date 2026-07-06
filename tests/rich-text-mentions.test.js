// Tests for the mentions plugin. The caret menu, spinner, and pill insertion are browser checks (MN4);
// here we verify the MentionNode (text/mode, JSON + HTML round-trips) and the default trigger regex.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createEditor, $getRoot, $createParagraphNode } from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import {
	MentionNode,
	$createMentionNode,
	$isMentionNode,
	DEFAULT_MENTION_TRIGGER,
} from "../packages/rich-text-mentions/dist/index.js";

const makeEditor = () => createEditor({ nodes: [MentionNode], onError: (e) => { throw e; } });

const runMatch = (text) => {
	const m = DEFAULT_MENTION_TRIGGER.exec(text);
	return m ? { start: m.index + m[1].length, query: m[2] } : null;
};

test("$createMentionNode makes an '@label' segmented text node", () => {
	const editor = makeEditor();
	editor.update(
		() => {
			const node = $createMentionNode("u1", "Jeff");
			assert.equal($isMentionNode(node), true);
			assert.equal(node.getTextContent(), "@Jeff");
			assert.equal(node.getMode(), "segmented");
			assert.equal(node.getId(), "u1");
		},
		{ discrete: true },
	);
});

test("exportJSON/importJSON round-trips the id", () => {
	const editor = makeEditor();
	editor.update(
		() => {
			const node = $createMentionNode("u1", "Jeff");
			const json = node.exportJSON();
			assert.equal(json.type, "dj-mention");
			assert.equal(json.id, "u1");
			assert.equal(json.text, "@Jeff");
			const back = MentionNode.importJSON(json);
			assert.equal(back.getId(), "u1");
			assert.equal(back.getTextContent(), "@Jeff");
		},
		{ discrete: true },
	);
});

test("$generateHtmlFromNodes emits span[data-dj-mention] and it re-imports as a MentionNode", () => {
	const editor = makeEditor();
	const c = document.createElement("div");
	document.body.appendChild(c);
	editor.setRootElement(c);
	editor.update(
		() => {
			const para = $createParagraphNode();
			para.append($createMentionNode("u1", "Jeff"));
			$getRoot().clear();
			$getRoot().append(para);
		},
		{ discrete: true },
	);
	let htmlOut = "";
	editor.getEditorState().read(() => { htmlOut = $generateHtmlFromNodes(editor, null); });
	assert.match(htmlOut, /<span[^>]*data-dj-mention="u1"[^>]*>@Jeff<\/span>/);

	let id = null;
	let isMention = false;
	editor.update(
		() => {
			const dom = new DOMParser().parseFromString(htmlOut, "text/html");
			const nodes = $generateNodesFromDOM(editor, dom);
			const walk = (ns) => ns.forEach((n) => {
				if ($isMentionNode(n)) { isMention = true; id = n.getId(); }
				else if (typeof n.getChildren === "function") walk(n.getChildren());
			});
			walk(nodes);
		},
		{ discrete: true },
	);
	assert.equal(isMention, true);
	assert.equal(id, "u1");
});

test("default trigger: matches 'hi @jo' and ' @', rejects 'email@host'", () => {
	assert.deepEqual(runMatch("hi @jo"), { start: 3, query: "jo" });
	assert.deepEqual(runMatch(" @"), { start: 1, query: "" });
	assert.equal(runMatch("email@host"), null);
});
