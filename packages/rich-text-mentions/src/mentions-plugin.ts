import { $createTextNode, $insertNodes } from "lexical";
import { defineRichTextPlugin, ensureEditorStyles, type RichTextPlugin } from "@dojo-ng/rich-text";
import { createEditorMenu } from "@dojo-ng/rich-text-menu";
import { MentionNode, $createMentionNode } from "./mention-node.js";

/**
 * Mentions plugin for `<dj-rich-text>`. Typing the trigger (default `@`) opens a caret-anchored menu
 * (the shared `@dojo-ng/rich-text-menu`); a pick inserts an atomic `MentionNode` (`@label`) plus a
 * trailing space. The `source` is app-owned and REQUIRED — there is no default `mentionsPlugin` export.
 *
 * Paste: `span` is allowlisted by the sanitizer but its attributes are stripped, so a pasted mention
 * degrades to plain `@label` text. Mentions survive the `value` round-trip (the node's own importDOM).
 */

export interface MentionsPluginOptions {
	/** Resolve a query to candidate mentions. Called (debounced) as the user types after the trigger. */
	source: (query: string) => Promise<Array<{ id: string; label: string }>>;
	/**
	 * Trigger regex, anchored at end-of-text. Group 1 is the leading boundary (start-of-text or
	 * whitespace), group 2 is the query. Default: `/(^|\s)@([\w.-]{0,30})$/`.
	 */
	trigger?: RegExp;
}

/** Default mention trigger: `@` at start-of-text or after whitespace, then up to 30 query chars. */
export const DEFAULT_MENTION_TRIGGER = /(^|\s)@([\w.-]{0,30})$/;
const DEBOUNCE_MS = 150;

const MENTION_CSS = `
dj-rich-text .dj-rt-mention {
	background: var(--dj-color-primary-100, #dbeafe);
	border-radius: 3px;
	padding: 0 0.15em;
}
`;

/** Build a mentions plugin. `source` is required; pass `trigger` to change the trigger character/pattern. */
export function createMentionsPlugin(options: MentionsPluginOptions): RichTextPlugin {
	const trigger = options.trigger ?? DEFAULT_MENTION_TRIGGER;

	return defineRichTextPlugin({
		name: "mentions",
		nodes: [MentionNode],
		setup: (ctx) => {
			ensureEditorStyles("dj-rich-text-mention", MENTION_CSS);
			let seq = 0;
			let timer: ReturnType<typeof setTimeout> | undefined;

			const menu = createEditorMenu(ctx, {
				match: (text) => {
					const m = trigger.exec(text);
					return m ? { start: m.index + m[1].length, query: m[2] ?? "" } : null;
				},
				onQueryChange: (query) => {
					if (timer) clearTimeout(timer);
					const mine = ++seq;
					menu.setOptions([], true); // spinner while the (debounced) fetch is pending
					timer = setTimeout(() => {
						Promise.resolve(options.source(query))
							.then((results) => {
								if (mine !== seq) return; // a newer query superseded this one
								menu.setOptions(results.map((r) => ({ value: r.id, label: r.label })), false);
							})
							.catch(() => {
								if (mine === seq) menu.setOptions([], false);
							});
					}, DEBOUNCE_MS);
				},
				// Insert at the caret inside the trigger-removal update so the collapsed selection survives.
				pickInUpdate: true,
				onPick: (option) => {
					ctx.editor.update(() => {
						const mention = $createMentionNode(option.value, option.label ?? option.value);
						const space = $createTextNode(" ");
						$insertNodes([mention, space]);
						space.selectEnd();
					});
				},
			});

			return () => {
				if (timer) clearTimeout(timer);
				menu.dispose();
			};
		},
	});
}
