/**
 * Comment authoring (Track T4, decision 15): insert (bare or anchored), edit, and the two deletes.
 * The UI shell (the popup with its text area and buttons) is Track T3/T4's `nodes.ts`/toolbar
 * concern; these are the plain editor-level operations it calls.
 */

import { $getNodeByKey, $getSelection, $isRangeSelection, type ElementNode, type LexicalEditor, type LexicalNode } from "lexical";
import { parseMarks } from "./grammar.js";
import { $createCommentNode, $createHighlightNode, $isCommentNode, $isHighlightNode } from "./nodes.js";

/** Whether `text` is safe as a note body: `"{>>" + text + "<<}"` must parse as EXACTLY one comment
 * mark spanning the whole string. A note containing `<<}` would terminate its own mark early on the
 * next round trip; one containing `{>>` nests. This is the grammar module earning its place a second
 * time (decision 2): the editor and the string API agree because they call the same parser. */
export function isValidCommentText(text: string): boolean {
	const candidate = `{>>${text}<<}`;
	const marks = parseMarks(candidate);
	return marks.length === 1 && marks[0].kind === "comment" && marks[0].start === 0 && marks[0].end === candidate.length;
}

function assertValidCommentText(text: string): void {
	if (isValidCommentText(text)) return;
	const offending = text.includes("<<}") ? "<<}" : text.includes("{>>") ? "{>>" : "a sequence that breaks the mark";
	throw new Error(`Comment text is not valid: it contains "${offending}", which would not round-trip through value.`);
}

/** Insert a comment at the current selection: bare at a collapsed caret, anchored (a `HighlightNode`
 * carrying the note) over a range. */
export function insertComment(editor: LexicalEditor, text: string): void {
	assertValidCommentText(text);
	editor.update(
		() => {
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) return;
			if (selection.isCollapsed()) {
				selection.insertNodes([$createCommentNode(text)]);
				return;
			}
			const nodes = selection.extract();
			if (nodes.length === 0) return;
			const highlightNode = $createHighlightNode();
			highlightNode.setComment(text);
			nodes[0].insertBefore(highlightNode);
			for (const node of nodes) highlightNode.append(node);
		},
		{ discrete: true },
	);
}

/** Change an existing note's text — a bare `CommentNode`'s own text, or a `HighlightNode`'s anchored
 * comment. */
export function editComment(editor: LexicalEditor, node: LexicalNode, text: string): void {
	assertValidCommentText(text);
	editor.update(
		() => {
			const fresh = $getNodeByKey(node.getKey());
			if ($isCommentNode(fresh)) fresh.setText(text);
			else if ($isHighlightNode(fresh)) fresh.setComment(text);
		},
		{ discrete: true },
	);
}

/** "Remove note": drop an anchored comment's note, leaving the highlight and its text standing. */
export function removeComment(editor: LexicalEditor, node: LexicalNode): void {
	editor.update(
		() => {
			const fresh = $getNodeByKey(node.getKey());
			if ($isHighlightNode(fresh)) fresh.setComment(null);
		},
		{ discrete: true },
	);
}

/** "Remove highlight": drop both the note and the highlight, leaving the text unmarked. */
export function removeHighlight(editor: LexicalEditor, node: LexicalNode): void {
	editor.update(
		() => {
			const fresh = $getNodeByKey(node.getKey());
			if ($isHighlightNode(fresh)) unwrap(fresh);
		},
		{ discrete: true },
	);
}

/** Replace `node` with its own children, in place (the standard Lexical "unlink" shape). */
function unwrap(node: ElementNode): void {
	for (const child of node.getChildren()) node.insertBefore(child);
	node.remove();
}
