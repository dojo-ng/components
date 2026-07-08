// Tests for the slash-command plugin. The caret UI is a browser check (SL4); here we verify the
// trigger regex, the pure aggregation/filter helpers, and that a pick runs the chosen item's run once.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createEditor, $getRoot, $createParagraphNode, $createTextNode } from "lexical";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { headingsPlugin } from "../packages/rich-text-headings/dist/index.js";
import {
	slashPlugin,
	createSlashPlugin,
	aggregateInserts,
	filterInserts,
	DEFAULT_SLASH_TRIGGER,
} from "../packages/rich-text-slash/dist/index.js";

const match = (text) => {
	const m = DEFAULT_SLASH_TRIGGER.exec(text);
	return m ? { start: m.index + m[1].length, query: m[2] } : null;
};

test("trigger regex: accepts '/', 'text /he', rejects 'a/b'", () => {
	assert.deepEqual(match("/"), { start: 0, query: "" });
	assert.deepEqual(match("text /he"), { start: 5, query: "he" });
	assert.equal(match("a/b"), null);
});

test("plugin shape: name slash, no nodes, no toolbar", () => {
	assert.equal(slashPlugin.name, "slash");
	assert.equal(slashPlugin.nodes, undefined);
	assert.equal(slashPlugin.toolbar, undefined);
	assert.equal(typeof slashPlugin.setup, "function");
});

test("aggregateInserts merges static + factory inserts + extra, in plugin order", () => {
	const staticP = { name: "s", inserts: [{ id: "a", label: "A", run: () => {} }] };
	const fnP = { name: "f", inserts: (c) => [{ id: "b", label: "B", run: () => {} }, { id: "c", label: "C", run: () => {} }] };
	const noneP = { name: "n" };
	const ctx = { plugins: [staticP, fnP, noneP] };
	const extra = [{ id: "z", label: "Z", run: () => {} }];
	const items = aggregateInserts(ctx, extra);
	assert.deepEqual(items.map((i) => i.id), ["a", "b", "c", "z"]);
});

test("filterInserts matches label and keywords case-insensitively", () => {
	const items = [
		{ id: "h1", label: "Heading 1", keywords: ["title"], run: () => {} },
		{ id: "quote", label: "Quote", keywords: ["blockquote"], run: () => {} },
		{ id: "img", label: "Image", keywords: ["picture"], run: () => {} },
	];
	assert.deepEqual(filterInserts(items, "HEAD").map((i) => i.id), ["h1"]); // label, case-insensitive
	assert.deepEqual(filterInserts(items, "title").map((i) => i.id), ["h1"]); // keyword
	assert.deepEqual(filterInserts(items, "PICTURE").map((i) => i.id), ["img"]); // keyword, case-insensitive
	assert.deepEqual(filterInserts(items, "").map((i) => i.id), ["h1", "quote", "img"]); // empty → all
	assert.deepEqual(filterInserts(items, "zzz"), []); // no match
});

const mountEditor = () => {
	const editor = createEditor({ onError: (e) => { throw e; } });
	const host = document.createElement("div");
	const editable = document.createElement("div");
	editable.className = "dj-rt-editable";
	host.appendChild(editable);
	document.body.appendChild(host);
	editor.setRootElement(editable);
	return { editor, host };
};

const fakeCtx = (editor, host, plugins) => ({
	editor,
	host,
	command: (type, payload) => editor.dispatchCommand(type, payload),
	onSelectionChange: () => () => {},
	activeFormats: () => new Set(),
	plugins,
});

const typeWithCaret = (editor, text) => {
	editor.update(
		() => {
			const p = $createParagraphNode();
			const t = $createTextNode(text);
			p.append(t);
			$getRoot().clear();
			$getRoot().append(p);
			t.select(text.length, text.length);
		},
		{ discrete: true },
	);
};

test("onPick runs the chosen item's run once", async () => {
	let runs = 0;
	const recorder = { name: "rec", inserts: [{ id: "foo", label: "Foo", keywords: ["f"], run: () => { runs++; } }] };
	const { editor, host } = mountEditor();
	const dispose = slashPlugin.setup(fakeCtx(editor, host, [recorder]));
	typeWithCaret(editor, "/f"); // opens the menu, onQueryChange -> setOptions([Foo])
	const list = [...document.body.querySelectorAll("dj-list")].at(-1);
	assert.ok(list, "the menu created a dj-list");
	list.chooseActive(); // Enter/click path -> pick -> onPick -> item.run
	await new Promise((r) => setTimeout(r, 0));
	assert.equal(runs, 1);
	dispose();
});

test("picking a heading command converts the block (run applies in the removal update)", async () => {
	const editor = createEditor({ nodes: [HeadingNode, QuoteNode], onError: (e) => { throw e; } });
	const host = document.createElement("div");
	const editable = document.createElement("div");
	editable.className = "dj-rt-editable";
	host.appendChild(editable);
	document.body.appendChild(host);
	editor.setRootElement(editable);
	const dispose = slashPlugin.setup(fakeCtx(editor, host, [headingsPlugin]));
	typeWithCaret(editor, "/he"); // filters to Heading 1/2/3; Heading 1 is active
	const list = [...document.body.querySelectorAll("dj-list")].at(-1);
	list.chooseActive(); // pick Heading 1 -> removal + run in one update
	await new Promise((r) => setTimeout(r, 0));
	let type = "", tag = "";
	editor.getEditorState().read(() => {
		const b = $getRoot().getFirstChild();
		type = b?.getType?.() ?? "";
		tag = b?.getTag?.() ?? "";
	});
	assert.equal(type, "heading");
	assert.equal(tag, "h1"); // block converted, not just the "/he" text removed
	dispose();
});

test("createSlashPlugin is independent and shares the shape", () => {
	assert.equal(createSlashPlugin().name, "slash");
	assert.equal(createSlashPlugin({ extra: [] }).name, "slash");
});
