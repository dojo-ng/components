/**
 * The five CriticMarkup text-match transformers (Track N2). Order is substitution, deletion,
 * insertion, highlight, comment — decision 7: `@lexical/markdown`'s import loop tries transformers
 * in LIST order against the full remaining text and takes the first whose regex matches ANYWHERE in
 * it, not the one that would have matched earliest. Highlight before comment is load-bearing: an
 * anchored `{==t==}{>>n<<}` must let the highlight's own regex (which carries the optional trailing
 * comment group) claim the comment text before a bare-comment transformer listed earlier could steal
 * it from a highlight elsewhere on the same line.
 *
 * No `trigger` on any of these: CriticMarkup marks are authored through toolbar actions and
 * suggestion mode (Track S/T), not typed markdown shortcuts, and a stray `}` should never silently
 * spawn a mark.
 *
 * These regexes assume the text hitting them has already been through decision 16's pipeline
 * (`tokenizeBlockSpanning` then `maskNested`, Track N3) — a mark never spans a block by the time a
 * transformer sees it, and a nested mark's own delimiters are sentinels, not the literal characters
 * these patterns look for.
 */

import { $createTextNode, $isTextNode, type TextNode } from "lexical";
import type { Transformer } from "@lexical/markdown";
import { escapeToken, unescapeToken, PARAGRAPH_TOKEN } from "./grammar.js";
import {
	$createBreakNode,
	$isBreakNode,
	$createCommentNode,
	$isCommentNode,
	$createDeletionNode,
	$isDeletionNode,
	DeletionNode,
	$createHighlightNode,
	$isHighlightNode,
	HighlightNode,
	$createInsertionNode,
	$isInsertionNode,
	InsertionNode,
	CommentNode,
} from "./nodes.js";

type ExportFormat = (textNode: TextNode, textContent: string) => string;

/**
 * Split raw mark content around paragraph-token breaks (decision 16) into `TextNode`/`BreakNode`
 * children, appended to `parent` in order. Every text piece inherits `format`, so a mark sitting
 * inside bold text stays bold. A doubled (escaped) token is left in the buffer for `unescapeToken`
 * to fold into one literal character; a lone token flushes the buffer and inserts a break.
 */
function appendTokenSegments(parent: InsertionNode | DeletionNode | HighlightNode, content: string, format: number): void {
	let buffer = "";
	let i = 0;
	const flush = () => {
		if (buffer === "") return;
		const t = $createTextNode(unescapeToken(buffer));
		t.setFormat(format);
		parent.append(t);
		buffer = "";
	};
	while (i < content.length) {
		if (content.startsWith(PARAGRAPH_TOKEN, i)) {
			if (content.startsWith(PARAGRAPH_TOKEN, i + PARAGRAPH_TOKEN.length)) {
				buffer += PARAGRAPH_TOKEN + PARAGRAPH_TOKEN; // escaped pair — unescaped whole on flush
				i += PARAGRAPH_TOKEN.length * 2;
			} else {
				flush();
				parent.append($createBreakNode());
				i += PARAGRAPH_TOKEN.length;
			}
		} else {
			buffer += content[i];
			i += 1;
		}
	}
	flush();
}

/**
 * The inverse of `appendTokenSegments`, for export: walk `node`'s children, passing each text
 * piece through `exportFormat` (so `**`/`*` wrapping from active formats is preserved) with its
 * literal content escaped first, and passing a `BreakNode`'s token straight through unescaped. The
 * escaping must happen on each piece BEFORE formatting wraps it and must never touch a break's own
 * token — collapsing to a single `getTextContent()` + `escapeToken()` pass would double-escape (or
 * silently drop) whichever of the two survives the ambiguity.
 */
function exportMarkContent(node: InsertionNode | DeletionNode | HighlightNode, exportFormat: ExportFormat): string {
	let out = "";
	for (const child of node.getChildren()) {
		if ($isBreakNode(child)) out += child.getTextContent();
		else if ($isTextNode(child)) out += exportFormat(child, escapeToken(child.getTextContent()));
		else out += child.getTextContent();
	}
	return out;
}

// --- substitution -------------------------------------------------------------------------------

export const SUBSTITUTION_TRANSFORMER: Transformer = {
	dependencies: [DeletionNode, InsertionNode],
	importRegExp: /\{~~(.*?)~>(.*?)~~\}/,
	regExp: /\{~~(.*?)~>(.*?)~~\}$/,
	replace: (textNode, match) => {
		const [, oldRaw, newRaw] = match;
		const format = textNode.getFormat();
		const deletionNode = $createDeletionNode();
		appendTokenSegments(deletionNode, oldRaw, format);
		const insertionNode = $createInsertionNode();
		appendTokenSegments(insertionNode, newRaw, format);
		textNode.replace(deletionNode);
		deletionNode.insertAfter(insertionNode);
	},
	type: "text-match",
};

// --- deletion -------------------------------------------------------------------------------------

export const DELETION_TRANSFORMER: Transformer = {
	dependencies: [DeletionNode],
	importRegExp: /\{--(.*?)--\}/,
	regExp: /\{--(.*?)--\}$/,
	replace: (textNode, match) => {
		const [, raw] = match;
		const node = $createDeletionNode();
		appendTokenSegments(node, raw, textNode.getFormat());
		textNode.replace(node);
	},
	export: (node, _exportChildren, exportFormat) => {
		if (!$isDeletionNode(node)) return null;
		// Decision 4, half one: when an insertion immediately follows, this is a substitution pair —
		// emit nothing here and let the insertion below emit the combined `{~~old~>new~~}`. Either
		// half emitting alone would produce the pair twice or not at all.
		if ($isInsertionNode(node.getNextSibling())) return "";
		return `{--${exportMarkContent(node, exportFormat)}--}`;
	},
	type: "text-match",
};

// --- insertion ------------------------------------------------------------------------------------

export const INSERTION_TRANSFORMER: Transformer = {
	dependencies: [InsertionNode],
	importRegExp: /\{\+\+(.*?)\+\+\}/,
	regExp: /\{\+\+(.*?)\+\+\}$/,
	replace: (textNode, match) => {
		const [, raw] = match;
		const node = $createInsertionNode();
		appendTokenSegments(node, raw, textNode.getFormat());
		textNode.replace(node);
	},
	export: (node, _exportChildren, exportFormat) => {
		if (!$isInsertionNode(node)) return null;
		const prev = node.getPreviousSibling();
		if ($isDeletionNode(prev)) {
			// Decision 4, half two: the deletion just before emitted "", so the combined pair is
			// emitted here instead of a lone insertion.
			return `{~~${exportMarkContent(prev, exportFormat)}~>${exportMarkContent(node, exportFormat)}~~}`;
		}
		return `{++${exportMarkContent(node, exportFormat)}++}`;
	},
	type: "text-match",
};

// --- highlight (with an optional anchored comment) -------------------------------------------------

export const HIGHLIGHT_TRANSFORMER: Transformer = {
	dependencies: [HighlightNode],
	importRegExp: /\{==(.*?)==\}(?:\{>>(.*?)<<\})?/,
	regExp: /\{==(.*?)==\}(?:\{>>(.*?)<<\})?$/,
	replace: (textNode, match) => {
		const [, raw, commentRaw] = match;
		const node = $createHighlightNode();
		appendTokenSegments(node, raw, textNode.getFormat());
		if (commentRaw !== undefined) node.setComment(unescapeToken(commentRaw));
		textNode.replace(node);
	},
	export: (node, _exportChildren, exportFormat) => {
		if (!$isHighlightNode(node)) return null;
		const comment = node.getComment();
		const commentPart = comment !== null ? `{>>${escapeToken(comment)}<<}` : "";
		return `{==${exportMarkContent(node, exportFormat)}==}${commentPart}`;
	},
	type: "text-match",
};

// --- comment (bare only — an anchored one is consumed above, by the highlight transformer) --------

export const COMMENT_TRANSFORMER: Transformer = {
	dependencies: [CommentNode],
	importRegExp: /\{>>(.*?)<<\}/,
	regExp: /\{>>(.*?)<<\}$/,
	replace: (textNode, match) => {
		const [, raw] = match;
		textNode.replace($createCommentNode(unescapeToken(raw)));
	},
	export: (node) => {
		if (!$isCommentNode(node)) return null;
		return `{>>${escapeToken(node.getText())}<<}`;
	},
	type: "text-match",
};

/** The five transformers in decision 7's required order. */
export const criticMarkupTransformers: Transformer[] = [
	SUBSTITUTION_TRANSFORMER,
	DELETION_TRANSFORMER,
	INSERTION_TRANSFORMER,
	HIGHLIGHT_TRANSFORMER,
	COMMENT_TRANSFORMER,
];
