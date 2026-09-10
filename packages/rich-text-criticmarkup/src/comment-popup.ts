/**
 * The comment popup shell (Track T3, filled in by T4): ONE shared `dj-popup` holding a
 * `dj-text-area` and Save/Cancel/"Remove note"/"Remove highlight" controls, opened against
 * whichever control triggered it — the toolbar's add-comment button, a bare `CommentNode`'s own
 * button, or a `HighlightNode` with a comment. Built once by the plugin's `setup()` (decision 15's
 * "the popup and its focus handling exist in one place"), not per node instance.
 *
 * Focus management (decision 15): opening moves focus to the text area; Escape closes without
 * saving; Save and Cancel both return focus to the control that opened the popup.
 */

import "@dojo-ng/popup";
import "@dojo-ng/text-area";
import "@dojo-ng/button";
import type { LexicalEditor, LexicalNode } from "lexical";
import { editComment, insertComment, removeComment, removeHighlight } from "./comment-authoring.js";

export type CommentPopupMode = "insert-bare" | "insert-anchored" | "edit-comment" | "edit-highlight";

export interface CommentPopupOpenOptions {
	anchor: HTMLElement;
	mode: CommentPopupMode;
	/** The current text to seed the field with — "" for an insert. */
	text: string;
	/** Required for "edit-comment"/"edit-highlight"; ignored for the insert modes. */
	node?: LexicalNode;
}

export interface CommentPopupController {
	/** The `dj-popup` element — append it once, anywhere reachable in the DOM. */
	element: HTMLElement;
	open(options: CommentPopupOpenOptions): void;
}

type DjPopupEl = HTMLElement & { open: boolean; anchor?: HTMLElement; position: string };
type DjTextAreaEl = HTMLElement & { value: string; focus(): void };
type DjButtonEl = HTMLElement & { disabled: boolean; hidden: boolean };

export function createCommentPopupController(editor: LexicalEditor, msg: (key: string) => string): CommentPopupController {
	const popup = document.createElement("dj-popup") as DjPopupEl;
	popup.position = "below";
	popup.className = "dj-cm-comment-popup";

	const panel = document.createElement("div");
	panel.className = "dj-cm-comment-popup-panel";

	const textArea = document.createElement("dj-text-area") as DjTextAreaEl;
	textArea.setAttribute("label", msg("comment"));
	textArea.setAttribute("label-hidden", "");
	textArea.setAttribute("rows", "3");

	const error = document.createElement("div");
	error.className = "dj-cm-comment-popup-error";
	error.setAttribute("role", "alert");
	error.hidden = true;

	const actions = document.createElement("div");
	actions.className = "dj-cm-comment-popup-actions";

	const saveButton = document.createElement("dj-button") as DjButtonEl;
	saveButton.setAttribute("kind", "contained");
	saveButton.textContent = msg("save");

	const cancelButton = document.createElement("dj-button") as DjButtonEl;
	cancelButton.setAttribute("kind", "text");
	cancelButton.textContent = msg("cancel");

	const removeNoteButton = document.createElement("dj-button") as DjButtonEl;
	removeNoteButton.setAttribute("kind", "text");
	removeNoteButton.textContent = msg("removeNote");

	const removeHighlightButton = document.createElement("dj-button") as DjButtonEl;
	removeHighlightButton.setAttribute("kind", "text");
	removeHighlightButton.textContent = msg("removeHighlight");

	actions.append(saveButton, cancelButton, removeNoteButton, removeHighlightButton);
	panel.append(textArea, error, actions);
	popup.append(panel);

	let state: { mode: CommentPopupMode; node: LexicalNode | null; returnFocus: HTMLElement | null } = {
		mode: "insert-bare",
		node: null,
		returnFocus: null,
	};

	function showError(message: string): void {
		error.textContent = message;
		error.hidden = false;
	}

	function clearError(): void {
		error.hidden = true;
		error.textContent = "";
	}

	function close(): void {
		popup.open = false;
		state.returnFocus?.focus();
	}

	function save(): void {
		clearError();
		const text = textArea.value;
		try {
			switch (state.mode) {
				case "insert-bare":
				case "insert-anchored":
					insertComment(editor, text);
					break;
				case "edit-comment":
				case "edit-highlight":
					if (state.node) editComment(editor, state.node, text);
					break;
			}
		} catch (err) {
			showError(err instanceof Error ? err.message : String(err));
			return;
		}
		close();
	}

	function doRemoveNote(): void {
		if (state.node) removeComment(editor, state.node);
		close();
	}

	function doRemoveHighlight(): void {
		if (state.node) removeHighlight(editor, state.node);
		close();
	}

	saveButton.addEventListener("click", save);
	cancelButton.addEventListener("click", close);
	removeNoteButton.addEventListener("click", doRemoveNote);
	removeHighlightButton.addEventListener("click", doRemoveHighlight);
	popup.addEventListener("dj-close", () => {
		state.returnFocus?.focus();
	});
	textArea.addEventListener("keydown", (e) => {
		if (e.key === "Escape") {
			e.stopPropagation();
			close();
		}
	});

	function open(options: CommentPopupOpenOptions): void {
		state = { mode: options.mode, node: options.node ?? null, returnFocus: options.anchor };
		clearError();
		textArea.value = options.text;
		const showDeletes = options.mode === "edit-highlight";
		removeNoteButton.hidden = !showDeletes;
		removeHighlightButton.hidden = !showDeletes;
		popup.anchor = options.anchor;
		popup.open = true;
		queueMicrotask(() => textArea.focus());
	}

	return { element: popup, open };
}
