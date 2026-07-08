import {
	defineRichTextPlugin,
	type RichTextContext,
	type RichTextInsertItem,
	type RichTextPlugin,
} from "@dojo-ng/rich-text";
import { createEditorMenu } from "@dojo-ng/rich-text-menu";

/**
 * Slash-command plugin for `<dj-rich-text>` (not a custom element). Typing `/` at the start of a
 * block or after whitespace opens a caret-anchored menu (the shared `@dojo-ng/rich-text-menu`) whose
 * items are every loaded plugin's `inserts` plus any `extra` items. Picking one removes the "/query"
 * text and runs the item's `run(ctx)` — convert the block to a heading, insert a table, open the
 * image dialog, and so on. The menu shows nothing (never opens) when no plugin contributes an insert.
 *
 * Because the item list is aggregated from `ctx.plugins`, the menu automatically reflects whatever
 * subset of node-contributing plugins is loaded: no headings plugin means no heading commands.
 */

/** Options for {@link createSlashPlugin}. */
export interface SlashPluginOptions {
	/** Extra items appended after every plugin's contributed `inserts`. */
	extra?: RichTextInsertItem[];
}

/** Default slash trigger: `/` at start-of-text or after whitespace, then up to 20 query chars. */
export const DEFAULT_SLASH_TRIGGER = /(^|\s)\/([\w-]{0,20})$/;

/** Resolve a plugin's `inserts` (static array or factory) to a concrete list. */
function resolveInserts(plugin: RichTextPlugin, ctx: RichTextContext): RichTextInsertItem[] {
	const ins = plugin.inserts;
	if (!ins) return [];
	return typeof ins === "function" ? ins(ctx) : ins;
}

/** Aggregate every loaded plugin's `inserts` plus `extra`, in plugin order (exported for testing). */
export function aggregateInserts(ctx: RichTextContext, extra: RichTextInsertItem[] = []): RichTextInsertItem[] {
	const items: RichTextInsertItem[] = [];
	for (const p of ctx.plugins) items.push(...resolveInserts(p, ctx));
	items.push(...extra);
	return items;
}

/** Case-insensitive substring filter over label + keywords (exported for testing). */
export function filterInserts(items: RichTextInsertItem[], query: string): RichTextInsertItem[] {
	const q = query.trim().toLowerCase();
	if (!q) return items;
	return items.filter(
		(it) =>
			it.label.toLowerCase().includes(q) ||
			(it.keywords ?? []).some((k) => k.toLowerCase().includes(q)),
	);
}

/** Build a slash-command plugin. Pass `extra` to append custom items after the aggregated ones. */
export function createSlashPlugin(options: SlashPluginOptions = {}): RichTextPlugin {
	const extra = options.extra ?? [];

	return defineRichTextPlugin({
		name: "slash",
		setup: (ctx) => {
			// The current query's candidate items, kept so onPick can resolve the chosen id to its run().
			let items: RichTextInsertItem[] = [];

			const menu = createEditorMenu(ctx, {
				match: (text) => {
					const m = DEFAULT_SLASH_TRIGGER.exec(text);
					return m ? { start: m.index + m[1].length, query: m[2] ?? "" } : null;
				},
				onQueryChange: (query) => {
					// Aggregate once per keystroke (cheap) so conditional contributions stay correct, then
					// filter. An empty result leaves the popup hidden (the menu hides on empty + not loading).
					items = aggregateInserts(ctx, extra);
					const filtered = filterInserts(items, query);
					menu.setOptions(filtered.map((it) => ({ value: it.id, label: it.label })), false);
				},
				// Run INSIDE the trigger-removal update: a block transform ($setBlocksType, list/table
				// commands) operates on the caret's block, and a separate post-removal update loses the
				// collapsed selection (the emptied "/query" text node is reconciled away), so the action
				// would not apply — the same failure the mentions insert hit. The contributions tolerate a
				// nested update / command dispatch here; a dialog-opening run (image) just flips a DOM flag.
				pickInUpdate: true,
				onPick: (option) => {
					const item = items.find((it) => it.id === option.value);
					if (item) item.run(ctx);
				},
			});

			return () => menu.dispose();
		},
	});
}

/** The slash plugin with no extra items. */
export const slashPlugin = createSlashPlugin();

export default slashPlugin;
