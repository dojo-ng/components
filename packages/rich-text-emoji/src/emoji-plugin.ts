import { html } from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import { $getRoot, $getSelection, $isRangeSelection, TextNode } from "lexical";
import { getDefaultLocale, messages, registerDefaults } from "@dojo-ng/i18n";
import { defineRichTextPlugin, ensureEditorStyles, type RichTextContext, type RichTextPlugin } from "@dojo-ng/rich-text";
import "@dojo-ng/popup";
import "@dojo-ng/button";
import "@dojo-ng/text-input";
import { EMOJI, type EmojiEntry } from "./emoji-data.js";

const EN: Record<string, string> = {
	insertEmoji: "Insert emoji",
	searchEmoji: "Search emoji",
};
registerDefaults("dj", EN);

const COLS = 8;

const EMOJI_CSS = `
dj-rich-text .dj-rt-emoji-panel { padding: var(--dj-spacing-small, 0.5rem); display: flex; flex-direction: column; gap: var(--dj-spacing-small, 0.5rem); }
dj-rich-text .dj-rt-emoji-grid { display: grid; grid-template-columns: repeat(${COLS}, 2rem); gap: 2px; max-height: 12rem; overflow-y: auto; }
dj-rich-text .dj-rt-emoji-grid button { background: transparent; border: 0; font-size: 1.25rem; line-height: 1; height: 2rem; padding: 0; border-radius: 4px; cursor: pointer; }
dj-rich-text .dj-rt-emoji-grid button:hover { background: var(--dj-color-background-alt, #f3f4f6); }
dj-rich-text .dj-rt-emoji-grid button:focus-visible { outline: 2px solid var(--dj-color-primary, #2563eb); outline-offset: -2px; }
dj-rich-text .dj-rt-emoji-empty { color: var(--dj-color-text-muted, #6b7280); font-size: 0.875rem; padding: 0.25rem; }
`;

/** Case-insensitive substring match over name, shortcode, and keywords (exported for testing). */
export function filterEmoji(set: EmojiEntry[], query: string): EmojiEntry[] {
	const q = query.trim().toLowerCase();
	if (!q) return set;
	return set.filter(
		(e) =>
			e.name.toLowerCase().includes(q) ||
			e.shortcode.toLowerCase().includes(q) ||
			(e.keywords ?? []).some((k) => k.toLowerCase().includes(q)),
	);
}

/** Options for {@link createEmojiPlugin}. */
export interface EmojiPluginOptions {
	/** Register the `:shortcode:` text transform (default true). */
	shortcodes?: boolean;
	/** Emoji set to offer (default {@link EMOJI}). */
	set?: EmojiEntry[];
}

/**
 * Emoji plugin for `<dj-rich-text>` (not a custom element; contributes NO nodes — emoji are plain
 * text). Adds a toolbar button that opens a searchable 8-column picker; clicking an emoji inserts it
 * at the caret and keeps the popup open (multi-insert), and the popup closes on Escape/outside click.
 * With `shortcodes` (default), typing `:name:` for a known shortcode replaces it with the character.
 *
 * The native OS emoji picker already works in the editor; this adds a discoverable, cross-platform
 * path. Related pattern: to highlight hashtags/other tokens, build a node on the public plugin API the
 * way `@dojo-ng/rich-text-mentions` builds `MentionNode` (hashtags are intentionally not shipped).
 */
export function createEmojiPlugin(options: EmojiPluginOptions = {}): RichTextPlugin {
	const set = options.set ?? EMOJI;
	const useShortcodes = options.shortcodes !== false;
	const shortcodeMap = new Map(set.map((e) => [e.shortcode, e.ch]));

	const popupRef = createRef<HTMLElement & { open: boolean; anchor?: HTMLElement }>();
	const triggerRef = createRef<HTMLElement>();
	const rootRef = createRef<HTMLElement>();

	// Imperative picker state, built once into the stable root div (survives toolbar re-renders).
	let built = false;
	let gridEl: HTMLElement | null = null;
	let buttons: HTMLButtonElement[] = [];
	let rovingIndex = 0;

	const msg = (ctx: RichTextContext, key: string): string => {
		const locale = ctx.host.getAttribute("lang") || getDefaultLocale();
		return messages.resolve("dj", locale, key) ?? EN[key] ?? key;
	};

	return defineRichTextPlugin({
		name: "emoji",
		setup: (ctx) => {
			ensureEditorStyles("dj-rich-text-emoji", EMOJI_CSS);
			if (!useShortcodes) return;
			return ctx.editor.registerNodeTransform(TextNode, (node) => {
				if (!node.isSimpleText()) return;
				const text = node.getTextContent();
				const m = /:([a-z0-9_+-]+):/.exec(text);
				if (!m) return;
				const ch = shortcodeMap.get(m[1]);
				if (!ch) return; // unknown shortcode: leave it literal
				// Replace exactly the ":name:" range; the replacement has no colons, so this terminates.
				node.spliceText(m.index, m[0].length, ch);
			});
		},
		toolbar: [
			{
				id: "emoji",
				group: "emoji",
				order: 0,
				label: "Insert emoji",
				render: (ctx) => {
					const insertEmoji = msg(ctx, "insertEmoji");

					const insert = (ch: string) => {
						ctx.editor.update(() => {
							const sel = $getSelection();
							if ($isRangeSelection(sel)) sel.insertText(ch);
							else $getRoot().selectEnd().insertText(ch);
						});
					};

					const setRoving = (i: number) => {
						if (!buttons.length) return;
						rovingIndex = Math.max(0, Math.min(i, buttons.length - 1));
						buttons.forEach((b, idx) => b.setAttribute("tabindex", idx === rovingIndex ? "0" : "-1"));
						buttons[rovingIndex].focus();
					};

					const renderGrid = (entries: EmojiEntry[]) => {
						if (!gridEl) return;
						gridEl.replaceChildren();
						buttons = entries.map((e) => {
							const b = document.createElement("button");
							b.type = "button";
							b.textContent = e.ch;
							b.setAttribute("aria-label", e.name);
							b.setAttribute("tabindex", "-1");
							b.addEventListener("click", () => insert(e.ch));
							gridEl!.appendChild(b);
							return b;
						});
						rovingIndex = 0;
						if (buttons.length) buttons[0].setAttribute("tabindex", "0");
					};

					const buildPicker = () => {
						if (built || !rootRef.value) return;
						built = true;
						const panel = document.createElement("div");
						panel.className = "dj-rt-emoji-panel";
						const filter = document.createElement("dj-text-input") as HTMLElement & { value: string };
						filter.setAttribute("label", msg(ctx, "searchEmoji"));
						filter.addEventListener("input", () => renderGrid(filterEmoji(set, filter.value ?? "")));
						const grid = document.createElement("div");
						grid.className = "dj-rt-emoji-grid";
						grid.setAttribute("role", "grid");
						grid.setAttribute("aria-label", insertEmoji);
						grid.addEventListener("keydown", (e) => {
							const k = e.key;
							let next = rovingIndex;
							if (k === "ArrowRight") next = rovingIndex + 1;
							else if (k === "ArrowLeft") next = rovingIndex - 1;
							else if (k === "ArrowDown") next = rovingIndex + COLS;
							else if (k === "ArrowUp") next = rovingIndex - COLS;
							else if (k === "Home") next = 0;
							else if (k === "End") next = buttons.length - 1;
							else return; // Enter/Space activate the focused button natively
							e.preventDefault();
							if (next >= 0 && next < buttons.length) setRoving(next);
						});
						gridEl = grid;
						panel.appendChild(filter);
						panel.appendChild(grid);
						rootRef.value.appendChild(panel);
						renderGrid(set);
					};

					const openPopup = () => {
						const p = popupRef.value;
						if (!p) return;
						p.anchor = triggerRef.value ?? undefined;
						buildPicker();
						renderGrid(set); // reset filter results each open
						p.open = true;
					};

					return html`
						<span class="dj-rt-emoji-tool">
							<dj-button ${ref(triggerRef)} kind="text" label=${insertEmoji} title=${insertEmoji} @click=${openPopup}>
								<span slot="icon" aria-hidden="true">🙂</span>
							</dj-button>
							<dj-popup ${ref(popupRef)} position="below" .scrollLock=${false} @dj-close=${() => ctx.host.focus()}>
								<div ${ref(rootRef)}></div>
							</dj-popup>
						</span>
					`;
				},
			},
		],
	});
}

/** The emoji plugin with shortcodes on and the default set. */
export const emojiPlugin = createEmojiPlugin();

export default emojiPlugin;
