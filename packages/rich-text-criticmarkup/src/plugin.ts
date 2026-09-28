/**
 * The assembled `RichTextPlugin` (Track T3): the toolbar (six controls in group `criticmarkup`),
 * the `criticmarkup` format, and the `setup()` that ties every earlier track together — the
 * suggestion-mode listener/commands (S1/S3), the decorator mount for `CommentNode`/`BreakNode`
 * (deferred from N1), the content styles (deferred from N1), and the shared comment popup (T3/T4).
 */

import { html, type ReactiveControllerHost, type TemplateResult } from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import { $getNearestNodeFromDOMNode, $getSelection, $isRangeSelection, type LexicalEditor, type LexicalNode } from "lexical";
import { mergeRegister } from "@lexical/utils";
import { getDefaultLocale, messages, registerDefaults } from "@dojo-ng/i18n";
import { defineRichTextPlugin, ensureEditorStyles, type RichTextContext, type RichTextPlugin, type RichTextToolbarItem } from "@dojo-ng/rich-text";
import "@dojo-ng/popup-confirmation";
import "@dojo-ng/button";
import {
	CONTENT_CSS,
	CommentNode,
	DeletionNode,
	HighlightNode,
	InsertionNode,
	BreakNode,
	$isCommentNode,
	$isHighlightNode,
} from "./nodes.js";
import { deserializeCriticMarkup, serializeCriticMarkup } from "./format.js";
import { PARAGRAPH_TOKEN } from "./grammar.js";
import { setSuggestionMode, isSuggestionMode, configureSuggestionMode, type StructuralPolicy } from "./suggestion-mode.js";
import { markAtSelection, acceptMark, declineMark, acceptAllMarks, declineAllMarks } from "./resolution.js";
import { createCommentPopupController, type CommentPopupController } from "./comment-popup.js";

export interface CriticMarkupOptions {
	/** Start in suggestion mode. Default `false`. */
	suggesting?: boolean;
	/** What suggestion mode does with a block-structure change (decisions 14, 16). Default `"mark"`. */
	structuralEdits?: StructuralPolicy;
	/** The paragraph-break token (decision 16). Default `PARAGRAPH_TOKEN`. */
	paragraphToken?: string;
	/** Confirm accept-all / decline-all through `dj-popup-confirmation`. Default `true`. */
	confirmBulk?: boolean;
	/** Contribute the six toolbar controls. Default `true`. */
	toolbar?: boolean;
}

const EN: Record<string, string> = {
	suggestEdits: "Suggest edits",
	acceptMark: "Accept suggestion",
	rejectMark: "Reject suggestion",
	acceptAll: "Accept all",
	rejectAll: "Reject all",
	addComment: "Add comment",
	comment: "Comment",
	save: "Save",
	cancel: "Cancel",
	removeNote: "Remove note",
	removeHighlight: "Remove highlight",
	confirmAcceptAll: "Accept every suggested change?",
	confirmRejectAll: "Reject every suggested change?",
};
registerDefaults("dj", EN);

function msg(ctx: RichTextContext, key: string): string {
	const locale = ctx.host.getAttribute("lang") || getDefaultLocale();
	return messages.resolve("dj", locale, key) ?? EN[key] ?? key;
}

const POPUPS = new WeakMap<LexicalEditor, CommentPopupController>();
const WIRED_COMMENT_BUTTONS = new WeakSet<HTMLElement>();

/** Build the CriticMarkup plugin. */
export function createCriticMarkupPlugin(options: CriticMarkupOptions = {}): RichTextPlugin {
	const structuralEdits = options.structuralEdits ?? "mark";
	const paragraphToken = options.paragraphToken ?? PARAGRAPH_TOKEN;
	const confirmBulk = options.confirmBulk ?? true;
	const showToolbar = options.toolbar ?? true;

	return defineRichTextPlugin({
		name: "criticmarkup",
		nodes: [InsertionNode, DeletionNode, HighlightNode, CommentNode, BreakNode],
		formats: {
			criticmarkup: {
				serialize: (editor) => serializeCriticMarkup(editor),
				deserialize: (editor, data) => deserializeCriticMarkup(editor, data, { paragraphToken }),
			},
		},
		inserts: [
			{
				id: "comment",
				label: "Comment",
				keywords: ["comment", "note", "annotate"],
				run: (ctx) => POPUPS.get(ctx.editor)?.open({ anchor: ctx.host, mode: "insert-bare", text: "" }),
			},
		],
		setup: (ctx) => {
			ensureEditorStyles("dj-rich-text-criticmarkup", CONTENT_CSS);
			configureSuggestionMode(ctx.editor, { structuralEdits });
			if (options.suggesting) setSuggestionMode(ctx.editor, true);

			const popup = createCommentPopupController(ctx.editor, (key) => msg(ctx, key));
			ctx.host.appendChild(popup.element);
			POPUPS.set(ctx.editor, popup);

			// The highlight's own affordance (decision 15): clicking a highlight that carries a
			// comment opens the same popup an anchored comment is edited through, event-delegated
			// off the host rather than wired per-node (HighlightNode is a plain ElementNode, not a
			// decorator, so it has no per-instance mount hook to attach a listener from).
			const onHostClick = (event: Event): void => {
				const target = event.target;
				if (!(target instanceof Element)) return;
				const mark = target.closest<HTMLElement>(".dj-cm-highlight.dj-cm-has-comment");
				if (!mark) return;
				let node: LexicalNode | null = null;
				let text = "";
				// editor.read(), not editorState.read(): $getNearestNodeFromDOMNode needs the
				// ACTIVE EDITOR (for the DOM-node-to-key lookup), which only editor.read() sets —
				// editorState.read() sets only the active editor STATE and throws Lexical error
				// #196 ("unable to find an active editor") the moment it's called.
				ctx.editor.read(() => {
					const found = $getNearestNodeFromDOMNode(mark);
					if (found && $isHighlightNode(found)) {
						node = found;
						text = found.getComment() ?? "";
					}
				});
				if (node) popup.open({ anchor: mark, mode: "edit-highlight", text, node });
			};
			ctx.host.addEventListener("click", onHostClick);

			return mergeRegister(
				// Mount CommentNode/BreakNode decorate() output (deferred from N1) and wire the
				// comment button to open the popup, once per button — the click handler resolves
				// the CURRENT node fresh each time rather than closing over one, so it never shows
				// stale text if the note changed by some other path since the button was wired.
				ctx.editor.registerDecoratorListener<HTMLElement>((decorators) => {
					for (const [key, el] of Object.entries(decorators)) {
						const container = ctx.editor.getElementByKey(key);
						if (!container) continue;
						// `replaceChildren`, not a conditional `appendChild`: `CommentNode`/`BreakNode`
						// both hand back a NEW element instance on some `decorate()` calls (an unrelated
						// sibling edit is enough — Lexical re-clones a node whose OWN `__next`/`__prev`
						// pointer just changed, even though nothing the node itself owns did, and a
						// fresh clone's `decorate()` cache starts empty). `appendChild`-if-not-already-a-
						// child leaves the STALE element from the previous call sitting in `container`
						// forever, so the same single comment/break visibly multiplies with every nearby
						// edit. Clearing first makes `container` hold exactly the current `el`, however
						// many times `decorate()` has run for this key.
						if (container.firstChild !== el || container.childNodes.length > 1) container.replaceChildren(el);
						// tagName, not `instanceof HTMLButtonElement` — a real button either way, but
						// this avoids depending on that specific global existing (some DOM test
						// environments curate a narrower global set than a real browser's).
						if (el.tagName === "BUTTON" && !WIRED_COMMENT_BUTTONS.has(el)) {
							WIRED_COMMENT_BUTTONS.add(el);
							el.addEventListener("click", () => {
								let node: LexicalNode | null = null;
								let text = "";
								ctx.editor.read(() => { // see the comment on the highlight-click handler above
									const found = $getNearestNodeFromDOMNode(el);
									if (found && $isCommentNode(found)) {
										node = found;
										text = found.getText();
									}
								});
								if (node) popup.open({ anchor: el, mode: "edit-comment", text, node });
							});
						}
					}
				}),
				() => ctx.host.removeEventListener("click", onHostClick),
				() => POPUPS.delete(ctx.editor),
			);
		},
		toolbar: showToolbar ? (ctx) => toolbarItems(ctx, confirmBulk) : undefined,
	});
}

/** The CriticMarkup plugin with the default options. */
export const criticMarkupPlugin = createCriticMarkupPlugin();

export default criticMarkupPlugin;

// --- toolbar ------------------------------------------------------------------------------------

/**
 * A compact icon plus a name the ACCESSIBLE-NAME ALGORITHM sees but no sighted user does — visually
 * clipped, never `display:none`/`aria-hidden` (either would drop it from the accessibility tree
 * too, defeating the point). Both slot into `dj-button`'s DEFAULT slot alongside the icon slot, so
 * the native `<button>` in its shadow root gets a real accessible name from its own rendered text
 * content — the path `dj-button`'s own docstring calls "the common case," not `aria-label` on the
 * host, which is the path six toolbar items were moved OFF of after a real axe run flagged it
 * (`aria-prohibited-attr` on the role-less host, `button-name` on the shadow button whose only
 * content was an `aria-hidden` icon). Restores the compact layout the visible-text swap gave up —
 * found necessary in the same real consumer pass that found the two fixes above it (NovelMaker,
 * Q1.7, 2026-09-27: "the text runs off the end of the toolbar... what happened to the icons?") —
 * without reopening the violation the text swap was for: the icon is `aria-hidden` (decorative,
 * the name already comes from the sr-only text) and the sr-only text is real, present content, not
 * a host-level attribute a shadow boundary or a role-less element could make axe suspicious of.
 * Verified against a real axe run in `tests/browser/rich-text-criticmarkup.test.js`, not assumed —
 * see that file's own new case.
 */
function iconLabel(icon: string, text: string): TemplateResult {
	return html`<span slot="icon" aria-hidden="true">${icon}</span><span class="dj-cm-sr-only">${text}</span>`;
}

function toolbarItems(ctx: RichTextContext, confirmBulk: boolean): RichTextToolbarItem[] {
	const addCommentRef = createRef<HTMLElement>();

	const acceptAllContent: TemplateResult = confirmBulk
		? html`<dj-popup-confirmation confirm-label=${msg(ctx, "acceptAll")} @dj-confirm=${() => acceptAllMarks(ctx.editor)}>
				<span slot="content">${msg(ctx, "confirmAcceptAll")}</span>
				<dj-button kind="text" title=${msg(ctx, "acceptAll")}>${iconLabel("✓✓", msg(ctx, "acceptAll"))}</dj-button>
			</dj-popup-confirmation>`
		: html`<dj-button kind="text" title=${msg(ctx, "acceptAll")} @click=${() => acceptAllMarks(ctx.editor)}
				>${iconLabel("✓✓", msg(ctx, "acceptAll"))}</dj-button
			>`;

	const rejectAllContent: TemplateResult = confirmBulk
		? html`<dj-popup-confirmation confirm-label=${msg(ctx, "rejectAll")} @dj-confirm=${() => declineAllMarks(ctx.editor)}>
				<span slot="content">${msg(ctx, "confirmRejectAll")}</span>
				<dj-button kind="text" title=${msg(ctx, "rejectAll")}>${iconLabel("✗✗", msg(ctx, "rejectAll"))}</dj-button>
			</dj-popup-confirmation>`
		: html`<dj-button kind="text" title=${msg(ctx, "rejectAll")} @click=${() => declineAllMarks(ctx.editor)}
				>${iconLabel("✗✗", msg(ctx, "rejectAll"))}</dj-button
			>`;

	return [
		{
			id: "criticmarkup-suggest",
			group: "criticmarkup",
			order: 0,
			label: msg(ctx, "suggestEdits"),
			isActive: (c) => isSuggestionMode(c.editor),
			run: (c) => setSuggestionMode(c.editor, !isSuggestionMode(c.editor)),
			// A custom render, not the core's default icon+aria-label button: axe reports that shape
			// (aria-label on a role-less host, an aria-hidden-only icon inside shadow DOM) as an
			// unnamed button in this environment — the same VISIBLE-TEXT shape the other four items
			// already use here is what actually passes. `isActive`/`run` stay set too, so this item's
			// state is still checkable directly (headless tests read `item.isActive(ctx)`), even
			// though the core ignores them once `render` is present.
			//
			// `kind` switches to `"outlined"` while active, found missing in a real consumer's
			// browser pass (NovelMaker, Q1.7, 2026-09-27): `aria-pressed` alone changes nothing a
			// sighted mouse user can see — `dj-button` has no CSS reacting to it at all, the exact
			// gap this project's own T10 track hit once before with a different attribute. Switching
			// `kind` reuses `dj-button`'s OWN existing, already-themed outlined style (a persistent
			// border in `--dj-color-primary-600`, confirmed to invert for dark mode by the same
			// theme.css read that fixed `nodes.ts`'s `CONTENT_CSS`) rather than adding new CSS here
			// that would need its own dark-mode proof.
			render: (c) => {
				const active = isSuggestionMode(c.editor);
				return html`<dj-button
					kind=${active ? "outlined" : "text"}
					title=${msg(ctx, "suggestEdits")}
					aria-pressed=${active}
					@click=${() => {
						setSuggestionMode(c.editor, !isSuggestionMode(c.editor));
						// isSuggestionMode is a WeakMap, entirely outside Lexical's own editor
						// state — no document mutation, no selection change, so NEITHER of the
						// core's two built-in re-render triggers (registerUpdateListener,
						// onSelectionChange) ever fires from this click. Without this the click
						// genuinely works (confirmed: isSuggestionMode(editor) flips) but the
						// DOM — aria-pressed, the kind="outlined" border decision 18's own fix
						// above depends on — stays stale until some UNRELATED later action
						// happens to re-render the toolbar, which is exactly the false-positive
						// shape that let this ship once already: a manual browser check that
						// clicked the button and then did something else right after read the
						// SECOND action's incidental re-render as proof the click worked. Found
						// by checking isSuggestionMode(editor) directly against the DOM
						// attribute after a click and nothing else — the same gap, and the
						// same fix (`ctx.host.requestUpdate()`), NovelMaker's own retired local
						// plugin had already hit for this exact button before this package
						// existed; `RichTextContext.host`'s own doc comment even names
						// requestUpdate as a reason a plugin holds a host reference.
						// `RichTextContext.host` is typed as the narrower `HTMLElement` for the
						// public API surface; it is always a `dj-rich-text`, a real
						// ReactiveElement, at runtime — the same cast `RichTextContext.host`'s
						// own doc comment invites by naming requestUpdate as a reason to hold it.
						(c.host as unknown as ReactiveControllerHost).requestUpdate();
					}}
					>${iconLabel("✎", msg(ctx, "suggestEdits"))}</dj-button
				>`;
			},
		},
		{
			id: "criticmarkup-accept",
			group: "criticmarkup",
			order: 10,
			label: msg(ctx, "acceptMark"),
			isDisabled: (c) => markAtSelection(c.editor) === null,
			run: (c) => {
				const node = markAtSelection(c.editor);
				if (node) acceptMark(c.editor, node);
			},
			render: (c) => {
				const disabled = markAtSelection(c.editor) === null;
				return html`<dj-button
					kind="text"
					title=${msg(ctx, "acceptMark")}
					?disabled=${disabled}
					@click=${() => {
						const node = markAtSelection(c.editor);
						if (node) acceptMark(c.editor, node);
					}}
					>${iconLabel("✓", msg(ctx, "acceptMark"))}</dj-button
				>`;
			},
		},
		{
			id: "criticmarkup-reject",
			group: "criticmarkup",
			order: 20,
			label: msg(ctx, "rejectMark"),
			isDisabled: (c) => markAtSelection(c.editor) === null,
			run: (c) => {
				const node = markAtSelection(c.editor);
				if (node) declineMark(c.editor, node);
			},
			render: (c) => {
				const disabled = markAtSelection(c.editor) === null;
				return html`<dj-button
					kind="text"
					title=${msg(ctx, "rejectMark")}
					?disabled=${disabled}
					@click=${() => {
						const node = markAtSelection(c.editor);
						if (node) declineMark(c.editor, node);
					}}
					>${iconLabel("✗", msg(ctx, "rejectMark"))}</dj-button
				>`;
			},
		},
		{
			id: "criticmarkup-accept-all",
			group: "criticmarkup",
			order: 30,
			label: msg(ctx, "acceptAll"),
			render: () => acceptAllContent,
		},
		{
			id: "criticmarkup-reject-all",
			group: "criticmarkup",
			order: 40,
			label: msg(ctx, "rejectAll"),
			render: () => rejectAllContent,
		},
		{
			id: "criticmarkup-add-comment",
			group: "criticmarkup",
			order: 50,
			label: msg(ctx, "addComment"),
			render: () =>
				html`<dj-button
					${ref(addCommentRef)}
					kind="text"
					title=${msg(ctx, "addComment")}
					@click=${() => {
						const anchor = addCommentRef.value;
						const popup = POPUPS.get(ctx.editor);
						if (!anchor || !popup) return;
						const collapsed = isSelectionCollapsed(ctx.editor);
						popup.open({ anchor, mode: collapsed ? "insert-bare" : "insert-anchored", text: "" });
					}}
					>${iconLabel("\u{1F4AC}", msg(ctx, "addComment"))}</dj-button
				>`,
		},
	];
}

function isSelectionCollapsed(editor: LexicalEditor): boolean {
	let collapsed = true;
	editor.getEditorState().read(() => {
		const selection = $getSelection();
		if ($isRangeSelection(selection)) collapsed = selection.isCollapsed();
	});
	return collapsed;
}
