/**
 * The five CriticMarkup node classes (decisions 4-6, 16).
 *
 * `InsertionNode`, `DeletionNode`, and `HighlightNode` are `ElementNode`s wrapping ordinary text —
 * the shape `@lexical/link`'s `LinkNode` uses for an inline span with its own markdown delimiters —
 * so they can hold a `BreakNode` alongside plain `TextNode` children. `CommentNode` is a
 * `DecoratorNode`: a bare comment has no text of its own to put a caret in. `BreakNode` is a break
 * carried inside an insertion or a deletion, not a mark kind of its own (decision 16) — the fifth
 * node class, on a different axis from the other four.
 *
 * No markdown import/export here — that is `transformers.ts` (Track N2). No DOM paste/export
 * override either; nothing in the spec asks for one.
 */

import {
	$applyNodeReplacement,
	DecoratorNode,
	ElementNode,
	type DOMExportOutput,
	type EditorConfig,
	type LexicalEditor,
	type LexicalNode,
	type NodeKey,
	type SerializedElementNode,
	type SerializedLexicalNode,
	type Spread,
} from "lexical";
import { PARAGRAPH_TOKEN } from "./grammar.js";

// --- MarkNode: shared base for the three ElementNode-based marks --------------------------------

/**
 * Shared behavior for the three ElementNode marks. Inline, never empty, and typing at its own
 * boundary must not silently extend it (decision 6) — Lexical asks the node AT the selection
 * boundary whether it accepts typed text, independent of where a prior `.select()` call pointed, so
 * this has to be a node-level override, not a caret-placement fix. `InsertionNode` overrides both
 * back to `true`: absorbing typing at its own edge is what lets "keep typing" extend one suggestion
 * instead of a new mark per keystroke.
 */
abstract class MarkNode extends ElementNode {
	override isInline(): boolean {
		return true;
	}
	override canBeEmpty(): boolean {
		return false;
	}
	override updateDOM(_prevNode: this, _dom: HTMLElement, _config: EditorConfig): boolean {
		return false;
	}
	override canInsertTextBefore(): boolean {
		return false;
	}
	override canInsertTextAfter(): boolean {
		return false;
	}
}

function markDOM(tag: "ins" | "del" | "mark", className: string): HTMLElement {
	const el = document.createElement(tag);
	el.className = className;
	return el;
}

// --- InsertionNode --------------------------------------------------------------------------------

export type SerializedInsertionNode = SerializedElementNode;

/** `{++inserted++}`. Renders as `<ins class="dj-cm-insertion">`. */
export class InsertionNode extends MarkNode {
	static override getType(): string {
		return "dj-criticmarkup-insertion";
	}

	static override clone(node: InsertionNode): InsertionNode {
		return new InsertionNode(node.__key);
	}

	override createDOM(): HTMLElement {
		return markDOM("ins", "dj-cm-insertion");
	}

	static override importJSON(serializedNode: SerializedInsertionNode): InsertionNode {
		const node = $createInsertionNode();
		node.setFormat(serializedNode.format);
		node.setIndent(serializedNode.indent);
		node.setDirection(serializedNode.direction);
		return node;
	}

	override exportJSON(): SerializedInsertionNode {
		return { ...super.exportJSON(), type: "dj-criticmarkup-insertion", version: 1 };
	}

	/** The one exception to decision 6: typing at either edge extends the insertion. */
	override canInsertTextBefore(): boolean {
		return true;
	}
	override canInsertTextAfter(): boolean {
		return true;
	}
}

export function $createInsertionNode(): InsertionNode {
	return $applyNodeReplacement(new InsertionNode());
}

export function $isInsertionNode(node: LexicalNode | null | undefined): node is InsertionNode {
	return node instanceof InsertionNode;
}

// --- DeletionNode -----------------------------------------------------------------------------

export type SerializedDeletionNode = SerializedElementNode;

/** `{--deleted--}`. Renders as `<del class="dj-cm-deletion">`. */
export class DeletionNode extends MarkNode {
	static override getType(): string {
		return "dj-criticmarkup-deletion";
	}

	static override clone(node: DeletionNode): DeletionNode {
		return new DeletionNode(node.__key);
	}

	override createDOM(): HTMLElement {
		return markDOM("del", "dj-cm-deletion");
	}

	static override importJSON(serializedNode: SerializedDeletionNode): DeletionNode {
		const node = $createDeletionNode();
		node.setFormat(serializedNode.format);
		node.setIndent(serializedNode.indent);
		node.setDirection(serializedNode.direction);
		return node;
	}

	override exportJSON(): SerializedDeletionNode {
		return { ...super.exportJSON(), type: "dj-criticmarkup-deletion", version: 1 };
	}
}

export function $createDeletionNode(): DeletionNode {
	return $applyNodeReplacement(new DeletionNode());
}

export function $isDeletionNode(node: LexicalNode | null | undefined): node is DeletionNode {
	return node instanceof DeletionNode;
}

// --- HighlightNode ----------------------------------------------------------------------------

export type SerializedHighlightNode = Spread<{ comment: string | null }, SerializedElementNode>;

/**
 * `{==highlight==}`, optionally carrying an anchored comment (`{>>note<<}`) as state rather than as
 * a sibling node — decision 4: an anchored comment is a highlight CARRYING a note, not two marks.
 * Renders as `<mark class="dj-cm-highlight">`, plus `dj-cm-has-comment` when a comment is set.
 */
export class HighlightNode extends MarkNode {
	__comment: string | null = null;

	static override getType(): string {
		return "dj-criticmarkup-highlight";
	}

	static override clone(node: HighlightNode): HighlightNode {
		const cloned = new HighlightNode(node.__key);
		cloned.__comment = node.__comment;
		return cloned;
	}

	override createDOM(): HTMLElement {
		const el = markDOM("mark", "dj-cm-highlight");
		if (this.__comment !== null) el.classList.add("dj-cm-has-comment");
		return el;
	}

	/** Only the comment presence can change post-creation; patch the class in place. */
	override updateDOM(_prevNode: this, dom: HTMLElement, _config: EditorConfig): boolean {
		dom.classList.toggle("dj-cm-has-comment", this.__comment !== null);
		return false;
	}

	static override importJSON(serializedNode: SerializedHighlightNode): HighlightNode {
		const node = $createHighlightNode();
		node.setComment(serializedNode.comment);
		node.setFormat(serializedNode.format);
		node.setIndent(serializedNode.indent);
		node.setDirection(serializedNode.direction);
		return node;
	}

	override exportJSON(): SerializedHighlightNode {
		return {
			...super.exportJSON(),
			comment: this.getComment(),
			type: "dj-criticmarkup-highlight",
			version: 1,
		};
	}

	getComment(): string | null {
		return this.getLatest().__comment;
	}

	setComment(comment: string | null): this {
		const writable = this.getWritable();
		writable.__comment = comment;
		return this;
	}
}

export function $createHighlightNode(): HighlightNode {
	return $applyNodeReplacement(new HighlightNode());
}

export function $isHighlightNode(node: LexicalNode | null | undefined): node is HighlightNode {
	return node instanceof HighlightNode;
}

// --- CommentNode ------------------------------------------------------------------------------

export type SerializedCommentNode = Spread<{ text: string }, SerializedLexicalNode>;

/**
 * `{>>note<<}`, bare or anchored (anchored state lives on the `HighlightNode` it follows, per
 * decision 4 — this class only ever represents a BARE comment). A `DecoratorNode`: it has no text of
 * its own to put a caret in. Renders as an operable `<button>`, not a styled span (decision 5) — the
 * popup behavior belongs to Track T3/T4; this is the minimal, correct shell it builds on.
 */
export class CommentNode extends DecoratorNode<HTMLElement> {
	__text: string;
	#el?: HTMLElement;

	static override getType(): string {
		return "dj-criticmarkup-comment";
	}

	static override clone(node: CommentNode): CommentNode {
		return new CommentNode(node.__text, node.__key);
	}

	constructor(text: string, key?: NodeKey) {
		super(key);
		this.__text = text;
	}

	override isInline(): boolean {
		return true;
	}

	static override importJSON(serializedNode: SerializedCommentNode): CommentNode {
		return $createCommentNode(serializedNode.text);
	}

	override exportJSON(): SerializedCommentNode {
		// DecoratorNode does not implement exportJSON (the base throws); build the object directly.
		return { type: "dj-criticmarkup-comment", version: 1, text: this.getText() };
	}

	override createDOM(): HTMLElement {
		const span = document.createElement("span");
		span.className = "dj-cm-comment";
		return span;
	}

	override updateDOM(): boolean {
		return false;
	}

	override exportDOM(): DOMExportOutput {
		const el = document.createElement("span");
		el.textContent = this.getText();
		return { element: el };
	}

	/**
	 * The button `createDOM()`'s container span mounts; accessible name is the comment text
	 * itself, carried as `aria-label` rather than as DOM content. It was a text node once
	 * (`button.textContent = this.__text`, no other child) — the button is a fixed `1.1em`
	 * icon (its glyph comes from `::before` in `CONTENT_CSS`) with no `overflow: hidden`, so a
	 * raw text node long enough to exceed that width wrapped inside the flex box one-or-two
	 * characters per line, stacking real (if visually blank, white-on-blue) layout geometry
	 * down the column. A consumer building a `Range` over this node's rendered element —
	 * NovelMaker's `rangeForMark`, `range.selectNodeContents(editor.getElementByKey(key))`,
	 * for its reveal-on-scroll highlight — measured that geometry instead of the icon: 47
	 * client rects for a ~54-character comment, one wrapped line per character, and a
	 * `getBoundingClientRect()` union hundreds of pixels tall and off by hundreds of pixels
	 * vertically from the icon's own position (confirmed live: a bare comment's reveal in
	 * NovelMaker's Edits drawer was landing ~230px off from the icon, well over half the
	 * visible editor height, before this fix). A `.dj-cm-sr-only` child — the pattern
	 * `iconLabel()` above uses for `dj-button`'s shadow-DOM buttons — only trades that for a
	 * smaller but still-wrong box: `clip: rect(0,0,0,0)` hides it from *paint*, not from
	 * layout, and its `white-space: nowrap` keeps the text on one line but at its own full
	 * natural width, so a Range over it still measures a stray sliver next to the icon.
	 * `aria-label` gives the button its accessible name with no DOM content at all, so
	 * `getElementByKey(key)`'s only child (this button) is itself a childless leaf — verified
	 * live that `range.selectNodeContents(theContainerSpan)` then reports exactly ONE rect,
	 * equal to `button.getBoundingClientRect()`: browsers fall back to an empty element's own
	 * border box as the Range's content when there's nothing inside it left to fragment into
	 * text runs. This button is a plain native `<button>`, not a custom-element host —
	 * `iconLabel()`'s own docstring is about `aria-prohibited-attr`/`button-name` axe failures
	 * specific to a role-less custom-element host and a shadow button whose only slotted
	 * content was an `aria-hidden` icon; neither applies to a real `<button>`, which has an
	 * implicit role and where `aria-label` is standard and axe-clean.
	 */
	override decorate(_editor: LexicalEditor): HTMLElement {
		if (!this.#el || this.#el.getAttribute("aria-label") !== this.__text) {
			const button = document.createElement("button");
			button.type = "button";
			button.className = "dj-cm-comment-button";
			button.setAttribute("aria-label", this.__text);
			this.#el = button;
		}
		return this.#el;
	}

	getText(): string {
		return this.getLatest().__text;
	}

	setText(text: string): this {
		const writable = this.getWritable();
		writable.__text = text;
		return this;
	}
}

export function $createCommentNode(text: string): CommentNode {
	return $applyNodeReplacement(new CommentNode(text));
}

export function $isCommentNode(node: LexicalNode | null | undefined): node is CommentNode {
	return node instanceof CommentNode;
}

// --- BreakNode --------------------------------------------------------------------------------

export type SerializedBreakNode = SerializedLexicalNode;

/**
 * A proposed paragraph break, carried as a token inside an insertion or a deletion (decision 16) —
 * never a top-level mark kind of its own. Renders as a pilcrow pill.
 *
 * MUST override `getTextContent()`: a `DecoratorNode` returns `""` by default, and the insertion and
 * deletion transformers export their content THROUGH `getTextContent()` — so without this override an
 * insertion holding a break exports as `{++++}`, an empty mark, with nothing thrown to say why.
 */
export class BreakNode extends DecoratorNode<HTMLElement> {
	static override getType(): string {
		return "dj-criticmarkup-break";
	}

	static override clone(node: BreakNode): BreakNode {
		return new BreakNode(node.__key);
	}

	override isInline(): boolean {
		return true;
	}

	static override importJSON(_serializedNode: SerializedBreakNode): BreakNode {
		return $createBreakNode();
	}

	override exportJSON(): SerializedBreakNode {
		return { type: "dj-criticmarkup-break", version: 1 };
	}

	override createDOM(): HTMLElement {
		const span = document.createElement("span");
		span.className = "dj-cm-break";
		return span;
	}

	override updateDOM(): boolean {
		return false;
	}

	override decorate(): HTMLElement {
		const pill = document.createElement("span");
		pill.className = "dj-cm-break-pill";
		pill.textContent = PARAGRAPH_TOKEN;
		return pill;
	}

	override getTextContent(): string {
		return PARAGRAPH_TOKEN;
	}
}

export function $createBreakNode(): BreakNode {
	return $applyNodeReplacement(new BreakNode());
}

export function $isBreakNode(node: LexicalNode | null | undefined): node is BreakNode {
	return node instanceof BreakNode;
}

// --- shared ----------------------------------------------------------------------------------

/** Any of the four MARK classes (decision 4) — `BreakNode` is a different axis, not a mark kind. */
export function $isCriticMark(
	node: LexicalNode | null | undefined,
): node is InsertionNode | DeletionNode | HighlightNode | CommentNode {
	return $isInsertionNode(node) || $isDeletionNode(node) || $isHighlightNode(node) || $isCommentNode(node);
}

/**
 * Content CSS: insertion underlined, deletion struck through, highlight background, comment as an
 * operable control, break as a small pill — all from `--dj-*` tokens, with a forced-colors fallback
 * so every mark stays distinguishable when backgrounds flatten. Injected once via
 * `ensureEditorStyles("dj-rich-text-criticmarkup", CONTENT_CSS)`, called from the plugin's own
 * `setup()` (Track T), not from this module — node files don't touch the DOM at import time.
 *
 * **Dark-mode fix, found in a real consumer's browser pass (NovelMaker, Q1.7 of its
 * `search-and-edits-spec.md`, 2026-09-27) and worth stating so it is not reintroduced.** The first
 * version of this CSS painted insertion/deletion/highlight backgrounds with `success-100`/
 * `danger-100`/`warning-100` — pale tints that `theme.css` only ever defines under `:root` and
 * never redefines for `.dark`/`prefers-color-scheme: dark`, so in dark mode the background stayed
 * pale while the ambient text color (`color: inherit`, or no override at all) correctly turned
 * near-white — pale-on-near-white, unreadable. This is the exact failure a consumer of this
 * package (NovelMaker) had already hit and fixed once for its own now-retired local plugin: "a pale
 * mint or pale yellow background stays pale while the text drawn on it turns near-white ... backwards
 * contrast." The same version also leaned on FOUR bare tokens — `--dj-color-success`,
 * `--dj-color-danger`, `--dj-color-primary`, `--dj-color-on-primary` — that this package's own
 * `theme.css` never defines at all (only the numbered shades exist), so every `var(--dj-color-X,
 * fallback)` using them silently and permanently resolved to its hardcoded fallback, theme or no
 * theme — invisible unless someone actually diffed light against dark, which is exactly how this
 * shipped unnoticed. **The fix, and the rule for the next person editing this block: use a token
 * that is redefined on BOTH sides of the `.dark` block in `theme.css`, never a bare
 * `--dj-color-<hue>` with no shade number (none exist), and never a `-100` tint alone for
 * anything a reader has to read text through** — `neutral-100`/`-200` (confirmed to invert:
 * `#f3f4f6`/`#e5e7eb` light, `#1f2937`/`#374151` dark) carry the backgrounds now, and the `-600`
 * semantic shades (all three of `success`/`warning`/`danger` are redefined for dark, confirmed by
 * reading `theme.css` directly rather than assumed) carry the decorative accent color, which only
 * has to read as a thin line, not as body text.
 */
export const CONTENT_CSS = `
dj-rich-text ins.dj-cm-insertion { text-decoration: underline; text-decoration-thickness: 2px; text-decoration-color: var(--dj-color-success-600, #16a34a); text-decoration-skip-ink: none; background: var(--dj-color-neutral-100, #f3f4f6); }
dj-rich-text del.dj-cm-deletion { text-decoration: line-through; text-decoration-thickness: 2px; text-decoration-color: var(--dj-color-danger-600, #dc2626); background: var(--dj-color-neutral-100, #f3f4f6); }
dj-rich-text mark.dj-cm-highlight { background: var(--dj-color-neutral-200, #e5e7eb); color: inherit; }
dj-rich-text mark.dj-cm-highlight.dj-cm-has-comment { box-shadow: inset 0 -2px 0 var(--dj-color-warning-600, #ca8a04); }
dj-rich-text .dj-cm-comment-button { display: inline-flex; align-items: center; justify-content: center; width: 1.1em; height: 1.1em; padding: 0; border: none; border-radius: 999px; background: var(--dj-color-primary-600, #2563eb); color: var(--dj-color-neutral-0, #fff); font-size: .75em; line-height: 1; cursor: pointer; }
dj-rich-text .dj-cm-comment-button::before { content: "\\1F4AC"; }
dj-rich-text .dj-cm-break-pill { display: inline-block; padding: 0 .3em; border-radius: 3px; background: var(--dj-color-primary-100, #dbeafe); color: var(--dj-color-primary-700, #1d4ed8); font-size: .85em; }
.dj-cm-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (forced-colors: active) {
	dj-rich-text ins.dj-cm-insertion, dj-rich-text del.dj-cm-deletion { background: transparent; text-decoration-color: CanvasText; }
	dj-rich-text mark.dj-cm-highlight { background: Mark; color: MarkText; border: 1px solid CanvasText; }
	dj-rich-text mark.dj-cm-highlight.dj-cm-has-comment { box-shadow: none; border-style: dashed; }
	dj-rich-text .dj-cm-comment-button { forced-color-adjust: none; background: Highlight; color: HighlightText; border: 1px solid CanvasText; }
	dj-rich-text .dj-cm-break-pill { forced-color-adjust: none; background: Canvas; color: CanvasText; border: 1px solid CanvasText; }
}
`;
