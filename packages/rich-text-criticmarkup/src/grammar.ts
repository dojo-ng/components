/**
 * CriticMarkup grammar: parsing the five marks, and resolving them.
 *
 * No Lexical import here — this module is a plain string API so a consumer with markdown in hand
 * and no editor (a build step, a server, a CLI) can parse and resolve CriticMarkup too. The editor
 * package (Track N) calls into this rather than keeping its own copy.
 *
 * Not a regex per mark: a lazily-matched regex pairs the FIRST close token it finds, so
 * `{--a {--b--} c--}` mis-pairs with the INNER close and leaves ` c--}` sitting in the prose as
 * literal characters. `parseMarks` is a small stack machine instead: it opens a frame on any of the
 * five open tokens and closes the frame ON TOP OF THE STACK on its matching close token, so a nested
 * mark — same kind or different — always closes before the mark around it does.
 */

export type MarkKind = "insertion" | "deletion" | "substitution" | "comment" | "highlight";

export interface Mark {
	kind: MarkKind;
	/** Offsets into the ORIGINAL string; text.slice(start, end) is the mark as written. */
	start: number;
	end: number;
	/** True when a blank line falls inside the mark's own span. */
	spansBlock: boolean;
	/** True when this mark contains another mark. */
	nested: boolean;
	/** insertion | deletion | comment | highlight */
	text?: string;
	/** substitution only */
	old?: string;
	new?: string;
}

const OPEN: Record<string, MarkKind> = {
	"{++": "insertion",
	"{--": "deletion",
	"{~~": "substitution",
	"{>>": "comment",
	"{==": "highlight",
};

const CLOSE: Record<MarkKind, string> = {
	insertion: "++}",
	deletion: "--}",
	substitution: "~~}",
	comment: "<<}",
	highlight: "==}",
};

// The `old~>new` separator inside a substitution. Its own token because a substitution's close
// token, `~~}`, must not fire until this has been seen — see the frame's `sepPos` below.
const SEP = "~>";

// Every open and close token is exactly 3 characters, which the masking and tokenizing code below
// relies on rather than looking each one up by kind.
const TOKEN_LEN = 3;

// A code fence hides CriticMarkup the same way it hides any other markdown instruction: a novel
// legitimately containing `{--` inside a fenced snippet must not become a tracked change.
const FENCE = /^\s{0,3}(```|~~~)/;

// A blank line — one line that is empty or all whitespace — is a block boundary in CommonMark.
// `@lexical/markdown` splits the document on `\n` before any transformer runs, so a mark whose span
// crosses one can never be seen by a text-match transformer (see decisions 8 and 16).
const BLANK_LINE = /\n[ \t]*\n/;
const BLANK_LINE_G = /\n[ \t]*\n/g;

function fenceMask(text: string): Uint8Array {
	const mask = new Uint8Array(text.length);
	let inFence = false;
	let offset = 0;
	for (const line of splitKeepEnds(text)) {
		const fenceLine = FENCE.test(line);
		const hide = fenceLine || inFence;
		if (fenceLine) inFence = !inFence;
		if (hide) for (let i = offset; i < offset + line.length; i++) mask[i] = 1;
		offset += line.length;
	}
	return mask;
}

function splitKeepEnds(text: string): string[] {
	const lines: string[] = [];
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === "\n") {
			lines.push(text.slice(start, i + 1));
			start = i + 1;
		}
	}
	if (start < text.length) lines.push(text.slice(start));
	return lines;
}

class Frame {
	kind: MarkKind;
	start: number;
	contentStart: number;
	sepPos: number | null = null; // substitution only
	nested = false; // set when a mark closes while this frame is still open beneath it

	constructor(kind: MarkKind, start: number, contentStart: number) {
		this.kind = kind;
		this.start = start;
		this.contentStart = contentStart;
	}
}

/**
 * Every CriticMarkup mark in `text`, in reading order — nested marks included as their own entries,
 * alongside the outer mark that contains them.
 *
 * An unterminated mark — an open token with no matching close anywhere after it — produces no entry
 * at all, and is left as the literal characters it is. The alternative, scanning until some LATER,
 * unrelated mark's close token turns up, would swallow everything in between as one giant mark,
 * which is worse than finding nothing.
 */
export function parseMarks(text: string): Mark[] {
	const fence = fenceMask(text);
	const stack: Frame[] = [];
	const results: Mark[] = [];
	const n = text.length;
	let i = 0;
	while (i < n) {
		if (fence[i]) {
			i++;
			continue;
		}
		const top = stack.length ? stack[stack.length - 1] : null;
		if (top) {
			const close = CLOSE[top.kind];
			const ready = top.kind !== "substitution" || top.sepPos !== null;
			if (ready && text.startsWith(close, i)) {
				results.push(finish(text, top, i, close.length));
				stack.pop();
				if (stack.length) stack[stack.length - 1].nested = true;
				i += close.length;
				continue;
			}
			if (top.kind === "substitution" && top.sepPos === null && text.startsWith(SEP, i)) {
				top.sepPos = i;
				i += SEP.length;
				continue;
			}
		}
		const openToken = Object.keys(OPEN).find((token) => text.startsWith(token, i));
		if (openToken) {
			stack.push(new Frame(OPEN[openToken], i, i + openToken.length));
			i += openToken.length;
			continue;
		}
		i++;
	}
	// Frames still open at EOF are the unterminated case: abandoned, not reported.
	results.sort((a, b) => a.start - b.start);
	return results;
}

function finish(text: string, frame: Frame, closePos: number, closeLen: number): Mark {
	const end = closePos + closeLen;
	const mark: Mark = {
		kind: frame.kind,
		start: frame.start,
		end,
		spansBlock: BLANK_LINE.test(text.slice(frame.start, end)),
		nested: frame.nested,
	};
	if (frame.kind === "substitution") {
		mark.old = text.slice(frame.contentStart, frame.sepPos!);
		mark.new = text.slice(frame.sepPos! + SEP.length, closePos);
	} else {
		mark.text = text.slice(frame.contentStart, closePos);
	}
	return mark;
}

// --- accept, decline, and the bulk forms ------------------------------------------------------

/**
 * Apply `mark`: keep an insertion's (or a substitution's new) text; drop a deletion; keep a
 * highlight's text, its own anchored comment going with it; leave a bare comment untouched.
 */
export function accept(text: string, mark: Mark): string {
	return resolve(text, mark, "new");
}

/**
 * Reject `mark`: restore a deletion's (or a substitution's old) text; drop an insertion; keep a
 * highlight's text (and its own anchored comment, if any); leave a bare comment untouched.
 */
export function decline(text: string, mark: Mark): string {
	return resolve(text, mark, "old");
}

function resolve(text: string, mark: Mark, side: "new" | "old"): string {
	if (mark.kind === "comment") {
		// Only a BARE comment reaches this branch — an anchored one is consumed by its highlight's
		// own resolution below, before it would ever be resolved on its own.
		return text;
	}
	const end = mark.kind === "highlight" ? highlightEnd(text, mark) : mark.end;
	// Decision 18: only an ACCEPT adjusts whitespace at a paragraph-break seam. A decline restores
	// the original text verbatim — `run{++¶++}together` declines back to `runtogether`, not to
	// `run together` — and a highlight is kept unchanged in both directions, so neither touches the
	// seam. `settleSeams` is a no-op on a string with no sentinel in it, which is every other case.
	const adjusts = side === "new" && mark.kind !== "highlight";
	const kept = keptText(mark, side, adjusts ? BREAK_SEAM : PARAGRAPH_BREAK);
	const dropped = adjusts && kept === "" && hasStructuralToken(droppedText(mark, side));
	return settleSeams(text.slice(0, mark.start) + (dropped ? JOIN_SEAM : kept) + text.slice(end));
}

/**
 * `mark`'s own `end`, extended to swallow an immediately adjacent `{>>...<<}` — CriticMarkup's
 * anchored-comment convention. Re-parses the text right after `mark` rather than matching a regex,
 * so a comment containing its own delimiters is still found correctly.
 */
function highlightEnd(text: string, mark: Mark): number {
	if (!text.startsWith("{>>", mark.end)) return mark.end;
	const following = parseMarks(text.slice(mark.end));
	if (following.length && following[0].kind === "comment" && following[0].start === 0) {
		return mark.end + following[0].end;
	}
	return mark.end;
}

function keptText(mark: Mark, side: "new" | "old", breakAs: string = PARAGRAPH_BREAK): string {
	switch (mark.kind) {
		case "highlight":
			return resolveParagraphTokens(mark.text!, PARAGRAPH_TOKEN, breakAs);
		case "substitution":
			return resolveParagraphTokens(side === "new" ? mark.new! : mark.old!, PARAGRAPH_TOKEN, breakAs);
		case "insertion":
			return side === "new" ? resolveParagraphTokens(mark.text!, PARAGRAPH_TOKEN, breakAs) : "";
		case "deletion":
			return side === "new" ? "" : resolveParagraphTokens(mark.text!, PARAGRAPH_TOKEN, breakAs);
		default:
			throw new Error(`unknown mark kind ${mark.kind}`);
	}
}

/** The text this resolution DISCARDS — the mirror of `keptText`, and the only place a break that is
 * about to disappear can still be seen. */
function droppedText(mark: Mark, side: "new" | "old"): string {
	switch (mark.kind) {
		case "insertion":
			return side === "new" ? "" : mark.text!;
		case "deletion":
			return side === "new" ? mark.text! : "";
		case "substitution":
			return side === "new" ? mark.old! : mark.new!;
		default:
			return "";
	}
}

/**
 * Resolve every mark as `accept` would, nested ones included. Idempotent: a body with no marks is
 * returned unchanged.
 *
 * Re-parses after each single resolution rather than applying a batch of offsets: resolving an
 * outer mark moves everything after its opening delimiter, so a stale offset for a nested mark would
 * land on the wrong span.
 */
export function acceptAll(text: string): string {
	return resolveAll(text, accept);
}

/** `acceptAll`'s opposite. See its docstring for why this re-parses. */
export function declineAll(text: string): string {
	return resolveAll(text, decline);
}

function resolveAll(text: string, resolveOne: (t: string, m: Mark) => string): string {
	let marks = parseMarks(text);
	let i = 0;
	while (i < marks.length) {
		const mark = marks[i];
		if (mark.kind === "comment") {
			// A bare comment is left standing (decision 10), skipped in place rather than resolved —
			// resolving it would return the text unchanged for this same mark and spin forever.
			i++;
			continue;
		}
		text = resolveOne(text, mark);
		marks = parseMarks(text);
		i = 0;
	}
	return text;
}

/** Remove every bare comment mark, right to left, leaving everything else untouched. */
export function stripComments(text: string): string {
	const marks = parseMarks(text).filter((m) => m.kind === "comment");
	marks.sort((a, b) => b.start - a.start);
	for (const mark of marks) text = text.slice(0, mark.start) + text.slice(mark.end);
	return text;
}

// --- decision 8, route 1: split a block-spanning mark into one mark per block -----------------

const SPLITTABLE: Partial<Record<MarkKind, [string, string]>> = {
	insertion: ["{++", "++}"],
	deletion: ["{--", "--}"],
	highlight: ["{==", "==}"],
};

/**
 * Split a block-spanning insertion, deletion, or highlight into one mark per block, so every mark
 * ends up on a single line: `{++A\n\nB++}` becomes `{++A++}\n\n{++B++}`, which renders identically.
 *
 * Superseded as the import-time normalization by `tokenizeBlockSpanning` (decision 16); this
 * function is unchanged from decision 8 and survives only as the step `toPortableCriticMarkup`
 * uses to turn the dialect back into plain CriticMarkup.
 *
 * A substitution is left alone — splitting one means deciding how `old` and `new` pair up block for
 * block, which is not always well defined — and so is a comment, which has no per-block content to
 * repeat. Both arrive as literal delimiter characters: visible to the author, never silently merged
 * into the prose.
 *
 * Declining the SPLIT form leaves the blank line between the pieces where declining the unsplit form
 * would have removed it too — no prose is lost either way, but it is a known, accepted cost of this
 * route, not an oversight.
 */
export function normalizeBlockSpanning(text: string): string {
	const marks = parseMarks(text).filter((m) => m.spansBlock && m.kind in SPLITTABLE);
	marks.sort((a, b) => b.start - a.start); // right to left: splitting changes the body's length
	for (const mark of marks) {
		const [openTok, closeTok] = SPLITTABLE[mark.kind]!;
		const blocks = mark.text!.split(BLANK_LINE_G);
		const rewritten = blocks.map((block) => `${openTok}${block}${closeTok}`).join("\n\n");
		text = text.slice(0, mark.start) + rewritten + text.slice(mark.end);
	}
	return text;
}

// --- decision 16: the paragraph-break token -----------------------------------------------------

/** The paragraph-break token: a break carried inside a mark instead of a real newline. */
export const PARAGRAPH_TOKEN = "¶";

/** A literal token character in prose is escaped by doubling, so it round-trips through a mark. */
export function escapeToken(text: string, token: string = PARAGRAPH_TOKEN): string {
	if (token === "") return text;
	return text.split(token).join(token + token);
}

/** The exact inverse of `escapeToken`: a doubled token becomes one literal character again. */
export function unescapeToken(text: string, token: string = PARAGRAPH_TOKEN): string {
	if (token === "") return text;
	return text.split(token + token).join(token);
}

/**
 * Resolve a piece of KEPT mark text: an unpaired (structural) token becomes a real paragraph break,
 * and a doubled (escaped) token becomes the single literal character it stands for. Scans
 * left-to-right so a doubled pair is consumed as a unit and never mistaken for two lone tokens.
 */
function resolveParagraphTokens(text: string, token: string = PARAGRAPH_TOKEN, breakAs: string = PARAGRAPH_BREAK): string {
	if (token === "") return text;
	let out = "";
	let i = 0;
	while (i < text.length) {
		if (text.startsWith(token, i)) {
			if (text.startsWith(token, i + token.length)) {
				out += token + token; // escaped pair — unescapeToken folds it below
				i += token.length * 2;
			} else {
				out += breakAs; // unpaired: a structural break
				i += token.length;
			}
		} else {
			out += text[i];
			i++;
		}
	}
	return unescapeToken(out, token);
}

/**
 * Real newlines inside a mark become the paragraph token, one mark's content at a time — decision
 * 16's replacement for `normalizeBlockSpanning`'s splitting at import time. Unlike that route, this
 * applies to all five kinds: a block-spanning substitution or comment tokenizes too, since the break
 * is now an ordinary character inside a one-line mark rather than a structural split.
 *
 * Escapes any existing literal token character WITHIN a spanning mark's own content first, so a
 * literal pilcrow sitting next to the blank line being converted is not confused with the new
 * structural break — scoped to that one mark's content, not the whole document: a document that
 * ROUND-TRIPS through this dialect already satisfies "single token is structural, doubled token is
 * literal" everywhere else (decision 16's own invariant, kept by `escapeToken` on every export), and
 * escaping the whole text here would re-double a break token that already exists in some OTHER,
 * non-spanning mark — corrupting exactly the values this function is meant to leave alone.
 */
export function tokenizeBlockSpanning(text: string, token: string = PARAGRAPH_TOKEN): string {
	if (token === "") return text; // disabled, matching escapeToken/unescapeToken's own convention
	const marks = parseMarks(text).filter((m) => m.spansBlock);
	if (!marks.length) return text;
	marks.sort((a, b) => b.start - a.start); // right to left: rewriting changes the body's length
	let body = text;
	for (const mark of marks) {
		const contentStart = mark.start + TOKEN_LEN;
		const contentEnd = mark.end - TOKEN_LEN;
		const content = escapeToken(body.slice(contentStart, contentEnd), token).replace(BLANK_LINE_G, token);
		body = body.slice(0, contentStart) + content + body.slice(contentEnd);
	}
	return body;
}

/**
 * Convert a dialect document back to plain CriticMarkup, for handing to a tool that does not know
 * the paragraph token: structural tokens become real newlines (and escaped literal tokens become the
 * single character they stand for), then `normalizeBlockSpanning` splits the resulting block-spanning
 * marks the decision-8 way — accepting that route's blank-line-on-decline cost as the price of
 * portability.
 */
export function toPortableCriticMarkup(text: string, token: string = PARAGRAPH_TOKEN): string {
	return normalizeBlockSpanning(resolveParagraphTokens(text, token));
}

// --- decision 18: whitespace at a paragraph-break seam ------------------------------------------

/** A real paragraph break, as this grammar spells one. */
const PARAGRAPH_BREAK = "\n\n";

// Two sentinels, placed by `resolve` and consumed by `settleSeams` within that same call. They exist
// so a seam adjustment can see the characters on BOTH sides of the mark — which a rule written over
// the mark's own span cannot — without a regex sweep that would touch whitespace elsewhere in the
// document that this resolution does not own (G2's "leaving all other text untouched"). Deliberately
// outside the U+E000..U+E007 block `maskNested` uses; nothing outside this file ever sees one.
const BREAK_SEAM = "\uE010"; // a break this resolution CREATES
const JOIN_SEAM = "\uE011"; // a break this resolution REMOVES, with nothing kept in its place

/** Horizontal whitespace only: a seam adjustment never eats a neighbouring line's newline. */
const HORIZONTAL_WS = /[ \t]*/;

/** True if `text` holds at least one UNPAIRED token — a structural break rather than a doubled
 * literal. Scans in `resolveParagraphTokens`' left-to-right order so the two always agree on which
 * tokens are structural. */
function hasStructuralToken(text: string, token: string = PARAGRAPH_TOKEN): boolean {
	if (token === "") return false;
	let i = 0;
	while (i < text.length) {
		if (text.startsWith(token, i)) {
			if (text.startsWith(token, i + token.length)) {
				i += token.length * 2;
				continue;
			}
			return true;
		}
		i++;
	}
	return false;
}

/**
 * Turn the seam sentinels into real text, which is where decision 18's two rules actually live:
 *
 * - A break being CREATED absorbs the horizontal whitespace on either side of it, so accepting
 *   `here. {++¶++}The` does not leave a space stranded at the end of the first paragraph.
 * - A break being REMOVED becomes a single space, so accepting `here.{--¶--}The` reads
 *   `here. The` rather than `here.The` — but only when real text sits hard against both sides, so a
 *   merge into text that already has whitespace (or at the very start or end of the body) adds
 *   nothing.
 */
function settleSeams(text: string): string {
	if (!text.includes(BREAK_SEAM) && !text.includes(JOIN_SEAM)) return text;
	const broken = text.replace(new RegExp(`${HORIZONTAL_WS.source}${BREAK_SEAM}${HORIZONTAL_WS.source}`, "g"), PARAGRAPH_BREAK);
	return settleJoinSeam(broken);
}

/** One join seam at a time, by index rather than by regex, so a character outside the Basic
 * Multilingual Plane on either side of the seam is never split. */
function settleJoinSeam(text: string): string {
	const at = text.indexOf(JOIN_SEAM);
	if (at < 0) return text;
	const before = text.slice(0, at);
	const after = text.slice(at + JOIN_SEAM.length);
	const needsSpace = before !== "" && after !== "" && !/\s$/.test(before) && !/^\s/.test(after);
	return settleJoinSeam(before + (needsSpace ? " " : "") + after);
}

// --- decision 11: nesting is detected and masked, not mangled ----------------------------------

// One private-use sentinel per CriticMarkup delimiter character, so masking is a plain,
// length-preserving character substitution with a trivial exact inverse.
const DELIMITER_CHARS = ["{", "}", "+", "-", "~", ">", "<", "="] as const;
const MASK_OF = new Map<string, string>(DELIMITER_CHARS.map((ch, i) => [ch, String.fromCodePoint(0xe000 + i)]));
const UNMASK_OF = new Map<string, string>(DELIMITER_CHARS.map((ch, i) => [String.fromCodePoint(0xe000 + i), ch]));

/**
 * Replace the delimiter characters of every mark nested inside another mark with a sentinel from the
 * U+E000 private-use block, one code point per delimiter character — leaving the nested mark's own
 * content untouched. The editor's import path is regex-based and cannot see a same-kind nested mark
 * correctly (`parseMarks` can); masking lets the OUTER mark import correctly, with the inner
 * delimiters arriving as ordinary text. `unmaskNested` is this function's exact inverse.
 */
export function maskNested(text: string): { masked: string; masks: number } {
	const marks = parseMarks(text);
	const nested = marks.filter((m) => marks.some((p) => p !== m && p.start <= m.start && m.end <= p.end));
	if (!nested.length) return { masked: text, masks: 0 };
	const units = text.split("");
	for (const mark of nested) {
		maskRange(units, mark.start, mark.start + TOKEN_LEN);
		maskRange(units, mark.end - TOKEN_LEN, mark.end);
		if (mark.kind === "substitution") {
			const sepPos = mark.start + TOKEN_LEN + mark.old!.length;
			maskRange(units, sepPos, sepPos + SEP.length);
		}
	}
	return { masked: units.join(""), masks: nested.length };
}

function maskRange(units: string[], start: number, end: number): void {
	for (let i = start; i < end; i++) {
		const masked = MASK_OF.get(units[i]);
		if (masked) units[i] = masked;
	}
}

/** The exact inverse of `maskNested`: every sentinel code point becomes its real delimiter character. */
export function unmaskNested(text: string): string {
	let out = "";
	for (const ch of text) out += UNMASK_OF.get(ch) ?? ch;
	return out;
}
