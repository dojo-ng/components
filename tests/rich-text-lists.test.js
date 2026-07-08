// Tests for the rich-text lists plugin, focused on the checklist extension (CK2). Click geometry and
// the Space-toggle are browser checks (happy-dom has no layout); here we verify plugin shape, the
// check-list insert command, checked-state JSON + HTML (value-path) round-trips, and isActive.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createEditor, $getRoot, $createParagraphNode, $createTextNode } from "lexical";
import {
	ListNode,
	ListItemNode,
	$createListNode,
	$createListItemNode,
	$isListNode,
	$isListItemNode,
	INSERT_CHECK_LIST_COMMAND,
} from "@lexical/list";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { listsPlugin } from "../packages/rich-text-lists/dist/index.js";

const makeEditor = () =>
	createEditor({ nodes: [ListNode, ListItemNode], onError: (e) => { throw e; } });

const fakeCtx = (editor) => ({
	editor,
	host: document.createElement("div"),
	command: (type, payload) => editor.dispatchCommand(type, payload),
	onSelectionChange: () => () => {},
	activeFormats: () => new Set(),
});

test("plugin now has three toolbar items (bulleted, numbered, checklist)", () => {
	assert.equal(listsPlugin.name, "lists");
	assert.deepEqual(listsPlugin.nodes, [ListNode, ListItemNode]);
	assert.equal(typeof listsPlugin.toolbar, "function");
	const items = listsPlugin.toolbar(fakeCtx(makeEditor()));
	assert.equal(items.length, 3);
	assert.deepEqual(items.map((i) => i.id), ["bullet-list", "numbered-list", "check-list"]);
});

test("SL2: inserts resolve to bulleted/numbered/checklist ids", () => {
	const items = listsPlugin.inserts(fakeCtx(makeEditor()));
	assert.deepEqual(items.map((i) => i.id), ["bulleted-list", "numbered-list", "checklist"]);
	assert.ok(items.every((i) => typeof i.run === "function" && typeof i.label === "string"));
});

test("INSERT_CHECK_LIST_COMMAND produces a ListNode of type check", () => {
	const editor = makeEditor();
	const dispose = listsPlugin.setup(fakeCtx(editor));
	editor.update(
		() => {
			const root = $getRoot();
			root.clear();
			const p = $createParagraphNode();
			p.append($createTextNode("item"));
			root.append(p);
			p.selectEnd();
			editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
		},
		{ discrete: true },
	);
	let type = "none";
	editor.getEditorState().read(() => {
		const list = $getRoot().getChildren().find($isListNode);
		if (list) type = list.getListType();
	});
	assert.equal(type, "check");
	if (typeof dispose === "function") dispose();
});

test("setChecked round-trips through exportJSON/importJSON (editor-state JSON)", () => {
	// ListItemNode.getChecked() is context-gated (returns undefined unless the parent list is a check
	// list), so a bare item's round-trip can't be read in isolation. The real serialization path — what
	// `value`/state persistence uses — is the editor-state JSON, which rebuilds the check-list context.
	const editor = makeEditor();
	const c = document.createElement("div");
	document.body.appendChild(c);
	editor.setRootElement(c);
	editor.update(
		() => {
			const list = $createListNode("check");
			const a = $createListItemNode();
			a.append($createTextNode("x"));
			a.setChecked(true);
			const b = $createListItemNode();
			b.append($createTextNode("y"));
			b.setChecked(false);
			list.append(a, b);
			$getRoot().clear();
			$getRoot().append(list);
		},
		{ discrete: true },
	);
	const json = JSON.stringify(editor.getEditorState().toJSON());
	assert.match(json, /"checked":true/);
	const parsed = editor.parseEditorState(json);
	let flags = [];
	parsed.read(() => {
		const list = $getRoot().getChildren().find($isListNode);
		flags = list.getChildren().filter($isListItemNode).map((li) => li.getChecked());
	});
	assert.deepEqual(flags, [true, false]);
});

test("checked state survives the value-path HTML serialize -> import round-trip (CK1 branch)", () => {
	const e1 = makeEditor();
	const c1 = document.createElement("div");
	document.body.appendChild(c1);
	e1.setRootElement(c1);
	e1.update(
		() => {
			const list = $createListNode("check");
			const a = $createListItemNode();
			a.append($createTextNode("done"));
			a.setChecked(true);
			const b = $createListItemNode();
			b.append($createTextNode("todo"));
			b.setChecked(false);
			list.append(a, b);
			$getRoot().clear();
			$getRoot().append(list);
		},
		{ discrete: true },
	);
	let htmlOut = "";
	e1.getEditorState().read(() => { htmlOut = $generateHtmlFromNodes(e1, null); });
	assert.match(htmlOut, /__lexicallisttype="check"/);
	assert.match(htmlOut, /aria-checked="true"/);

	const e2 = makeEditor();
	const c2 = document.createElement("div");
	document.body.appendChild(c2);
	e2.setRootElement(c2);
	let flags = [];
	let listType = "";
	e2.update(
		() => {
			const dom = new DOMParser().parseFromString(htmlOut, "text/html");
			const nodes = $generateNodesFromDOM(e2, dom);
			$getRoot().clear();
			$getRoot().append(...nodes);
		},
		{ discrete: true },
	);
	e2.getEditorState().read(() => {
		const list = $getRoot().getChildren().find($isListNode);
		if (list) {
			listType = list.getListType();
			flags = list.getChildren().filter($isListItemNode).map((li) => li.getChecked());
		}
	});
	assert.equal(listType, "check");
	assert.deepEqual(flags, [true, false]);
});

test("checklist toolbar item isActive walks to true inside a check list", () => {
	const editor = makeEditor();
	const ctx = fakeCtx(editor);
	editor.update(
		() => {
			const list = $createListNode("check");
			const item = $createListItemNode();
			item.append($createTextNode("x"));
			list.append(item);
			$getRoot().clear();
			$getRoot().append(list);
			item.getFirstChild().select();
		},
		{ discrete: true },
	);
	const check = listsPlugin.toolbar(ctx).find((i) => i.id === "check-list");
	assert.equal(check.isActive(ctx), true);
});
