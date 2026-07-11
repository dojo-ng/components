// Pure search-query grammar for dj-search-box. No DOM, no dependencies at runtime: the
// component's tokenizer IS `parseQuery` (there is no second parser), and the Perry backend
// reuses the same grammar. Free text plus typed `key:value` filters ("tokens"); a value may
// be double-quoted to hold spaces. An unconfigured `key:` is left as plain text.

import type { ListOption } from "@dojo-ng/list";

/** A configurable filter key. `options` (used by the component for suggestions) is ignored by the parser. */
export interface SearchKey {
	key: string;
	label?: string;
	options?: ListOption[];
}

/** One committed filter: a configured key and its value. */
export interface SearchToken {
	key: string;
	value: string;
}

/** The structured query: free text plus the committed tokens, in order of appearance. */
export interface SearchQuery {
	text: string;
	tokens: SearchToken[];
}

/**
 * Split input into whitespace-separated segments, keeping a double-quoted run (and its inner
 * spaces) within the segment it belongs to. Quotes are only special as part of a value, but
 * a quoted run anywhere is kept intact so free text survives a round-trip unchanged.
 */
function segments(input: string): string[] {
	const out: string[] = [];
	let i = 0;
	const n = input.length;
	while (i < n) {
		while (i < n && /\s/.test(input[i])) i++;
		if (i >= n) break;
		let seg = "";
		while (i < n && !/\s/.test(input[i])) {
			if (input[i] === '"') {
				seg += input[i++]; // opening quote
				while (i < n && input[i] !== '"') seg += input[i++];
				if (i < n) seg += input[i++]; // closing quote
			} else {
				seg += input[i++];
			}
		}
		out.push(seg);
	}
	return out;
}

/** Strip a single pair of surrounding double quotes, if present. */
function unquote(s: string): string {
	if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
	if (s.startsWith('"')) return s.slice(1);
	return s;
}

/**
 * Parse `input` into a {@link SearchQuery}. A segment `key:value` becomes a token when `key` is
 * one of `keys` and the value is non-empty (values may be `"quoted"` to contain spaces); every
 * other segment — including an unconfigured `word:` — is free text, joined in original order.
 */
export function parseQuery(input: string, keys: SearchKey[]): SearchQuery {
	const configured = new Set(keys.map((k) => k.key));
	const tokens: SearchToken[] = [];
	const textParts: string[] = [];
	for (const seg of segments(input)) {
		const colon = seg.indexOf(":");
		if (colon > 0) {
			const key = seg.slice(0, colon);
			if (configured.has(key) && !key.includes('"')) {
				const value = unquote(seg.slice(colon + 1));
				if (value !== "") {
					tokens.push({ key, value });
					continue;
				}
			}
		}
		textParts.push(seg);
	}
	return { text: textParts.join(" "), tokens };
}

/** Format one token as `key:value`, quoting the value when it holds whitespace or is empty. */
function formatToken(t: SearchToken): string {
	const needsQuotes = t.value === "" || /\s/.test(t.value);
	return `${t.key}:${needsQuotes ? `"${t.value}"` : t.value}`;
}

/**
 * Render a {@link SearchQuery} back to a string: the tokens (as `key:value`) followed by the free
 * text. `parseQuery(formatQuery(q), keys)` reproduces `q` for any query `parseQuery` produced.
 */
export function formatQuery(query: SearchQuery): string {
	const parts = query.tokens.map(formatToken);
	if (query.text) parts.push(query.text);
	return parts.join(" ");
}
