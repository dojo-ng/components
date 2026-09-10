/**
 * The "criticmarkup" format's import/export walk (Track N3). Decision 13: this plugin registers its
 * own `criticmarkup` format so `format="criticmarkup"` works with no markdown plugin loaded at all —
 * these functions match `RichTextFormat`'s `serialize`/`deserialize` shape but stay free of a
 * `@dojo-ng/rich-text` dependency; whichever track assembles the full plugin object wires them into
 * `formats: { criticmarkup: { serialize, deserialize } }`.
 *
 * Both functions are `$`-prefixed-helper callers, not scope-openers: `deserializeCriticMarkup` runs
 * inside an `editor.update`, `serializeCriticMarkup` inside an `editor.getEditorState().read` — the
 * same contract every other `RichTextFormat` in this codebase follows.
 */

import { $getRoot, $isElementNode, $isTextNode, type LexicalEditor, type LexicalNode } from "lexical";
import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { parseMarks, tokenizeBlockSpanning, maskNested, unmaskNested, PARAGRAPH_TOKEN } from "./grammar.js";
import { criticMarkupTransformers } from "./transformers.js";

export interface CriticMarkupRefusedDetail {
	/** "nested": a same- or different-kind nested mark, masked rather than imported as its own node.
	 * "block-spanning": a mark `tokenizeBlockSpanning` left spanning a block — unreachable with the
	 * default paragraph token, since tokenizing eliminates every case that reason describes; kept for
	 * a host that configures `paragraphToken: ""` and gets the pre-decision-16 behavior back. */
	reason: "nested" | "block-spanning";
	/** Offsets into the tokenized text this pipeline actually masked and imported — not the caller's
	 * original `data`, which tokenizing may have shortened. */
	start: number;
	end: number;
}

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-criticmarkup-refused": CustomEvent<CriticMarkupRefusedDetail>;
	}
}

export interface DeserializeCriticMarkupOptions {
	/** The paragraph-break token (decision 16). Default `PARAGRAPH_TOKEN`. */
	paragraphToken?: string;
}

/**
 * Import `data` as CriticMarkup: `tokenizeBlockSpanning`, then `maskNested`, then the markdown
 * conversion through `criticMarkupTransformers`, then an unmask walk over the resulting text nodes.
 * Emits `dj-criticmarkup-refused` on `editor.getRootElement()` for anything the grammar reports as
 * nested or (in the `paragraphToken: ""` case) still block-spanning — computed from the tokenized
 * text BEFORE masking, since masking is what makes those marks invisible to `parseMarks` afterward.
 */
export function deserializeCriticMarkup(
	editor: LexicalEditor,
	data: string,
	options: DeserializeCriticMarkupOptions = {},
): void {
	const token = options.paragraphToken ?? PARAGRAPH_TOKEN;
	const tokenized = tokenizeBlockSpanning(data, token);
	const refusals = refusalsIn(tokenized);
	const { masked } = maskNested(tokenized);
	$convertFromMarkdownString(masked, criticMarkupTransformers);
	unmaskTextNodes($getRoot());
	for (const detail of refusals) dispatchRefused(editor, detail);
}

/** The plain export walk: the markdown conversion through `criticMarkupTransformers`. */
export function serializeCriticMarkup(_editor: LexicalEditor): string {
	return $convertToMarkdownString(criticMarkupTransformers);
}

function refusalsIn(text: string): CriticMarkupRefusedDetail[] {
	const marks = parseMarks(text);
	const refusals: CriticMarkupRefusedDetail[] = [];
	for (const mark of marks) {
		const container = marks.find((p) => p !== mark && p.start <= mark.start && mark.end <= p.end);
		if (container) refusals.push({ reason: "nested", start: mark.start, end: mark.end });
		else if (mark.spansBlock) refusals.push({ reason: "block-spanning", start: mark.start, end: mark.end });
	}
	return refusals;
}

function unmaskTextNodes(node: LexicalNode): void {
	if ($isTextNode(node)) {
		const current = node.getTextContent();
		const unmasked = unmaskNested(current);
		if (unmasked !== current) node.setTextContent(unmasked);
		return;
	}
	if ($isElementNode(node)) {
		for (const child of node.getChildren()) unmaskTextNodes(child);
	}
}

function dispatchRefused(editor: LexicalEditor, detail: CriticMarkupRefusedDetail): void {
	const root = editor.getRootElement();
	root?.dispatchEvent(new CustomEvent("dj-criticmarkup-refused", { detail, bubbles: true, composed: true }));
}
