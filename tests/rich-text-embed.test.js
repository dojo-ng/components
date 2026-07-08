// Tests for the rich-text embed plugin. The insert dialog, iframe rendering, and dj-video/dj-audio
// playback are browser checks (EM2); here we verify the pure matchers, the EmbedNode headlessly
// (JSON + DOM round-trips), that INSERT_EMBED_COMMAND inserts, and the plugin shape.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createEditor, $getRoot, $createParagraphNode, $nodesOfType } from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import {
	EmbedNode,
	$createEmbedNode,
	$isEmbedNode,
	INSERT_EMBED_COMMAND,
	embedPlugin,
	matchEmbed,
	defaultMatchers,
} from "../packages/rich-text-embed/dist/index.js";

const makeEditor = () => createEditor({ nodes: [EmbedNode], onError: (e) => { throw e; } });

test("matchers: youtube watch/short/share/embed URLs extract the id", () => {
	assert.deepEqual(matchEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), { kind: "youtube", src: "dQw4w9WgXcQ" });
	assert.deepEqual(matchEmbed("https://youtu.be/dQw4w9WgXcQ"), { kind: "youtube", src: "dQw4w9WgXcQ" });
	assert.deepEqual(matchEmbed("https://www.youtube.com/shorts/dQw4w9WgXcQ"), { kind: "youtube", src: "dQw4w9WgXcQ" });
	assert.deepEqual(matchEmbed("https://www.youtube.com/embed/dQw4w9WgXcQ"), { kind: "youtube", src: "dQw4w9WgXcQ" });
});

test("matchers: vimeo, direct video, direct audio", () => {
	assert.deepEqual(matchEmbed("https://vimeo.com/123456789"), { kind: "vimeo", src: "123456789" });
	assert.deepEqual(matchEmbed("https://cdn.example.com/clip.mp4"), { kind: "video", src: "https://cdn.example.com/clip.mp4" });
	assert.deepEqual(matchEmbed("https://cdn.example.com/song.mp3"), { kind: "audio", src: "https://cdn.example.com/song.mp3" });
});

test("matchers: unsupported and unsafe URLs do not match", () => {
	assert.equal(matchEmbed("javascript:alert(1)"), undefined);
	assert.equal(matchEmbed("ftp://x/y.mp4"), undefined); // .mp4 but non-http scheme
	assert.equal(matchEmbed("https://example.com/article/how-to"), undefined);
	assert.equal(matchEmbed("not a url"), undefined);
});

test("plugin shape: name embed, contributes EmbedNode, one render toolbar item", () => {
	assert.equal(embedPlugin.name, "embed");
	assert.deepEqual(embedPlugin.nodes, [EmbedNode]);
	assert.equal(embedPlugin.toolbar.length, 1);
	assert.equal(typeof embedPlugin.toolbar[0].render, "function");
	assert.ok(defaultMatchers.length >= 4);
});

test("exportJSON/importJSON round-trip preserves kind/src/title", () => {
	const editor = makeEditor();
	editor.update(
		() => {
			const node = $createEmbedNode({ kind: "youtube", src: "abc123", title: "Demo" });
			const json = node.exportJSON();
			assert.equal(json.type, "dj-embed");
			assert.equal(json.version, 1);
			const back = EmbedNode.importJSON(json);
			assert.equal(back.getKindValue(), "youtube");
			assert.equal(back.getSrc(), "abc123");
			assert.equal(back.getTitle(), "Demo");
		},
		{ discrete: true },
	);
});

test("$generateHtmlFromNodes emits div[data-dj-embed] with a reconstructed watch-URL anchor", () => {
	const editor = makeEditor();
	editor.update(
		() => {
			const root = $getRoot();
			root.clear();
			root.append($createEmbedNode({ kind: "youtube", src: "abc123" }));
		},
		{ discrete: true },
	);
	let out = "";
	editor.getEditorState().read(() => { out = $generateHtmlFromNodes(editor, null); });
	assert.match(out, /data-dj-embed="youtube"/);
	assert.match(out, /data-src="abc123"/);
	assert.match(out, /href="https:\/\/www\.youtube\.com\/watch\?v=abc123"/);
});

test("$generateNodesFromDOM recreates an EmbedNode from the exported div", () => {
	const editor = makeEditor();
	let node = null;
	editor.update(
		() => {
			const html = '<div data-dj-embed="vimeo" data-src="987" data-title="Clip"><a href="https://vimeo.com/987">Clip</a></div>';
			const dom = new DOMParser().parseFromString(html, "text/html");
			node = $generateNodesFromDOM(editor, dom).find($isEmbedNode);
		},
		{ discrete: true },
	);
	assert.ok(node);
	assert.equal(node.getKindValue(), "vimeo");
	assert.equal(node.getSrc(), "987");
	assert.equal(node.getTitle(), "Clip");
});

test("INSERT_EMBED_COMMAND inserts an EmbedNode into the document", () => {
	const editor = makeEditor();
	const ctx = {
		editor,
		host: document.createElement("div"),
		command: (type, payload) => editor.dispatchCommand(type, payload),
		onSelectionChange: () => () => {},
		activeFormats: () => new Set(),
	};
	const dispose = embedPlugin.setup(ctx);
	editor.update(
		() => {
			const root = $getRoot();
			root.clear();
			const p = $createParagraphNode();
			root.append(p);
			p.selectEnd();
			editor.dispatchCommand(INSERT_EMBED_COMMAND, { kind: "video", src: "https://x/clip.mp4" });
		},
		{ discrete: true },
	);
	let count = 0;
	let src = null;
	editor.getEditorState().read(() => {
		const nodes = $nodesOfType(EmbedNode);
		count = nodes.length;
		if (nodes[0]) src = nodes[0].getSrc();
	});
	assert.equal(count, 1);
	assert.equal(src, "https://x/clip.mp4");
	if (typeof dispose === "function") dispose();
});
