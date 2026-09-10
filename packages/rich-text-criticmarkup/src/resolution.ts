/**
 * Resolution (Track T1/T2): `markAtSelection`, `acceptMark`/`declineMark` (one mark), and
 * `acceptAllMarks`/`declineAllMarks` (the whole document). Decision 10's rules, applied directly to
 * the live tree rather than round-tripping through markdown — the two paths are cross-checked in the
 * test file against `grammar.accept`/`decline` on the same starting `value`, which is the point of
 * having one grammar.
 *
 * A substitution is never resolved as a lone deletion or insertion: `acceptMark`/`declineMark` on
 * EITHER half of an adjacent deletion-then-insertion pair (decision 4's shape) resolves the whole
 * pair. A kept insertion/deletion holding a `BreakNode` (decision 16 — a proposed paragraph
 * split/merge) performs the real block split/merge at that point when kept, mirroring exactly what
 * `grammar.accept`/`decline` do to the paragraph token at the string level.
 *
 * No confirmation here — `dj-popup-confirmation` gating `confirmBulk` is a toolbar-level concern
 * (Track T3), not baked into these functions themselves.
 */

import { $createParagraphNode, $getNodeByKey, $getRoot, $getSelection, $isElementNode, $isRangeSelection, $isRootOrShadowRoot, type ElementNode, type LexicalEditor, type LexicalNode } from "lexical";
import type { MarkKind } from "./grammar.js";
import {
	$isBreakNode,
	$isCommentNode,
	$isCriticMark,
	$isDeletionNode,
	$isHighlightNode,
	$isInsertionNode,
	type BreakNode,
	type DeletionNode,
	type InsertionNode,
} from "./nodes.js";
import { SKIP_TAG } from "./suggestion-mode.js";

export interface CriticMarkupChangeDetail {
	kind: MarkKind;
	action: "accept" | "decline";
}

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-criticmarkup-change": CustomEvent<CriticMarkupChangeDetail>;
	}
}

/** The nearest CriticMarkup mark (any of the four kinds) containing the selection's anchor, or
 * `null` if the caret sits in plain prose or there is no range selection. */
export function markAtSelection(editor: LexicalEditor): LexicalNode | null {
	let result: LexicalNode | null = null;
	editor.getEditorState().read(() => {
		const selection = $getSelection();
		if (!$isRangeSelection(selection)) return;
		let node: LexicalNode | null = selection.anchor.getNode();
		while (node) {
			if ($isCriticMark(node)) {
				result = node;
				return;
			}
			node = node.getParent();
		}
	});
	return result;
}

export function acceptMark(editor: LexicalEditor, node: LexicalNode): void {
	resolveMark(editor, node, "new");
}

export function declineMark(editor: LexicalEditor, node: LexicalNode): void {
	resolveMark(editor, node, "old");
}

export function acceptAllMarks(editor: LexicalEditor): void {
	resolveAllMarks(editor, "new");
}

export function declineAllMarks(editor: LexicalEditor): void {
	resolveAllMarks(editor, "old");
}

function resolveMark(editor: LexicalEditor, node: LexicalNode, side: "new" | "old"): void {
	editor.update(
		() => {
			const fresh = $getNodeByKey(node.getKey());
			if (!fresh || !$isCriticMark(fresh)) return;
			resolveOne(editor, fresh, side);
		},
		// `discrete: true` so a toolbar click (or a caller reading `value` right after) sees this
		// applied synchronously, not silently batched to a later microtask. Tagged with SKIP_TAG so
		// suggestion mode's own diff-and-wrap listener, if still on, does not see the flattened text
		// this resolution just changed (an accepted deletion, a declined insertion, a split/merge just
		// made real) and re-wrap it right back up as a brand-new suggestion.
		{ discrete: true, tag: SKIP_TAG },
	);
}

function resolveAllMarks(editor: LexicalEditor, side: "new" | "old"): void {
	editor.update(
		() => {
			const marks = collectMarks($getRoot());
			const resolved = new Set<string>();
			for (const node of marks) {
				if (resolved.has(node.getKey())) continue;
				resolveOne(editor, node, side, resolved);
			}
		},
		{ discrete: true, tag: SKIP_TAG },
	);
}

/** Resolves `node` (and, if it is half of a substitution pair, its partner too), then emits
 * `dj-criticmarkup-change`. `resolved` (bulk resolution only) records both halves of a pair so the
 * bulk walk's own snapshot does not try to resolve the second half a second time. */
function resolveOne(editor: LexicalEditor, node: LexicalNode, side: "new" | "old", resolved?: Set<string>): void {
	const pair = substitutionPairOf(node);
	if (pair) {
		resolved?.add(pair.deletion.getKey());
		resolved?.add(pair.insertion.getKey());
		if (side === "new") {
			pair.deletion.remove();
			unwrapAndResolveBreaks(pair.insertion);
		} else {
			pair.insertion.remove();
			unwrapAndResolveBreaks(pair.deletion);
		}
		dispatchChange(editor, "substitution", side === "new" ? "accept" : "decline");
		return;
	}

	if ($isCommentNode(node)) return; // decision 10: a bare comment resolves neither way
	if (!$isInsertionNode(node) && !$isDeletionNode(node) && !$isHighlightNode(node)) return; // exhaustive; unreachable

	const kind = kindOf(node);
	if ($isHighlightNode(node)) {
		// Kept either way — its anchored comment, if any, is state on the node, not a sibling, so it
		// simply goes with it. No BreakNode ever lives inside a highlight (decision, N1).
		unwrap(node);
	} else {
		const keep = $isInsertionNode(node) ? side === "new" : side === "old";
		if (keep) unwrapAndResolveBreaks(node);
		else node.remove();
	}
	dispatchChange(editor, kind, side === "new" ? "accept" : "decline");
}

function kindOf(node: LexicalNode): MarkKind {
	if ($isInsertionNode(node)) return "insertion";
	if ($isDeletionNode(node)) return "deletion";
	if ($isHighlightNode(node)) return "highlight";
	return "comment";
}

/** `node` is one half of a substitution (decision 4's shape: a `DeletionNode` immediately followed
 * by an `InsertionNode`) if it is either half of such an adjacent pair. */
function substitutionPairOf(node: LexicalNode): { deletion: DeletionNode; insertion: InsertionNode } | null {
	if ($isDeletionNode(node)) {
		const next = node.getNextSibling();
		if ($isInsertionNode(next)) return { deletion: node, insertion: next };
	}
	if ($isInsertionNode(node)) {
		const prev = node.getPreviousSibling();
		if ($isDeletionNode(prev)) return { deletion: prev, insertion: node };
	}
	return null;
}

/** Replace `node` with its own children, in place — the standard Lexical "unlink" shape
 * (`@lexical/link`'s own `$toggleLink` does the same to remove a `LinkNode`). Returns the children,
 * now live at `node`'s old position, for the caller to inspect. */
function unwrap(node: ElementNode): LexicalNode[] {
	const children = node.getChildren();
	for (const child of children) node.insertBefore(child);
	node.remove();
	return children;
}

/** Unwrap `node`, then perform the real block split/merge for any `BreakNode` among its now-freed
 * children — a kept paragraph-break proposal (decision 16) stops being a decorator and becomes an
 * actual block boundary, mirroring what `grammar.accept`/`decline` do to the token at the string
 * level. */
function unwrapAndResolveBreaks(node: ElementNode): void {
	const children = unwrap(node);
	for (const child of children) {
		if ($isBreakNode(child)) splitBlockAtBreak(child);
	}
}

function splitBlockAtBreak(breakNode: BreakNode): void {
	const block = topLevelBlockOf(breakNode);
	if (!block) {
		breakNode.remove();
		return;
	}
	const newBlock = $createParagraphNode();
	let sibling = breakNode.getNextSibling();
	while (sibling) {
		const next = sibling.getNextSibling();
		newBlock.append(sibling);
		sibling = next;
	}
	block.insertAfter(newBlock);
	breakNode.remove();
}

function topLevelBlockOf(node: LexicalNode): ElementNode | null {
	let current: LexicalNode | null = node;
	while (current) {
		const parent: ElementNode | null = current.getParent();
		if (parent === null) return null;
		if ($isRootOrShadowRoot(parent)) return $isElementNode(current) ? current : null;
		current = parent;
	}
	return null;
}

/** Every CriticMarkup mark in `root`, in document order. Marks never nest as real nodes (decision
 * 11), so finding one ends that branch of the walk. */
function collectMarks(root: ElementNode): LexicalNode[] {
	const marks: LexicalNode[] = [];
	const walk = (node: LexicalNode): void => {
		if ($isCriticMark(node)) {
			marks.push(node);
			return;
		}
		if ($isElementNode(node)) for (const child of node.getChildren()) walk(child);
	};
	for (const child of root.getChildren()) walk(child);
	return marks;
}

function dispatchChange(editor: LexicalEditor, kind: MarkKind, action: "accept" | "decline"): void {
	const root = editor.getRootElement();
	root?.dispatchEvent(new CustomEvent("dj-criticmarkup-change", { detail: { kind, action }, bubbles: true, composed: true }));
}
