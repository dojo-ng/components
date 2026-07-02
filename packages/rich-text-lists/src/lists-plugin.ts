import { html } from "lit";
import { $getSelection, $isRangeSelection, type LexicalNode } from "lexical";
import {
	ListNode, ListItemNode, $isListNode, registerList,
	INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { defineRichTextPlugin, type RichTextContext } from "@dojo-ng/rich-text";

/**
 * Lists plugin for `<dj-rich-text>`. Contributes the list node classes, installs Lexical's list
 * behavior (`registerList`), and adds bulleted/numbered toolbar buttons that toggle the current
 * block in and out of a list.
 */

/** The list type containing the selection (`bullet` | `number` | `check`), or null if none. */
function currentListType(ctx: RichTextContext): string | null {
	let result: string | null = null;
	ctx.editor.getEditorState().read(() => {
		const sel = $getSelection();
		if (!$isRangeSelection(sel)) return;
		let node: LexicalNode | null = sel.anchor.getNode();
		while (node) {
			if ($isListNode(node)) { result = node.getListType(); return; }
			node = node.getParent();
		}
	});
	return result;
}

/** Toggle the selection into `target`, or out of it when it is already that list type. */
function toggleList(ctx: RichTextContext, target: "bullet" | "number") {
	if (currentListType(ctx) === target) {
		ctx.command(REMOVE_LIST_COMMAND, undefined);
		return;
	}
	ctx.command(
		target === "bullet" ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
		undefined,
	);
}

export const listsPlugin = defineRichTextPlugin({
	name: "lists",
	nodes: [ListNode, ListItemNode],
	setup: (ctx) => registerList(ctx.editor),
	toolbar: [
		{
			id: "bullet-list", group: "list", order: 1, label: "Bulleted list",
			icon: html`<span style="font-size:1.1em;line-height:1">&bull;</span>`,
			isActive: (ctx) => currentListType(ctx) === "bullet",
			run: (ctx) => toggleList(ctx, "bullet"),
		},
		{
			id: "numbered-list", group: "list", order: 2, label: "Numbered list",
			icon: "1.",
			isActive: (ctx) => currentListType(ctx) === "number",
			run: (ctx) => toggleList(ctx, "number"),
		},
	],
});

export default listsPlugin;
