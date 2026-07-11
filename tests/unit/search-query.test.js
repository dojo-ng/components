// Unit tests for the dj-search-box grammar (SB1, the Q2 logic layer). Pure functions, no DOM —
// runs in Node under Vitest. The component's tokenizer IS parseQuery, and the Perry backend reuses
// the same grammar, so this is the contract for both.
import { describe, it, expect } from "vitest";
import { parseQuery, formatQuery } from "../../packages/search-box/dist/query.js";

const keys = [{ key: "from" }, { key: "to" }, { key: "subject" }, { key: "tag" }];

describe("parseQuery", () => {
	it("returns plain text with no tokens", () => {
		expect(parseQuery("hello world", keys)).toEqual({ text: "hello world", tokens: [] });
	});

	it("parses a single token", () => {
		expect(parseQuery("from:bob", keys)).toEqual({ text: "", tokens: [{ key: "from", value: "bob" }] });
	});

	it("parses a double-quoted value containing spaces", () => {
		expect(parseQuery('subject:"weekly report"', keys)).toEqual({
			text: "",
			tokens: [{ key: "subject", value: "weekly report" }],
		});
	});

	it("leaves an unconfigured key as plain text", () => {
		expect(parseQuery("note:hello world", keys)).toEqual({ text: "note:hello world", tokens: [] });
	});

	it("keeps an empty value (`from:`) as text, not a token", () => {
		expect(parseQuery("from: hi", keys)).toEqual({ text: "from: hi", tokens: [] });
	});

	it("parses several tokens mixed with text, preserving text order", () => {
		expect(parseQuery('hello from:bob subject:"weekly report" world to:alice bye', keys)).toEqual({
			text: "hello world bye",
			tokens: [
				{ key: "from", value: "bob" },
				{ key: "subject", value: "weekly report" },
				{ key: "to", value: "alice" },
			],
		});
	});

	it("keeps a value that itself contains a colon", () => {
		expect(parseQuery("from:a:b", keys)).toEqual({ text: "", tokens: [{ key: "from", value: "a:b" }] });
	});

	it("returns an empty query for empty input", () => {
		expect(parseQuery("", keys)).toEqual({ text: "", tokens: [] });
		expect(parseQuery("   ", keys)).toEqual({ text: "", tokens: [] });
	});
});

describe("formatQuery", () => {
	it("renders tokens then text, quoting values with spaces", () => {
		expect(
			formatQuery({ text: "hello world", tokens: [{ key: "from", value: "bob" }, { key: "subject", value: "weekly report" }] }),
		).toBe('from:bob subject:"weekly report" hello world');
	});

	it("renders text alone when there are no tokens", () => {
		expect(formatQuery({ text: "just text", tokens: [] })).toBe("just text");
	});
});

describe("round-trip: parseQuery(formatQuery(parseQuery(s))) === parseQuery(s)", () => {
	const cases = [
		"",
		"hello world",
		"from:bob",
		'subject:"weekly report"',
		"note:hello world",
		'hello from:bob subject:"weekly report" world to:alice bye',
		"from:a:b tag:urgent",
	];
	for (const s of cases) {
		it(`round-trips: ${JSON.stringify(s)}`, () => {
			const q = parseQuery(s, keys);
			expect(parseQuery(formatQuery(q), keys)).toEqual(q);
		});
	}
});
