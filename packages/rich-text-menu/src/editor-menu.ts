import {
	$getSelection,
	$isRangeSelection,
	$isTextNode,
	KEY_ARROW_DOWN_COMMAND,
	KEY_ARROW_UP_COMMAND,
	KEY_ENTER_COMMAND,
	KEY_ESCAPE_COMMAND,
	KEY_TAB_COMMAND,
	COMMAND_PRIORITY_HIGH,
} from "lexical";
import type { RichTextContext } from "@dojo-ng/rich-text";
import type { ListOption } from "@dojo-ng/list";
import "@dojo-ng/popup";
import "@dojo-ng/list";

/**
 * Shared caret-anchored menu machinery for `<dj-rich-text>` plugins (mentions, slash commands). A
 * plugin describes a trigger with an `EditorMenuConfig` and drives the resulting menu through
 * `setOptions`; the menu owns the popup, the `dj-list`, caret positioning, keyboard navigation
 * (arrows/Enter/Tab/Escape), the live-region announcements, and light-dismiss. Positioning and the
 * interactive feel are browser-verified; the trigger match is unit-testable (see `computeMatch`).
 */

/** A trigger match located in the caret's TextNode: `[start, end)` covers the trigger + query text. */
export interface MenuMatch { start: number; end: number; query: string; }

export interface EditorMenuConfig {
	/** Given the text before the caret, return the match `{ start, query }` or null (no trigger). */
	match(textBeforeCaret: string): { start: number; query: string } | null;
	/** The query changed: fetch/filter, then call `setOptions`. */
	onQueryChange(query: string): void;
	/**
	 * An option was chosen; the trigger+query text has already been removed. WHERE this runs depends on
	 * `pickInUpdate`:
	 *  - `pickInUpdate: true` — called INSIDE the active `editor.update`, selection collapsed at the
	 *    removal point. Insert nodes directly (or open a nested `editor.update`); do NOT dispatch
	 *    commands. Use this when the pick inserts at the caret (mentions).
	 *  - default — called AFTER the removal update commits, OUTSIDE any `editor.update`, so the handler
	 *    may dispatch commands or open dialogs (the slash menu's `run`).
	 */
	onPick(option: ListOption): void;
	/** Run `onPick` inside the trigger-removal update (see `onPick`). Default false. */
	pickInUpdate?: boolean;
}

export interface EditorMenu {
	/** Replace the menu's options (and loading state); highlights the first selectable option. */
	setOptions(options: ListOption[], loading?: boolean): void;
	readonly open: boolean;
	close(): void;
	dispose(): void;
}

/** Pure trigger helper (exported for testing): run `matchFn` over the text before the caret. */
export function computeMatch(
	textBeforeCaret: string,
	matchFn: EditorMenuConfig["match"],
): { start: number; query: string } | null {
	return matchFn(textBeforeCaret);
}

type PopupEl = HTMLElement & {
	open: boolean;
	scrollLock: boolean;
	position: string;
	xLeft: number;
	yTop: number;
	yBottom: number;
	anchor?: HTMLElement;
	close(): void;
};
type ListEl = HTMLElement & {
	options: ListOption[];
	loading: boolean;
	value: string;
	menu: boolean;
	moveActive(delta: 1 | -1): void;
	activateFirst(): void;
	chooseActive(): boolean;
};

const HIDDEN_STYLE =
	"position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;";

/** Create a caret-anchored menu bound to `ctx.editor`, driven by `config`. */
export function createEditorMenu(ctx: RichTextContext, config: EditorMenuConfig): EditorMenu {
	const editor = ctx.editor;
	let popup: PopupEl | null = null;
	let list: ListEl | null = null;
	let live: HTMLElement | null = null;
	let currentMatch: MenuMatch | null = null;
	let lastQuery: string | null = null;
	let keyDisposers: Array<() => void> = [];
	let isOpen = false;
	let blurTimer: ReturnType<typeof setTimeout> | undefined;
	let activePos = -1; // position within the selectable options (mirrors dj-list's active walk)

	const editable = (): HTMLElement =>
		(ctx.host.querySelector(".dj-rt-editable") as HTMLElement | null) ?? ctx.host;

	const selectable = (): ListOption[] =>
		(list?.options ?? []).filter((o) => !o.disabled && !o.divider);

	function updateLive(): void {
		if (!live) return;
		const sel = selectable();
		if (activePos < 0 || activePos >= sel.length) { live.textContent = ""; return; }
		const o = sel[activePos];
		live.textContent = `${o.label ?? o.value}, ${activePos + 1} of ${sel.length}`;
	}

	function ensureUI(): void {
		if (popup) return;
		popup = document.createElement("dj-popup") as PopupEl;
		popup.position = "below";
		popup.scrollLock = false;
		list = document.createElement("dj-list") as ListEl;
		list.menu = true;
		live = document.createElement("div");
		live.setAttribute("aria-live", "polite");
		live.style.cssText = HIDDEN_STYLE;
		popup.appendChild(list);
		popup.appendChild(live);
		document.body.appendChild(popup);
		// A click on an option fires `change`; funnel it (and Enter/Tab via chooseActive) into pick.
		list.addEventListener("change", () => {
			const opt = list?.options.find((o) => o.value === list?.value);
			if (opt) pick(opt);
		});
		popup.addEventListener("dj-close", () => close());
		// A pointer press inside the popup must not let the editable's blur close the menu.
		popup.addEventListener("pointerdown", () => {
			if (blurTimer) { clearTimeout(blurTimer); blurTimer = undefined; }
		});
	}

	function positionMenu(): void {
		if (!popup) return;
		let rect: DOMRect | null = null;
		try {
			const winSel = window.getSelection?.();
			if (winSel && winSel.rangeCount > 0) {
				const range = winSel.getRangeAt(0);
				rect = range.getBoundingClientRect();
				if (rect && rect.top === 0 && rect.bottom === 0 && rect.left === 0) {
					const rects = range.getClientRects();
					if (rects.length) rect = rects[0];
				}
			}
		} catch {
			rect = null;
		}
		if (!rect || (rect.top === 0 && rect.bottom === 0 && rect.left === 0)) {
			const ed = editable();
			if (ed && typeof ed.getBoundingClientRect === "function") rect = ed.getBoundingClientRect();
		}
		if (!rect) return;
		popup.anchor = undefined;
		popup.xLeft = rect.left;
		popup.yTop = rect.top;
		popup.yBottom = rect.bottom;
	}

	const onBlur = (): void => {
		blurTimer = setTimeout(() => close(), 150);
	};

	// Show the popup only while open AND there is something to show (options, or a pending load). An
	// empty, not-loading list keeps the popup hidden — so the slash menu never opens when no plugin
	// contributes an insert, and a query that filters to nothing hides rather than showing an empty box.
	function syncPopupOpen(): void {
		if (!popup) return;
		popup.open = isOpen && (!!list?.loading || selectable().length > 0);
	}

	function registerKeys(): void {
		if (keyDisposers.length) return;
		// Each handler must call preventDefault on the KeyboardEvent payload: returning true only stops
		// Lexical's own command chain, not the browser's native contentEditable action. Without it the
		// caret still moves (ArrowUp then leaves the trigger and closes the menu) and Enter still inserts
		// a newline even though we consumed the key.
		keyDisposers = [
			editor.registerCommand(KEY_ARROW_DOWN_COMMAND, (event) => {
				event?.preventDefault();
				list?.moveActive(1);
				const n = selectable().length;
				if (n) activePos = (activePos + 1 + n) % n;
				updateLive();
				return true;
			}, COMMAND_PRIORITY_HIGH),
			editor.registerCommand(KEY_ARROW_UP_COMMAND, (event) => {
				event?.preventDefault();
				list?.moveActive(-1);
				const n = selectable().length;
				if (n) activePos = (activePos - 1 + n) % n;
				updateLive();
				return true;
			}, COMMAND_PRIORITY_HIGH),
			// Enter/Tab pick the active option; when nothing is active, fall through (no preventDefault)
			// so a normal newline/tab still works.
			editor.registerCommand(KEY_ENTER_COMMAND, (event) => {
				if (!list?.chooseActive()) return false;
				event?.preventDefault();
				return true;
			}, COMMAND_PRIORITY_HIGH),
			editor.registerCommand(KEY_TAB_COMMAND, (event) => {
				if (!list?.chooseActive()) return false;
				event?.preventDefault();
				return true;
			}, COMMAND_PRIORITY_HIGH),
			editor.registerCommand(KEY_ESCAPE_COMMAND, () => { close(); return true; }, COMMAND_PRIORITY_HIGH),
		];
	}

	function disposeKeys(): void {
		for (const d of keyDisposers) d();
		keyDisposers = [];
	}

	function openMenu(): void {
		if (isOpen) return;
		isOpen = true;
		const ed = editable();
		ed.setAttribute("aria-haspopup", "listbox");
		ed.setAttribute("aria-expanded", "true");
		ed.addEventListener("blur", onBlur);
		registerKeys();
		syncPopupOpen();
	}

	function pick(option: ListOption): void {
		const match = currentMatch;
		if (!match) { close(); return; }
		// Remove the trigger text. When `pickInUpdate` is set, run onPick in the SAME update so an
		// at-caret insertion keeps the collapsed selection (a separate update loses it — the emptied
		// trigger node is reconciled away). Otherwise run onPick AFTER the update commits, so the
		// handler may dispatch commands / open dialogs outside any active update (the slash menu).
		let removed = false;
		editor.update(() => {
			const sel = $getSelection();
			if (!$isRangeSelection(sel) || !sel.isCollapsed()) return;
			const node = sel.anchor.getNode();
			if (!$isTextNode(node)) return;
			const offset = sel.anchor.offset;
			const before = node.getTextContent().slice(0, offset);
			const m = config.match(before);
			if (!m) return;
			removed = true;
			const start = m.start;
			const end = offset;
			if (typeof node.spliceText === "function") {
				node.spliceText(start, end - start, "", true);
			} else {
				const pieces = node.splitText(start, end);
				const mid = start > 0 ? pieces[1] : pieces[0];
				if (mid) mid.remove();
			}
			if (config.pickInUpdate) config.onPick(option);
		});
		if (removed && !config.pickInUpdate) config.onPick(option);
		close();
	}

	function onMatch(match: MenuMatch): void {
		currentMatch = match;
		ensureUI();
		openMenu();
		positionMenu();
		if (match.query !== lastQuery) {
			lastQuery = match.query;
			config.onQueryChange(match.query);
		}
	}

	const triggerDisposer = editor.registerUpdateListener(() => {
		editor.getEditorState().read(() => {
			const sel = $getSelection();
			if (!$isRangeSelection(sel) || !sel.isCollapsed()) { if (isOpen) close(); return; }
			const node = sel.anchor.getNode();
			if (!$isTextNode(node)) { if (isOpen) close(); return; }
			const offset = sel.anchor.offset;
			const m = config.match(node.getTextContent().slice(0, offset));
			if (!m) { if (isOpen) close(); return; }
			onMatch({ start: m.start, end: offset, query: m.query });
		});
	});

	function close(): void {
		lastQuery = null;
		currentMatch = null;
		activePos = -1;
		if (blurTimer) { clearTimeout(blurTimer); blurTimer = undefined; }
		disposeKeys();
		const ed = editable();
		ed.removeAttribute("aria-haspopup");
		ed.removeAttribute("aria-expanded");
		ed.removeEventListener("blur", onBlur);
		if (popup) popup.open = false;
		isOpen = false;
	}

	return {
		setOptions(options: ListOption[], loading = false): void {
			ensureUI();
			if (!list) return;
			list.options = options;
			list.loading = loading;
			list.activateFirst();
			activePos = selectable().length ? 0 : -1;
			updateLive();
			syncPopupOpen();
		},
		get open(): boolean { return isOpen; },
		close,
		dispose(): void {
			close();
			triggerDisposer();
			if (popup && popup.parentNode) popup.parentNode.removeChild(popup);
			popup = null;
			list = null;
			live = null;
		},
	};
}
