import type { LexicalEditor } from "lexical";
import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
	registerMarkdownShortcuts,
	TRANSFORMERS,
	type Transformer,
} from "@lexical/markdown";
import { defineRichTextPlugin, type RichTextPlugin } from "@dojo-ng/rich-text";

/**
 * Markdown plugin for `<dj-rich-text>`. Contributes NO nodes and NO toolbar; it adds a `markdown`
 * output format (so `format="markdown"` makes the `value` getter emit Markdown and the setter parse
 * it) and, by default, registers the type-a-shortcut behaviour (`# `, `- `, `**bold**`, …).
 *
 * Markdown coverage tracks the node-contributing plugins that are loaded. Each transformer declares
 * the node classes it needs (element and text-match transformers carry `dependencies`; text-format
 * transformers carry none), and `usableTransformers` drops any whose nodes are not registered on the
 * editor. So `# ` becomes a heading only with the headings plugin loaded, `- ` becomes a list only
 * with the lists plugin, and `[text](url)` becomes a link only with the links plugin; without them
 * the source stays literal text. Pair this plugin with headings, lists, and links for full coverage.
 *
 * The component wraps `serialize` in a read scope and `deserialize` in an update scope, so the `$`
 * helpers are called directly here.
 *
 * Requires `@lexical/markdown` (a dependency of this package).
 */

export interface MarkdownPluginOptions {
	/** Register type-a-shortcut behaviour on the editor. Default `true`. */
	shortcuts?: boolean;
	/** Transformer set to use. Default the `@lexical/markdown` `TRANSFORMERS`. */
	transformers?: Transformer[];
}

/**
 * The transformers usable on `editor`: those whose node dependencies are all registered. Element and
 * text-match transformers declare `dependencies`; text-format transformers declare none and always
 * pass (`editor.hasNodes([])` is true). Pure aside from reading the editor's registered node set.
 */
export function usableTransformers(editor: LexicalEditor, transformers: Transformer[]): Transformer[] {
	return transformers.filter((t) => editor.hasNodes("dependencies" in t ? t.dependencies : []));
}

/** Build a Markdown plugin. Override `shortcuts` (default on) or the `transformers` set. */
export function createMarkdownPlugin(options: MarkdownPluginOptions = {}): RichTextPlugin {
	const shortcuts = options.shortcuts ?? true;
	const transformers = options.transformers ?? TRANSFORMERS;
	return defineRichTextPlugin({
		name: "markdown",
		formats: {
			markdown: {
				serialize: (editor) => $convertToMarkdownString(usableTransformers(editor, transformers)),
				deserialize: (editor, data) =>
					$convertFromMarkdownString(data, usableTransformers(editor, transformers)),
			},
		},
		setup: (ctx) => {
			if (!shortcuts) return;
			return registerMarkdownShortcuts(ctx.editor, usableTransformers(ctx.editor, transformers));
		},
	});
}

/** The Markdown plugin with shortcuts on and the default transformer set. */
export const markdownPlugin = createMarkdownPlugin();

export default markdownPlugin;
