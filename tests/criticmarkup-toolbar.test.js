// Track T3 of rich-text-criticmarkup-spec.md: the assembled plugin's toolbar (six controls in
// group `criticmarkup`) and setup(). Headless assertions only — Tab order, Enter/Space activation,
// and the axe pass are real-browser checks, in components/tests/browser/.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createEditor, $getRoot, $createParagraphNode, $createTextNode } from "lexical";
import {
	InsertionNode,
	DeletionNode,
	HighlightNode,
	CommentNode,
	BreakNode,
	deserializeCriticMarkup,
	createCriticMarkupPlugin,
	criticMarkupPlugin,
} from "../packages/rich-text-criticmarkup/dist/index.js";

const ALL_NODES = [InsertionNode, DeletionNode, HighlightNode, CommentNode, BreakNode];

function editorWith() {
	const editor = createEditor({ nodes: ALL_NODES, onError: (e) => { throw e; } });
	editor.setRootElement(document.createElement("div"));
	return editor;
}

/** A host element containing a real, attached root — the shape `setup()`'s decorator mounting and
 * the comment popup (appended to `ctx.host`) both need to do anything observable. */
function editorWithAttachedHost() {
	const editor = createEditor({ nodes: ALL_NODES, onError: (e) => { throw e; } });
	const host = document.createElement("div");
	const root = document.createElement("div");
	root.contentEditable = "true";
	host.appendChild(root);
	document.body.appendChild(host);
	editor.setRootElement(root);
	return { editor, host };
}

/** A minimal RichTextContext — everything the toolbar's own callbacks touch. */
function contextFor(editor) {
	return {
		editor,
		host: editor.getRootElement().parentElement ?? document.createElement("div"),
		command: (type, payload) => editor.dispatchCommand(type, payload),
		onSelectionChange: () => () => {},
		activeFormats: () => new Set(),
		plugins: [],
	};
}

function selectAt(editor, offset) {
	editor.update(() => {
		const p = $getRoot().getFirstChild();
		const t = p.getFirstChild();
		t.select(offset, offset);
	}, { discrete: true });
}

test("criticMarkupPlugin/createCriticMarkupPlugin: name, nodes, and a criticmarkup format", () => {
	const plugin = createCriticMarkupPlugin();
	assert.equal(plugin.name, "criticmarkup");
	assert.equal(plugin.nodes.length, 5);
	assert.ok(plugin.formats && plugin.formats.criticmarkup);
	assert.equal(typeof plugin.formats.criticmarkup.serialize, "function");
	assert.equal(typeof plugin.formats.criticmarkup.deserialize, "function");
	assert.equal(criticMarkupPlugin.name, "criticmarkup");
});

test("the criticmarkup format round-trips through the plugin object itself", () => {
	const editor = editorWith();
	const plugin = createCriticMarkupPlugin();
	const source = "{++ins++} {--del--}";
	editor.update(() => plugin.formats.criticmarkup.deserialize(editor, source), { discrete: true });
	let out = "";
	editor.getEditorState().read(() => { out = plugin.formats.criticmarkup.serialize(editor); });
	assert.equal(out, source);
});

test("toolbar() returns six items with the expected ids and group, every label non-empty", () => {
	const editor = editorWith();
	editor.update(() => {
		const root = $getRoot();
		root.clear();
		const p = $createParagraphNode();
		p.append($createTextNode("plain prose"));
		root.append(p);
	}, { discrete: true });
	const plugin = createCriticMarkupPlugin();
	const ctx = contextFor(editor);
	const items = plugin.toolbar(ctx);
	assert.equal(items.length, 6);
	const expectedIds = [
		"criticmarkup-suggest",
		"criticmarkup-accept",
		"criticmarkup-reject",
		"criticmarkup-accept-all",
		"criticmarkup-reject-all",
		"criticmarkup-add-comment",
	];
	assert.deepEqual(items.map((i) => i.id).sort(), [...expectedIds].sort());
	for (const item of items) {
		assert.equal(item.group, "criticmarkup", `${item.id} group`);
		assert.equal(typeof item.label, "string", `${item.id} label`);
		assert.ok(item.label.length > 0, `${item.id} label non-empty`);
	}
});

test("toolbar({toolbar:false}) contributes no toolbar", () => {
	const plugin = createCriticMarkupPlugin({ toolbar: false });
	assert.equal(plugin.toolbar, undefined);
});

test("the suggest-edits item's isActive reflects suggestion mode", () => {
	const editor = editorWith();
	editor.update(() => {
		const root = $getRoot();
		root.clear();
		root.append($createParagraphNode().append($createTextNode("x")));
	}, { discrete: true });
	const plugin = createCriticMarkupPlugin();
	const ctx = contextFor(editor);
	const suggest = plugin.toolbar(ctx).find((i) => i.id === "criticmarkup-suggest");
	assert.equal(suggest.isActive(ctx), false);
	suggest.run(ctx);
	assert.equal(suggest.isActive(ctx), true);
	suggest.run(ctx);
	assert.equal(suggest.isActive(ctx), false);
});

test("accept/reject-at-cursor report disabled in plain prose, enabled inside a mark", () => {
	const editor = editorWith();
	editor.update(() => deserializeCriticMarkup(editor, "plain {++ins++} prose"), { discrete: true });
	const plugin = createCriticMarkupPlugin();
	const ctx = contextFor(editor);
	const accept = plugin.toolbar(ctx).find((i) => i.id === "criticmarkup-accept");
	const reject = plugin.toolbar(ctx).find((i) => i.id === "criticmarkup-reject");

	selectAt(editor, 2); // inside "plain"
	assert.equal(accept.isDisabled(ctx), true);
	assert.equal(reject.isDisabled(ctx), true);

	// The document is one paragraph with children [text"plain ", InsertionNode["ins"], text" prose"];
	// select inside the insertion's own text node directly, since flattened-offset selection isn't
	// this test's concern (that is covered by the suggestion-mode/resolution test files' `locate`).
	editor.update(() => {
		const p = $getRoot().getFirstChild();
		const insertion = p.getChildren().find((n) => n.getType() === "dj-criticmarkup-insertion");
		insertion.getFirstChild().select(1, 1);
	}, { discrete: true });
	assert.equal(accept.isDisabled(ctx), false);
	assert.equal(reject.isDisabled(ctx), false);
});

test("accept-at-cursor's run() accepts the mark under the caret", () => {
	const editor = editorWith();
	editor.update(() => deserializeCriticMarkup(editor, "{++ins++}"), { discrete: true });
	const plugin = createCriticMarkupPlugin();
	const ctx = contextFor(editor);
	editor.update(() => {
		const p = $getRoot().getFirstChild();
		p.getFirstChild().getFirstChild().select(0, 0);
	}, { discrete: true });
	const accept = plugin.toolbar(ctx).find((i) => i.id === "criticmarkup-accept");
	accept.run(ctx);
	let value = "";
	editor.getEditorState().read(() => { value = plugin.formats.criticmarkup.serialize(editor); });
	assert.equal(value, "ins");
});

// --- setup(): styles, decorator mounting, the comment popup shell --------------------------------

test("setup() injects the content styles once and returns a disposer", () => {
	document.getElementById("dj-rich-text-criticmarkup")?.remove();
	const { editor, host } = editorWithAttachedHost();
	const plugin = createCriticMarkupPlugin();
	const ctx = { editor, host, command: () => {}, onSelectionChange: () => () => {}, activeFormats: () => new Set(), plugins: [] };
	const dispose = plugin.setup(ctx);
	assert.ok(document.getElementById("dj-rich-text-criticmarkup"), "content styles should be injected");
	assert.equal(typeof dispose, "function");
	dispose();
	host.remove();
});

test("setup() mounts the shared comment popup into the host", () => {
	const { editor, host } = editorWithAttachedHost();
	const plugin = createCriticMarkupPlugin();
	const ctx = { editor, host, command: () => {}, onSelectionChange: () => () => {}, activeFormats: () => new Set(), plugins: [] };
	const dispose = plugin.setup(ctx);
	assert.ok(host.querySelector("dj-popup.dj-cm-comment-popup"), "the comment popup should be appended to the host");
	dispose();
	host.remove();
});

test("clicking a bare comment's decorator button opens the shared popup, seeded with its text", () => {
	const { editor, host } = editorWithAttachedHost();
	const plugin = createCriticMarkupPlugin();
	const ctx = { editor, host, command: () => {}, onSelectionChange: () => () => {}, activeFormats: () => new Set(), plugins: [] };
	const dispose = plugin.setup(ctx);
	editor.update(() => deserializeCriticMarkup(editor, "{>>note<<}"), { discrete: true });
	const button = host.querySelector(".dj-cm-comment-button");
	assert.ok(button, "the comment decorator's button should be mounted in the DOM");
	button.click();
	const popup = host.querySelector("dj-popup.dj-cm-comment-popup");
	assert.equal(popup.open, true);
	const textArea = popup.querySelector("dj-text-area");
	assert.equal(textArea.value, "note");
	dispose();
	host.remove();
});

test("clicking a highlight that carries a comment opens the shared popup too", () => {
	const { editor, host } = editorWithAttachedHost();
	const plugin = createCriticMarkupPlugin();
	const ctx = { editor, host, command: () => {}, onSelectionChange: () => () => {}, activeFormats: () => new Set(), plugins: [] };
	const dispose = plugin.setup(ctx);
	editor.update(() => deserializeCriticMarkup(editor, "{==hl==}{>>anchored<<}"), { discrete: true });
	const mark = host.querySelector(".dj-cm-highlight.dj-cm-has-comment");
	assert.ok(mark, "a highlight with a comment should carry the dj-cm-has-comment class");
	mark.click();
	const popup = host.querySelector("dj-popup.dj-cm-comment-popup");
	assert.equal(popup.open, true);
	const textArea = popup.querySelector("dj-text-area");
	assert.equal(textArea.value, "anchored");
	dispose();
	host.remove();
});

// --- decorator re-mount does not multiply the DOM (Bill's own browser-confirmation pass, 2026-09-10) -
//
// `CommentNode`/`BreakNode.decorate()` can hand back a NEW element instance on a call that has
// nothing to do with the node's own content — Lexical clones a node whenever ITS OWN `__next`/`__prev`
// sibling pointer changes, which an adjacent edit does even though the comment/break itself was
// never touched, and a fresh clone's per-instance element cache starts empty. Live-browser testing
// found the mount code in `setup()` only appended a decorator's element if it was not ALREADY a
// child of its container — leaving the PREVIOUS call's now-orphaned element sitting there forever, so
// a single comment visibly multiplied into several with every nearby edit. Fixed by having the mount
// replace the container's content outright rather than conditionally appending to it.

test("a CommentNode's decorator button does not multiply when an unrelated adjacent edit re-clones it", () => {
	const { editor, host } = editorWithAttachedHost();
	const plugin = createCriticMarkupPlugin();
	const ctx = { editor, host, command: () => {}, onSelectionChange: () => () => {}, activeFormats: () => new Set(), plugins: [] };
	const dispose = plugin.setup(ctx);
	editor.update(() => deserializeCriticMarkup(editor, "text{>>note<<}"), { discrete: true });
	assert.equal(host.querySelectorAll(".dj-cm-comment-button").length, 1);

	// an edit immediately before the comment touches its own __prev sibling pointer, forcing a clone
	editor.update(() => {
		const p = $getRoot().getFirstChild();
		p.getFirstChild().insertAfter($createTextNode("!"));
	}, { discrete: true });
	assert.equal(host.querySelectorAll(".dj-cm-comment-button").length, 1, "a re-decorated comment must not leave a stale duplicate button behind");

	editor.update(() => {
		const p = $getRoot().getFirstChild();
		p.getFirstChild().insertAfter($createTextNode("?"));
	}, { discrete: true });
	assert.equal(host.querySelectorAll(".dj-cm-comment-button").length, 1, "still exactly one button after a second nearby edit");

	dispose();
	host.remove();
});
