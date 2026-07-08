import { $createTextNode, TextNode } from "lexical";
import {
	AutoLinkNode,
	LinkNode,
	$createAutoLinkNode,
	$isAutoLinkNode,
	$isLinkNode,
} from "@lexical/link";
import { defineRichTextPlugin, type RichTextPlugin } from "@dojo-ng/rich-text";
import { defaultMatchers, type AutoLinkMatcher } from "./matchers.js";

/**
 * Auto-link plugin for `<dj-rich-text>` (not a custom element, no toolbar, no CSS). A `TextNode`
 * transform detects URLs and emails as you type and wraps them in `AutoLinkNode`s; editing the text
 * so it no longer matches unwraps the link, and editing it to a different URL updates the href.
 *
 * It contributes `AutoLinkNode` AND `LinkNode` so the exported `<a>` re-imports on the `value` path
 * even without the links plugin (the core de-duplicates node classes, so loading both is harmless).
 * Manual links (`LinkNode`) are never touched. Out of scope (v1): URLs split across formatting
 * boundaries, click-to-open in the editor, un-autolinking via a toolbar.
 */

const TRAILING = ".,;:!?\"')]}";

/** Drop trailing sentence punctuation so "see https://a.example." keeps the dot outside the link. */
function stripTrailing(s: string): string {
	let end = s.length;
	while (end > 0 && TRAILING.includes(s[end - 1])) end--;
	return s.slice(0, end);
}

interface Found {
	start: number;
	length: number;
	matcher: AutoLinkMatcher;
}

/** The earliest match across all matchers (ties broken by matcher order). */
function findEarliest(text: string, matchers: AutoLinkMatcher[]): Found | null {
	let best: Found | null = null;
	for (const matcher of matchers) {
		const m = matcher.regex.exec(text);
		if (m && (best === null || m.index < best.start)) {
			best = { start: m.index, length: m[0].length, matcher };
		}
	}
	return best;
}

/** If `text` matches a matcher over its WHOLE length, return the href; else null (for the INSIDE branch). */
function fullMatchUrl(text: string, matchers: AutoLinkMatcher[]): string | null {
	for (const matcher of matchers) {
		const m = matcher.regex.exec(text);
		if (m && m.index === 0 && m[0].length === text.length) return matcher.url(text);
	}
	return null;
}

/** Options for {@link createAutoLinkPlugin}. */
export interface AutoLinkPluginOptions {
	/** Matchers tried in order (default {@link defaultMatchers}). */
	matchers?: AutoLinkMatcher[];
}

/** Build an auto-link plugin. Pass `matchers` to change what gets linked. */
export function createAutoLinkPlugin(options: AutoLinkPluginOptions = {}): RichTextPlugin {
	const matchers = options.matchers ?? defaultMatchers;

	return defineRichTextPlugin({
		name: "autolink",
		nodes: [AutoLinkNode, LinkNode],
		setup: (ctx) =>
			ctx.editor.registerNodeTransform(TextNode, (node) => {
				if (!node.isSimpleText()) return;
				const parent = node.getParent();
				if ($isAutoLinkNode(parent)) {
					handleInside(parent, matchers);
					return;
				}
				if ($isLinkNode(parent)) return; // manual links are never touched

				const text = node.getTextContent();
				const found = findEarliest(text, matchers);
				if (!found) return;

				const { start } = found;
				const rawEnd = start + found.length;
				// Leading boundary: whitespace or start-of-text before (rejects "xwww.foo", "xhttps://a").
				const before = start === 0 ? "" : text[start - 1];
				if (before !== "" && !/\s/.test(before)) return;
				// Trailing boundary: require WHITESPACE after the match — NOT end-of-text. Linking at
				// end-of-text fires mid-typing on a valid-but-partial match (e.g. "bill@bitranch.c" before
				// you finish ".com"), stranding the rest of the word outside the link. Waiting for a
				// separator means the link is created only once you type a space/newline after it.
				const after = rawEnd >= text.length ? "" : text[rawEnd];
				if (!/\s/.test(after)) return;

				const matched = stripTrailing(text.slice(start, rawEnd));
				if (!matched) return;
				const url = found.matcher.url(matched);

				// Split out [start, start+matched.length) and replace that piece with the link.
				const pieces = node.splitText(start, start + matched.length);
				const target = pieces[start === 0 ? 0 : 1];
				const linkText = $createTextNode(matched);
				linkText.setFormat(target.getFormat());
				const link = $createAutoLinkNode(url);
				link.append(linkText);
				target.replace(link);
			}),
	});
}

/**
 * Text node inside an existing AutoLinkNode changed: keep/update the URL if the link's full text still
 * matches (after the trailing strip), else unwrap. Mutating only on a real change is what keeps the
 * transform from looping.
 */
function handleInside(link: AutoLinkNode, matchers: AutoLinkMatcher[]): void {
	const stripped = stripTrailing(link.getTextContent());
	const url = fullMatchUrl(stripped, matchers);
	if (url) {
		if (link.getURL() !== url) link.setURL(url);
	} else {
		for (const child of link.getChildren()) link.insertBefore(child);
		link.remove();
	}
}

/** The auto-link plugin with the default matchers. */
export const autolinkPlugin = createAutoLinkPlugin();

export default autolinkPlugin;
