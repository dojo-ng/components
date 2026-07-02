import { html } from "lit";
import {
	FORMAT_TEXT_COMMAND, UNDO_COMMAND, REDO_COMMAND, type TextFormatType,
} from "lexical";
import { registerHistory, createEmptyHistoryState } from "@lexical/history";
import { defineRichTextPlugin, type RichTextPlugin } from "./plugin.js";

/**
 * Default plugin set for `<dj-rich-text>`: the bold/italic/underline formatting controls and the
 * undo/redo history. These ship as plugins (not hard-coded into the component) so the basics flow
 * through the same API third-party plugins use, and so a consumer can replace or omit them by
 * passing their own `plugins` array. Foundational rich-text behavior (`registerRichText`, the
 * value-sync listener, root-element setup) stays in the component as core, not as a plugin.
 */

const glyph = (text: string, style: string) =>
	html`<span style=${style}>${text}</span>`;

/** Bold / italic / underline. Commands are handled by the component's core `registerRichText`; this
 *  plugin only contributes toolbar controls and reflects active state. */
export const formattingPlugin: RichTextPlugin = defineRichTextPlugin({
	name: "formatting",
	toolbar: [
		{
			id: "bold", group: "format", order: 1, label: "Bold",
			icon: glyph("B", "font-weight:700"),
			isActive: (ctx) => ctx.activeFormats().has("bold"),
			run: (ctx) => ctx.command(FORMAT_TEXT_COMMAND, "bold" as TextFormatType),
		},
		{
			id: "italic", group: "format", order: 2, label: "Italic",
			icon: glyph("I", "font-style:italic"),
			isActive: (ctx) => ctx.activeFormats().has("italic"),
			run: (ctx) => ctx.command(FORMAT_TEXT_COMMAND, "italic" as TextFormatType),
		},
		{
			id: "underline", group: "format", order: 3, label: "Underline",
			icon: glyph("U", "text-decoration:underline"),
			isActive: (ctx) => ctx.activeFormats().has("underline"),
			run: (ctx) => ctx.command(FORMAT_TEXT_COMMAND, "underline" as TextFormatType),
		},
	],
});

/** Undo / redo. `setup` installs Lexical's history listener and returns its disposer. */
export const historyPlugin: RichTextPlugin = defineRichTextPlugin({
	name: "history",
	setup: (ctx) => registerHistory(ctx.editor, createEmptyHistoryState(), 1000),
	toolbar: [
		{
			id: "undo", group: "history", order: 1, label: "Undo", icon: "↶",
			run: (ctx) => ctx.command(UNDO_COMMAND, undefined),
		},
		{
			id: "redo", group: "history", order: 2, label: "Redo", icon: "↷",
			run: (ctx) => ctx.command(REDO_COMMAND, undefined),
		},
	],
});

/** The default plugin set applied when the component's `plugins` property is left empty. */
export const defaultPlugins: RichTextPlugin[] = [formattingPlugin, historyPlugin];
