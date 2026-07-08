import { html } from "lit";
import { $getSelection, $isRangeSelection, $createParagraphNode } from "lexical";
import {
	$createHeadingNode, $createQuoteNode, $isHeadingNode,
	HeadingNode, QuoteNode, type HeadingTagType,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { defineRichTextPlugin, type RichTextContext } from "@dojo-ng/rich-text";

/**
 * Headings plugin for `<dj-rich-text>`. Contributes the heading and quote node classes and a
 * block-type `<select>` that converts the current block(s) to a paragraph, H1–H3, or quote. Because
 * Lexical needs node classes at editor creation, including this plugin is what makes headings and
 * quotes available; the core editor registers neither on its own.
 */

type BlockType = "paragraph" | "h1" | "h2" | "h3" | "quote";

/** The block type of the current selection's top-level block (`paragraph` when none applies). */
function currentBlockType(ctx: RichTextContext): BlockType {
	let type: BlockType = "paragraph";
	ctx.editor.getEditorState().read(() => {
		const sel = $getSelection();
		if (!$isRangeSelection(sel)) return;
		const block = sel.anchor.getNode().getTopLevelElement();
		if (!block) return;
		if ($isHeadingNode(block)) { type = block.getTag() as BlockType; return; }
		if (block.getType() === "quote") type = "quote";
	});
	return type;
}

/** Convert the selected block(s) to `value`, then return focus to the editor. */
function setBlockType(ctx: RichTextContext, value: BlockType) {
	ctx.editor.update(() => {
		const sel = $getSelection();
		if (!$isRangeSelection(sel)) return;
		$setBlocksType(sel, () =>
			value === "paragraph" ? $createParagraphNode()
				: value === "quote" ? $createQuoteNode()
					: $createHeadingNode(value as HeadingTagType));
	});
	ctx.host.focus();
}

export const headingsPlugin = defineRichTextPlugin({
	name: "headings",
	nodes: [HeadingNode, QuoteNode],
	// Slash-menu block conversions. `run` reuses the same setBlockType logic as the toolbar select.
	inserts: [
		{ id: "paragraph", label: "Paragraph", keywords: ["p"], run: (ctx) => setBlockType(ctx, "paragraph") },
		{ id: "h1", label: "Heading 1", keywords: ["h1", "title"], run: (ctx) => setBlockType(ctx, "h1") },
		{ id: "h2", label: "Heading 2", keywords: ["h2"], run: (ctx) => setBlockType(ctx, "h2") },
		{ id: "h3", label: "Heading 3", keywords: ["h3"], run: (ctx) => setBlockType(ctx, "h3") },
		{ id: "quote", label: "Quote", keywords: ["quote", "blockquote"], run: (ctx) => setBlockType(ctx, "quote") },
	],
	toolbar: [
		{
			id: "block-type", group: "block", order: 0, label: "Paragraph style",
			render: (ctx) => html`<select
				class="dj-rt-blocktype"
				aria-label="Paragraph style"
				.value=${currentBlockType(ctx)}
				@change=${(e: Event) => setBlockType(ctx, (e.target as HTMLSelectElement).value as BlockType)}
			>
				<option value="paragraph">Paragraph</option>
				<option value="h1">Heading 1</option>
				<option value="h2">Heading 2</option>
				<option value="h3">Heading 3</option>
				<option value="quote">Quote</option>
			</select>`,
		},
	],
});

export default headingsPlugin;
