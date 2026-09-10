/**
 * Suggestion mode (Track S): per-editor state, a block-diff listener that wraps typed/deleted text
 * as marks, and structural-edit handling for a paragraph split or merge (decisions 14, 16).
 *
 * `setSuggestionMode`/`isSuggestionMode` are the frozen, editor-only API. `configureSuggestionMode`
 * is this track's own addition — the frozen surface has no way to pass `structuralEdits` into a bare
 * `(editor, enabled)` call, and the plugin-level `CriticMarkupOptions.structuralEdits` has to reach
 * this module somehow. Whichever track assembles the full plugin object calls it once from `setup()`
 * with the resolved option; `setSuggestionMode` alone still works standalone, registering with the
 * `"mark"` default the first time it is called.
 */

import {
	$addUpdateTag,
	$createTextNode,
	$getNodeByKey,
	$getSelection,
	$isElementNode,
	$isRangeSelection,
	$isRootOrShadowRoot,
	$isTextNode,
	COMMAND_PRIORITY_CRITICAL,
	DELETE_CHARACTER_COMMAND,
	INSERT_PARAGRAPH_COMMAND,
	type EditorState,
	type ElementNode,
	type LexicalEditor,
	type LexicalNode,
	type NodeKey,
	type RangeSelection,
	type TextNode,
} from "lexical";
import { getDefaultLocale, messages, registerDefaults } from "@dojo-ng/i18n";
import {
	$createBreakNode,
	$createCommentNode,
	$createDeletionNode,
	$createInsertionNode,
	$isInsertionNode,
} from "./nodes.js";

const EN: Record<string, string> = {
	structuralSplit: "paragraph split, not tracked",
	structuralMerge: "paragraph merge, not tracked",
};
registerDefaults("dj", EN);

function msg(editor: LexicalEditor, key: string): string {
	const locale = editor.getRootElement()?.closest("[lang]")?.getAttribute("lang") || getDefaultLocale();
	return messages.resolve("dj", locale, key) ?? EN[key] ?? key;
}

/** What suggestion mode does with a block-structure change (decisions 14, 16). */
export type StructuralPolicy = "mark" | "annotate" | "block" | "apply";

export interface SuggestionModeOptions {
	/** Default `"mark"`. */
	structuralEdits?: StructuralPolicy;
}

interface SuggestionState {
	enabled: boolean;
	structuralEdits: StructuralPolicy;
	registered: boolean;
}

const STATE = new WeakMap<LexicalEditor, SuggestionState>();
/** The update tag the diff-and-wrap listener skips (S1/S3's own structural edits use it on
 * themselves already). Exported so `resolution.ts` can tag its own mutations the same way — a mark
 * resolution changes a block's flattened text too (an accepted deletion, a declined insertion, a
 * split/merge just made real), and without this tag the listener re-diffs that change and wraps it
 * right back up as a brand-new suggestion, undoing the resolution it was just asked to perform. */
export const SKIP_TAG = "dj-criticmarkup-suggestion";

function ensureState(editor: LexicalEditor): SuggestionState {
	let state = STATE.get(editor);
	if (!state) {
		state = { enabled: false, structuralEdits: "mark", registered: false };
		STATE.set(editor, state);
	}
	return state;
}

export function isSuggestionMode(editor: LexicalEditor): boolean {
	return STATE.get(editor)?.enabled ?? false;
}

/** Turn suggestion mode on or off. Registers the listener and command handlers once, lazily. */
export function setSuggestionMode(editor: LexicalEditor, enabled: boolean): void {
	const state = ensureState(editor);
	state.enabled = enabled;
	if (!state.registered) {
		state.registered = true;
		registerSuggestionMode(editor, state);
	}
}

/** Set `structuralEdits` before (or after) `setSuggestionMode` is ever called on `editor`. */
export function configureSuggestionMode(editor: LexicalEditor, options: SuggestionModeOptions): void {
	const state = ensureState(editor);
	if (options.structuralEdits !== undefined) state.structuralEdits = options.structuralEdits;
	if (!state.registered) {
		state.registered = true;
		registerSuggestionMode(editor, state);
	}
}

function dispatchStructural(editor: LexicalEditor, operation: "split" | "merge" | "other", policy: StructuralPolicy): void {
	const root = editor.getRootElement();
	root?.dispatchEvent(
		new CustomEvent("dj-criticmarkup-structural", { detail: { operation, policy }, bubbles: true, composed: true }),
	);
}

function registerSuggestionMode(editor: LexicalEditor, state: SuggestionState): () => void {
	const disposers = [
		editor.registerCommand(INSERT_PARAGRAPH_COMMAND, () => handleInsertParagraph(editor, state), COMMAND_PRIORITY_CRITICAL),
		editor.registerCommand(
			DELETE_CHARACTER_COMMAND,
			(isBackward) => handleDeleteCharacter(editor, state, isBackward),
			COMMAND_PRIORITY_CRITICAL,
		),
		editor.registerUpdateListener(({ editorState, prevEditorState, dirtyElements, dirtyLeaves, tags }) => {
			if (!state.enabled) return;
			if (tags.has(SKIP_TAG)) return;
			if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
			// `dirtyElements` includes "root" itself whenever any child changed — root is not a
			// "block" (its flattened text joins paragraphs with "\n\n", not prose), and diffing it
			// as one corrupts the very first paragraph. Only genuine top-level blocks (root's direct
			// children) are ever diffed or checked for a structural change.
			const keys = topLevelDirtyKeys(prevEditorState, editorState, dirtyElements);
			if (keys.length === 0) return;
			const change = findStructuralChange(prevEditorState, editorState, keys);
			if (change) {
				handleStructuralGuard(editor, state, change);
				return; // suppress the per-block diff entirely for this update
			}
			for (const key of keys) diffBlock(editor, key, prevEditorState, editorState);
		}),
	];
	return () => disposers.forEach((d) => d());
}

// --- S1: the per-block diff and marking -----------------------------------------------------------

function diffBlock(editor: LexicalEditor, key: NodeKey, prevEditorState: EditorState, editorState: EditorState): void {
	let oldText: string | null = null;
	let newText: string | null = null;
	prevEditorState.read(() => {
		const node = $getNodeByKey(key);
		if ($isElementNode(node)) oldText = node.getTextContent();
	});
	editorState.read(() => {
		const node = $getNodeByKey(key);
		if ($isElementNode(node)) newText = node.getTextContent();
	});
	if (oldText === null || newText === null || oldText === newText) return;

	const { prefix, removed, inserted } = diffStrings(oldText, newText);
	if (!removed && !inserted) return;

	// Deleting from inside an insertion is the author withdrawing their own unaccepted suggestion,
	// not proposing a deletion of it — Lexical already shrank (or, via canBeEmpty()=false, removed)
	// the insertion; nothing more to mark. Checked against the OLD tree, since the removed text is
	// already gone from the new one.
	let removedWasInsertion = false;
	if (removed) {
		prevEditorState.read(() => {
			const node = $getNodeByKey(key);
			if (!$isElementNode(node)) return;
			const loc = locateOffset(node, prefix);
			removedWasInsertion = !!loc && $isInsertionNode(loc.node.getParent());
		});
	}

	editor.update(
		() => {
			const node = $getNodeByKey(key);
			if (!$isElementNode(node)) return;
			if (inserted) wrapInsertionIfNeeded(node, prefix, inserted);
			if (removed && !removedWasInsertion) {
				const insertAt = prefix + (inserted ? inserted.length : 0);
				insertDeletionAt(node, insertAt, removed);
			}
		},
		{ tag: SKIP_TAG, discrete: true },
	);
}

function diffStrings(oldText: string, newText: string): { prefix: number; removed: string; inserted: string } {
	const maxPrefix = Math.min(oldText.length, newText.length);
	let prefix = 0;
	while (prefix < maxPrefix && oldText[prefix] === newText[prefix]) prefix++;
	const maxSuffix = Math.min(oldText.length - prefix, newText.length - prefix);
	let suffix = 0;
	while (suffix < maxSuffix && oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]) suffix++;
	return {
		prefix,
		removed: oldText.slice(prefix, oldText.length - suffix),
		inserted: newText.slice(prefix, newText.length - suffix),
	};
}

/** The (TextNode, local offset) at character `offset` into `block`'s flattened text, recursing into
 * an existing mark's own text children so an edit inside one is still located precisely. */
function locateOffset(block: ElementNode, offset: number): { node: TextNode; offset: number } | null {
	const children = block.getChildren();
	let acc = 0;
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		const len = child.getTextContent().length;
		const isLast = i === children.length - 1;
		// At an EXACT boundary between two children, prefer the START of the FOLLOWING one rather
		// than the end of the one before it — otherwise a position "between two marks" (or between a
		// mark and plain text) resolves backward into whichever mark happens to sit first, which is
		// exactly wrong when that mark is a DeletionNode (canInsertTextAfter() false): newly typed
		// text landing just after it must be located in what follows, not inside it.
		if (offset < acc + len || (isLast && offset === acc + len)) {
			const local = offset - acc;
			if ($isTextNode(child)) return { node: child, offset: local };
			if ($isElementNode(child)) return locateOffset(child, local);
			return null; // a decorator (BreakNode/CommentNode): no text position to split
		}
		acc += len;
	}
	return null;
}

/** Wrap the just-typed `text` at `offset` in a new `InsertionNode` — unless Lexical already placed
 * it inside an EXISTING one (decision 6's `canInsertTextAfter/Before` doing exactly what it exists
 * for), in which case there is nothing to do. */
function wrapInsertionIfNeeded(block: ElementNode, offset: number, text: string): void {
	const loc = locateOffset(block, offset);
	if (!loc) return;
	if ($isInsertionNode(loc.node.getParent())) return;
	const full = loc.node.getTextContent();
	const end = Math.min(loc.offset + text.length, full.length);
	const expected = full.slice(loc.offset, end);
	// `splitText` OMITS a zero-length piece rather than returning an empty node for it, so when
	// `loc.offset` is 0 (or `end` is the node's own length) the "middle" piece is not reliably at a
	// fixed array position — find it by its own text content instead.
	const pieces = loc.node.splitText(loc.offset, end);
	const target = pieces.find((p) => p.getTextContent() === expected) ?? pieces[0] ?? loc.node;
	const insertionNode = $createInsertionNode();
	target.replace(insertionNode);
	insertionNode.append(target);
}

/** Insert a new `DeletionNode` holding the just-removed `text` back at `offset`. */
function insertDeletionAt(block: ElementNode, offset: number, text: string): void {
	const deletionNode = $createDeletionNode();
	deletionNode.append($createTextNode(text));
	const loc = locateOffset(block, offset);
	if (!loc) {
		block.append(deletionNode);
		deletionNode.selectEnd();
		return;
	}
	if (loc.offset === 0) {
		loc.node.insertBefore(deletionNode);
		deletionNode.selectNext(0, 0); // S2: the caret lands right after the new deletion, not inside it
		return;
	}
	if (loc.offset >= loc.node.getTextContent().length) {
		loc.node.insertAfter(deletionNode);
		deletionNode.selectNext(0, 0);
		return;
	}
	const [, after] = loc.node.splitText(loc.offset);
	(after ?? loc.node).insertBefore(deletionNode);
	deletionNode.selectNext(0, 0);
}

// --- S3: structural edits (paragraph split / merge) ------------------------------------------------

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

/** Whether the collapsed selection `point` sits at the very first character of `block`. */
function isAtBlockStart(block: ElementNode, point: RangeSelection["anchor"]): boolean {
	if (point.type !== "text" || point.offset !== 0) return false;
	let n: LexicalNode | null = block;
	while (n && !$isTextNode(n)) {
		if (!$isElementNode(n) || n.getChildrenSize() === 0) return false;
		n = n.getFirstChild();
	}
	return n !== null && n.is(point.getNode());
}

function handleInsertParagraph(editor: LexicalEditor, state: SuggestionState): boolean {
	if (!state.enabled) return false;
	if (state.structuralEdits !== "mark" && state.structuralEdits !== "block") return false;
	const selection = $getSelection();
	if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;

	if (state.structuralEdits === "block") {
		dispatchStructural(editor, "split", "block");
		return true;
	}

	// "mark": a proposed break, not a real split — the block set never changes, so decision 14's
	// per-block-diff failure mode is unreachable on this path rather than merely guarded against.
	// Tagged so the SAME update does not also get run through the ordinary per-block diff below,
	// which would otherwise see this paragraph's text change and wrap it a second time.
	$addUpdateTag(SKIP_TAG);
	const anchorNode = selection.anchor.getNode();
	const enclosingInsertion = $isTextNode(anchorNode) ? anchorNode.getParent() : null;
	if ($isTextNode(anchorNode) && $isInsertionNode(enclosingInsertion)) {
		// Splitting INSIDE an existing, not-yet-resolved insertion (Bill's harder placement): grow
		// that SAME insertion with a break rather than wrapping a brand-new one around it — using
		// `selection.insertNodes()` here would split the existing insertion in two around the new
		// one, turning one mark into three.
		const offset = selection.anchor.offset;
		const full = anchorNode.getTextContent();
		if (offset === 0) {
			anchorNode.insertBefore($createBreakNode());
		} else if (offset >= full.length) {
			anchorNode.insertAfter($createBreakNode());
		} else {
			// `splitText` omits a zero-length piece rather than a fixed-position array, so find the
			// "before" piece by its own text rather than assuming index 0.
			const pieces = anchorNode.splitText(offset);
			const before = pieces.find((p) => p.getTextContent() === full.slice(0, offset)) ?? pieces[0];
			before.insertAfter($createBreakNode());
		}
	} else {
		const breakNode = $createBreakNode();
		const insertionNode = $createInsertionNode();
		insertionNode.append(breakNode);
		selection.insertNodes([insertionNode]);
	}
	dispatchStructural(editor, "split", "mark");
	return true;
}

function handleDeleteCharacter(editor: LexicalEditor, state: SuggestionState, isBackward: boolean): boolean {
	if (!state.enabled || !isBackward) return false;
	if (state.structuralEdits !== "mark" && state.structuralEdits !== "block") return false;
	const selection = $getSelection();
	if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
	const block = topLevelBlockOf(selection.anchor.getNode());
	if (!block || !isAtBlockStart(block, selection.anchor)) return false;
	const prevBlock = block.getPreviousSibling();
	if (!$isElementNode(prevBlock)) return false;

	if (state.structuralEdits === "block") {
		dispatchStructural(editor, "merge", "block");
		return true;
	}

	// "mark": join the blocks, with a DeletionNode wrapping a BreakNode where the break was — the
	// merge case does join two blocks into one (the mark is inline, it has to), unlike the split case.
	// Tagged for the same reason as the split path above.
	$addUpdateTag(SKIP_TAG);
	const breakNode = $createBreakNode();
	const deletionNode = $createDeletionNode();
	deletionNode.append(breakNode);
	prevBlock.append(deletionNode);
	const moved = block.getChildren();
	for (const child of moved) prevBlock.append(child);
	block.remove();
	deletionNode.selectEnd();
	dispatchStructural(editor, "merge", "mark");
	return true;
}

/** `dirtyElements` includes "root" itself whenever any descendant changed, and root is not a block —
 * its flattened text joins paragraphs with `"\n\n"`, not prose, and diffing it as one would corrupt
 * the first paragraph. Keeps only keys whose node is (or, for a just-removed block, WAS) a direct
 * child of root-or-shadow-root, in EITHER state, so a genuinely new or genuinely removed top-level
 * block is still included — only root itself, and any non-top-level dirty element, is dropped. */
function topLevelDirtyKeys(
	prevEditorState: EditorState,
	editorState: EditorState,
	dirtyElements: ReadonlyMap<NodeKey, unknown>,
): NodeKey[] {
	const keys: NodeKey[] = [];
	for (const key of dirtyElements.keys()) {
		let isTopLevel = false;
		editorState.read(() => {
			const node = $getNodeByKey(key);
			if (node) isTopLevel = $isElementNode(node) && $isRootOrShadowRoot(node.getParent());
		});
		if (!isTopLevel) {
			prevEditorState.read(() => {
				const node = $getNodeByKey(key);
				if (node) isTopLevel = $isElementNode(node) && $isRootOrShadowRoot(node.getParent());
			});
		}
		if (isTopLevel) keys.push(key);
	}
	return keys;
}

interface StructuralChange {
	operation: "split" | "merge" | "other";
}

/** A dirty block with no previous state, or a previously existing block now gone, is a structural
 * change (decision 14) — the guard for anything that reaches block structure by a route the two
 * command handlers above don't cover (paste, drag, an IME commit). Under normal typed Enter/Backspace
 * with `structuralEdits: "mark"` or `"block"`, this never fires: the command handlers already
 * intercepted before any such update could land. */
function findStructuralChange(prevEditorState: EditorState, editorState: EditorState, keys: readonly NodeKey[]): StructuralChange | null {
	let split = false;
	let merged = false;
	for (const key of keys) {
		let inPrev = false;
		let inCurrent = false;
		prevEditorState.read(() => {
			inPrev = $getNodeByKey(key) !== null;
		});
		editorState.read(() => {
			inCurrent = $getNodeByKey(key) !== null;
		});
		if (inPrev && !inCurrent) merged = true;
		if (!inPrev && inCurrent) split = true;
	}
	if (split && !merged) return { operation: "split" };
	if (merged && !split) return { operation: "merge" };
	if (split || merged) return { operation: "other" };
	return null;
}

/** The aftermath for a structural change NOT already fully handled by a command interception —
 * `"mark"`/`"block"` only reach here via a non-command route, and both fall back to the same
 * best-effort marker `"annotate"` uses: there is no tree to retroactively un-split or un-merge
 * through this path, only the choice of whether to leave a visible note about it. */
function handleStructuralGuard(editor: LexicalEditor, state: SuggestionState, change: StructuralChange): void {
	const policy = state.structuralEdits;
	if (policy === "apply") {
		dispatchStructural(editor, change.operation, policy);
		return;
	}
	if (policy === "block") {
		dispatchStructural(editor, change.operation, policy);
		return;
	}
	// "annotate", and "mark" falling back to it (see the doc comment above). Best effort on WHERE:
	// there is no single well-defined "boundary" node across an arbitrary non-command structural
	// change (paste, drag, IME), so the note lands on whichever top-level block the selection sits
	// in once the change has already landed — visible near the change, which is the most this path
	// can honestly offer.
	editor.update(
		() => {
			const text = msg(editor, change.operation === "merge" ? "structuralMerge" : "structuralSplit");
			const comment = $createCommentNode(text);
			const selection = $getSelection();
			const anchorNode = $isRangeSelection(selection) ? selection.anchor.getNode() : null;
			const target = anchorNode ? topLevelBlockOf(anchorNode) : null;
			target?.append(comment);
		},
		{ tag: SKIP_TAG, discrete: true },
	);
	dispatchStructural(editor, change.operation, policy === "mark" ? "mark" : "annotate");
}
