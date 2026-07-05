import { html } from "lit";
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_LOW, type LexicalNode } from "lexical";
import { LinkNode, $isLinkNode, $toggleLink, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { defineRichTextPlugin, type RichTextContext, type RichTextPlugin } from "@dojo-ng/rich-text";

/**
 * Links plugin for `<dj-rich-text>`. Contributes the `LinkNode` class, wires the
 * `TOGGLE_LINK_COMMAND` (vanilla Lexical has no `registerLink` equivalent, so we register the
 * handler ourselves), and adds one toolbar button that inserts, edits, or removes a link on the
 * current selection.
 *
 * The button reflects whether the selection sits in a link (`aria-pressed`). Clicking it asks for
 * a URL — prefilled with the current link's URL when editing — then: a cleared/empty value removes
 * the link, a new value sets or updates it, and cancelling changes nothing. The URL prompt is
 * pluggable: `createLinksPlugin({ promptForUrl })` lets an app swap the default `window.prompt` for
 * an overlay-based editor (it may be async). Auto-linking on paste/typing is a later addition.
 */

export interface LinksPluginOptions {
	/**
	 * Ask the user for a URL. `currentUrl` is the existing link's URL when editing, else "".
	 * Return the URL to set, "" to remove the link, or `null`/`undefined` to cancel. May be async.
	 * Defaults to `window.prompt`.
	 */
	promptForUrl?(currentUrl: string): string | null | undefined | Promise<string | null | undefined>;
}

const LINK_ICON = html`<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M3.9 12a3.1 3.1 0 0 1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7A3.1 3.1 0 0 1 3.9 12zM8 13h8v-2H8v2zm9-6h-4v1.9h4a3.1 3.1 0 0 1 0 6.2h-4V17h4a5 5 0 0 0 0-10z"/></svg>`;

function defaultPrompt(currentUrl: string): string | null {
	if (typeof window !== "undefined" && typeof window.prompt === "function") {
		return window.prompt("Link URL:", currentUrl || "https://");
	}
	return null;
}

/** The `LinkNode` containing the selection anchor, walking up from it, or null. */
function currentLink(ctx: RichTextContext): LinkNode | null {
	let link: LinkNode | null = null;
	ctx.editor.getEditorState().read(() => {
		const sel = $getSelection();
		if (!$isRangeSelection(sel)) return;
		let node: LexicalNode | null = sel.anchor.getNode();
		while (node) {
			if ($isLinkNode(node)) {
				link = node;
				return;
			}
			node = node.getParent();
		}
	});
	return link;
}

/** Build a links plugin. Pass `promptForUrl` to replace the default `window.prompt` (e.g. an overlay). */
export function createLinksPlugin(options: LinksPluginOptions = {}): RichTextPlugin {
	const promptForUrl = options.promptForUrl ?? defaultPrompt;
	return defineRichTextPlugin({
		name: "links",
		nodes: [LinkNode],
		// Vanilla Lexical ships no list-style `registerLink`; wire the command to $toggleLink.
		// Command listeners run inside an editor update, so $toggleLink can be called directly.
		setup: (ctx) =>
			ctx.editor.registerCommand(
				TOGGLE_LINK_COMMAND,
				(payload) => {
					if (payload === null || typeof payload === "string") {
						$toggleLink(payload);
					} else {
						const { url, ...rest } = payload;
						$toggleLink(url, rest);
					}
					return true;
				},
				COMMAND_PRIORITY_LOW,
			),
		toolbar: [
			{
				id: "link",
				group: "link",
				order: 0,
				label: "Link",
				icon: LINK_ICON,
				isActive: (ctx) => currentLink(ctx) !== null,
				run: (ctx) => {
					const existing = currentLink(ctx);
					const current = existing ? existing.getURL() : "";
					Promise.resolve(promptForUrl(current)).then((url) => {
						if (url == null) return; // cancelled → no change
						const v = url.trim();
						ctx.command(TOGGLE_LINK_COMMAND, v === "" ? null : v); // "" → remove, else set/update
					});
				},
			},
		],
	});
}

/** The links plugin with the default `window.prompt` URL editor. */
export const linksPlugin = createLinksPlugin();

export default linksPlugin;
