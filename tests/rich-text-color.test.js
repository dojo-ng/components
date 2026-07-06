// Tests for the rich-text color plugin. The overlay/toolbar interaction is a browser check (P6/P7);
// here we verify the pure apply/clear mechanism headlessly and the plugin's object shape.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createEditor, $getRoot, $createParagraphNode, $createTextNode } from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $patchStyleText } from "@lexical/selection";
import {
	colorPlugin,
	backgroundColorPlugin,
	createColorPlugin,
	applyColor,
	colorStyleImportMap,
} from "../packages/rich-text-color/dist/index.js";

function editorWithText(text = "hello") {
	const editor = createEditor({ onError: (e) => { throw e; } });
	editor.update(
		() => {
			const root = $getRoot();
			root.clear();
			const p = $createParagraphNode();
			const t = $createTextNode(text);
			p.append(t);
			root.append(p);
			t.select(0, text.length); // set a range selection over the text
		},
		{ discrete: true },
	);
	return editor;
}

function htmlOf(editor) {
	let out = "";
	editor.getEditorState().read(() => { out = $generateHtmlFromNodes(editor, null); });
	return out;
}

test("plugin shape: color/background names, one render toolbar item, no nodes", () => {
	assert.equal(colorPlugin.name, "color");
	assert.equal(backgroundColorPlugin.name, "background-color");
	assert.equal(colorPlugin.nodes, undefined);
	assert.equal(colorPlugin.toolbar.length, 1);
	assert.equal(typeof colorPlugin.toolbar[0].render, "function");
	assert.equal(colorPlugin.toolbar[0].run, undefined);
});

test("$patchStyleText applies color that $generateHtmlFromNodes emits, then clears", () => {
	const editor = editorWithText();
	editor.update(
		() => {
			const t = $getRoot().getFirstChild().getFirstChild();
			$patchStyleText(t.select(0, 5), { color: "rgb(255, 0, 0)" });
		},
		{ discrete: true },
	);
	assert.match(htmlOf(editor), /color:\s*rgb\(255, 0, 0\)/);

	editor.update(
		() => {
			const t = $getRoot().getFirstChild().getFirstChild();
			$patchStyleText(t.select(0, 5), { color: null });
		},
		{ discrete: true },
	);
	assert.doesNotMatch(htmlOf(editor), /color:\s*rgb\(255, 0, 0\)/);
});

test("$patchStyleText applies background-color that survives to HTML, then clears", () => {
	const editor = editorWithText();
	editor.update(
		() => {
			const t = $getRoot().getFirstChild().getFirstChild();
			$patchStyleText(t.select(0, 5), { "background-color": "rgb(255, 255, 0)" });
		},
		{ discrete: true },
	);
	assert.match(htmlOf(editor), /background-color:\s*rgb\(255, 255, 0\)/);

	editor.update(
		() => {
			const t = $getRoot().getFirstChild().getFirstChild();
			$patchStyleText(t.select(0, 5), { "background-color": null });
		},
		{ discrete: true },
	);
	assert.doesNotMatch(htmlOf(editor), /background-color:\s*rgb\(255, 255, 0\)/);
});

test("colorStyleImportMap preserves inline color/background on DOM import (the P6 hook)", () => {
	// Without the hook, $generateNodesFromDOM drops inline color; with the plugin's html.import
	// override it survives, so a value round-trip keeps colors.
	const plugin = colorPlugin;
	assert.ok(plugin.html && plugin.html.import, "colorPlugin contributes html.import");
	const editor = createEditor({ html: { import: colorStyleImportMap() }, onError: (e) => { throw e; } });
	editor.update(
		() => {
			const root = $getRoot();
			root.clear();
			const dom = new DOMParser().parseFromString(
				'<p><span style="color: rgb(255, 0, 0); background-color: rgb(0, 255, 0);">hi</span></p>',
				"text/html",
			);
			for (const n of $generateNodesFromDOM(editor, dom)) root.append(n);
		},
		{ discrete: true },
	);
	const out = (() => { let s = ""; editor.getEditorState().read(() => { s = $generateHtmlFromNodes(editor, null); }); return s; })();
	assert.match(out, /color:\s*rgb\(255, 0, 0\)/);
	assert.match(out, /background-color:\s*rgb\(0, 255, 0\)/);
});

test("applyColor is a safe no-op when there is no range selection", () => {
	// Headless editors don't retain a selection across updates (that needs a DOM selection — the
	// live overlay path is a browser check, P6/P7). applyColor must simply not throw here.
	const editor = editorWithText();
	const ctx = { editor, host: { focus() {} } };
	assert.doesNotThrow(() => applyColor(ctx, "color", "rgb(0, 128, 0)"));
	assert.doesNotThrow(() => applyColor(ctx, "color", null));
	// createColorPlugin honors the styleProperty option.
	assert.equal(createColorPlugin({ styleProperty: "background-color" }).name, "background-color");
});
