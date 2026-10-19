/**
 * Spoken announcements for insertions and deletions, through a polite live region.
 *
 * Why a live region (B1 VoiceOver pass, 2026-10-19): VoiceOver in Chrome says nothing to mark text
 * inside `<ins>`/`<del>` as inserted or deleted — not when it lands on the field (it speaks the
 * field's value), not in interaction mode, not by word or by line. CSS-generated labels were tried
 * first and are silent in every one of those modes too, even though Chromium puts them in the
 * accessibility tree. Worse, a substitution's two halves share no word boundary, so a caret user
 * moving by word never hears the old word at all. So the editor says it: when the caret moves into
 * an insertion, a deletion, or a substitution pair, the region reads what kind of change it is and
 * its text. The same pattern editors with suggestion modes use.
 *
 * Only caret movement announces. An update that changed text (typing, which in suggestion mode
 * creates and extends insertions) moves the tracked mark silently, so typing is never talked over.
 */

import { $getSelection, $isRangeSelection, type LexicalEditor, type LexicalNode } from "lexical";
import { $isDeletionNode, $isInsertionNode } from "./nodes.js";

/** Longest mark text spoken in full; longer text is cut with an ellipsis. */
const MAX_SPOKEN = 120;

/** What the caret sits in, as a stable key plus the words to speak, or `null` for plain prose. */
export interface MarkAtCaret {
	key: string;
	kind: "insertion" | "deletion" | "replacement";
	text: string;
	replacement?: string;
}

function clip(text: string): string {
	const flat = text.replace(/\s+/g, " ").trim();
	return flat.length > MAX_SPOKEN ? `${flat.slice(0, MAX_SPOKEN - 1)}…` : flat;
}

/** Must run inside a read. A deletion directly followed by an insertion is one substitution, and
 * both halves share the deletion's key, so moving from one half to the other is not re-announced. */
export function $markAtCaret(): MarkAtCaret | null {
	const selection = $getSelection();
	if (!$isRangeSelection(selection)) return null;
	let node: LexicalNode | null = selection.anchor.getNode();
	while (node && !$isInsertionNode(node) && !$isDeletionNode(node)) node = node.getParent();
	if (!node) return null;
	// InsertionNode and DeletionNode are structurally identical, so TypeScript cannot narrow
	// between them by type guard; the checks below are runtime instanceof checks all the same.
	const mark: LexicalNode = node;
	if ($isDeletionNode(mark)) {
		const next = mark.getNextSibling();
		if ($isInsertionNode(next)) {
			return { key: mark.getKey(), kind: "replacement", text: mark.getTextContent(), replacement: next.getTextContent() };
		}
		return { key: mark.getKey(), kind: "deletion", text: mark.getTextContent() };
	}
	const prev = mark.getPreviousSibling();
	if ($isDeletionNode(prev)) {
		return { key: prev.getKey(), kind: "replacement", text: prev.getTextContent(), replacement: mark.getTextContent() };
	}
	return { key: mark.getKey(), kind: "insertion", text: mark.getTextContent() };
}

/** The sentence spoken for a mark. `msg` resolves `announceInsertion`, `announceDeletion`, and
 * `announceReplacement`, whose `{text}` / `{old}` / `{new}` placeholders are filled here. */
export function markAnnouncement(mark: MarkAtCaret, msg: (key: string) => string): string {
	if (mark.kind === "replacement") {
		return msg("announceReplacement").replace("{old}", clip(mark.text)).replace("{new}", clip(mark.replacement ?? ""));
	}
	return msg(mark.kind === "insertion" ? "announceInsertion" : "announceDeletion").replace("{text}", clip(mark.text));
}

/**
 * Append a visually hidden polite live region to `host` and keep it in step with the caret.
 * Returns the cleanup, which removes the region.
 */
export function registerMarkAnnouncer(editor: LexicalEditor, host: HTMLElement, msg: (key: string) => string): () => void {
	const live = document.createElement("div");
	live.className = "dj-cm-sr-only dj-cm-live";
	live.setAttribute("aria-live", "polite");
	live.setAttribute("aria-atomic", "true");
	host.appendChild(live);

	let lastKey: string | null = null;
	const unregister = editor.registerUpdateListener(({ editorState, dirtyLeaves }) => {
		const mark = editorState.read(() => $markAtCaret());
		const key = mark?.key ?? null;
		if (key === lastKey) return;
		lastKey = key;
		// Leaving a mark clears the region, so re-entering the same mark speaks again.
		if (!mark || dirtyLeaves.size > 0) {
			live.textContent = "";
			return;
		}
		live.textContent = markAnnouncement(mark, msg);
	});

	return () => {
		unregister();
		live.remove();
	};
}
