// Tests for the rich-text image plugin. Dialog flow + decorator mounting are browser checks
// (P6/P7); here we verify the ImageNode headlessly (JSON + DOM round-trips) and that
// INSERT_IMAGE_COMMAND inserts a node.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
	createEditor,
	$getRoot,
	$createParagraphNode,
	$nodesOfType,
} from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import {
	ImageNode,
	$createImageNode,
	$isImageNode,
	INSERT_IMAGE_COMMAND,
	imagePlugin,
} from "../packages/rich-text-image/dist/index.js";

const makeEditor = () => createEditor({ nodes: [ImageNode], onError: (e) => { throw e; } });

test("plugin shape: name image, contributes ImageNode, one render toolbar item", () => {
	assert.equal(imagePlugin.name, "image");
	assert.deepEqual(imagePlugin.nodes, [ImageNode]);
	assert.equal(imagePlugin.toolbar.length, 1);
	assert.equal(typeof imagePlugin.toolbar[0].render, "function");
});

test("SL2: inserts resolve to the image id", () => {
	assert.deepEqual(imagePlugin.inserts.map((i) => i.id), ["image"]);
	assert.equal(typeof imagePlugin.inserts[0].run, "function");
});

test("exportJSON/importJSON round-trip", () => {
	const editor = makeEditor();
	editor.update(
		() => {
			const node = $createImageNode({ src: "a.png", alt: "a cat", width: 120, height: 80 });
			const json = node.exportJSON();
			assert.equal(json.type, "dj-image");
			assert.equal(json.version, 1);
			const back = ImageNode.importJSON(json);
			assert.equal(back.getSrc(), "a.png");
			assert.equal(back.getAlt(), "a cat");
			assert.equal(back.exportJSON().width, 120);
			assert.equal(back.exportJSON().height, 80);
		},
		{ discrete: true },
	);
});

test("$generateHtmlFromNodes emits <img> with src and alt", () => {
	const editor = makeEditor();
	editor.update(
		() => {
			const root = $getRoot();
			root.clear();
			root.append($createImageNode({ src: "x.png", alt: "a cat" }));
		},
		{ discrete: true },
	);
	let out = "";
	editor.getEditorState().read(() => { out = $generateHtmlFromNodes(editor, null); });
	assert.match(out, /<img[^>]*src="x\.png"/);
	assert.match(out, /alt="a cat"/);
});

test("importDOM converts <img>; a missing alt becomes empty string", () => {
	const editor = makeEditor();
	let src = null;
	let alt = null;
	let isImage = false;
	editor.update(
		() => {
			const dom = new DOMParser().parseFromString('<img src="y.png">', "text/html");
			const nodes = $generateNodesFromDOM(editor, dom);
			const node = nodes.find($isImageNode);
			isImage = !!node;
			if (node) { src = node.getSrc(); alt = node.getAlt(); }
		},
		{ discrete: true },
	);
	assert.equal(isImage, true);
	assert.equal(src, "y.png");
	assert.equal(alt, "");
});

test("INSERT_IMAGE_COMMAND inserts an ImageNode into the document", () => {
	const editor = makeEditor();
	// Register the command via the plugin's setup with a minimal context.
	const ctx = {
		editor,
		host: document.createElement("div"),
		command: (type, payload) => editor.dispatchCommand(type, payload),
		onSelectionChange: () => () => {},
		activeFormats: () => new Set(),
	};
	const dispose = imagePlugin.setup(ctx);
	// Dispatch inside an update so the freshly-set selection is live for $insertNodes (headless
	// editors don't retain a selection across update boundaries).
	editor.update(
		() => {
			const root = $getRoot();
			root.clear();
			const p = $createParagraphNode();
			root.append(p);
			p.selectEnd();
			editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src: "z.png", alt: "z" });
		},
		{ discrete: true },
	);
	let count = 0;
	let src = null;
	editor.getEditorState().read(() => {
		const imgs = $nodesOfType(ImageNode);
		count = imgs.length;
		if (imgs[0]) src = imgs[0].getSrc();
	});
	assert.equal(count, 1);
	assert.equal(src, "z.png");
	if (typeof dispose === "function") dispose();
});
