// Track G of rich-text-criticmarkup-spec.md: the grammar module, no editor involved. Table-driven
// over fixtures/conformance.json (decision 17) so the same cases run again from NovelMaker's
// test_critic.py against the identical file.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import {
	parseMarks,
	accept,
	decline,
	acceptAll,
	declineAll,
	stripComments,
	normalizeBlockSpanning,
	tokenizeBlockSpanning,
	toPortableCriticMarkup,
	escapeToken,
	unescapeToken,
	maskNested,
	unmaskNested,
	PARAGRAPH_TOKEN,
} from "../packages/rich-text-criticmarkup/dist/index.js";

const PACKAGE_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../packages/rich-text-criticmarkup");
const FIXTURES_PATH = path.join(PACKAGE_ROOT, "fixtures/conformance.json");
const conformance = JSON.parse(readFileSync(FIXTURES_PATH, "utf8"));

function runCase(op, input, mark) {
	switch (op) {
		case "parse":
			return parseMarks(input);
		case "accept":
			return accept(input, parseMarks(input)[mark]);
		case "decline":
			return decline(input, parseMarks(input)[mark]);
		case "acceptAll":
			return acceptAll(input);
		case "declineAll":
			return declineAll(input);
		case "stripComments":
			return stripComments(input);
		case "tokenize":
			return tokenizeBlockSpanning(input);
		case "portable":
			return toPortableCriticMarkup(input);
		default:
			throw new Error(`unknown corpus op ${op}`);
	}
}

// The count is asserted as a literal, not derived from the array's own length, so a case cannot be
// quietly dropped without this test noticing.
test("conformance.json carries at least the cases this spec named by name", () => {
	assert.ok(conformance.length >= 52, `expected at least 52 cases, found ${conformance.length}`);
});

for (const c of conformance) {
	test(`corpus: ${c.id}`, () => {
		assert.deepEqual(runCase(c.op, c.input, c.mark), c.expected);
	});
}

// The honest version of the table-driven run: a corpus nothing can fail is documentation, not a
// check. Corrupt one expected value in an in-memory copy, confirm the SAME runner fails and names
// the right id, and never write the corruption back to disk.
test("corpus run fails, naming the case, when an expected value is wrong", () => {
	const corrupted = JSON.parse(JSON.stringify(conformance));
	const target = corrupted.find((c) => c.id === "accept-insertion");
	target.expected = "not the real answer";
	let failedId = null;
	for (const c of corrupted) {
		try {
			assert.deepEqual(runCase(c.op, c.input, c.mark), c.expected);
		} catch {
			failedId = c.id;
			break;
		}
	}
	assert.equal(failedId, "accept-insertion");
});

// text.slice(start, end) is the mark exactly as written, delimiters included — the contract the
// frozen API's own doc comment states.
test("every parse fixture's offsets round-trip the mark exactly", () => {
	for (const c of conformance.filter((c) => c.op === "parse")) {
		for (const mark of parseMarks(c.input)) {
			const raw = c.input.slice(mark.start, mark.end);
			if (mark.kind === "substitution") {
				assert.ok(raw.includes(mark.old) && raw.includes(mark.new), `${c.id}: ${raw}`);
			} else {
				assert.ok(raw.includes(mark.text), `${c.id}: ${raw}`);
			}
			assert.ok(raw.startsWith("{"), `${c.id}: mark span must start with a delimiter`);
			assert.ok(raw.endsWith("}"), `${c.id}: mark span must end with a delimiter`);
		}
	}
});

// Property check (decision, G2's Verify): once declineAll has run, every real mark is gone — only
// bare comments, which neither bulk resolution ever touches, can remain. A further acceptAll is
// then a no-op by construction, which is the same claim as "no non-mark character is lost": there
// is nothing left for it to change.
test("acceptAll(declineAll(body)) === declineAll(body), over a small generated corpus", () => {
	const bodies = [
		"prose {++added++} more prose {--removed--} end.",
		"a {~~was~>now~~} b {==note==}{>>comment<<} c",
		"{--a {--b--} c--}",
		"{++a {--b--} c++}",
		"nothing to see here at all",
		"{>>just a bare comment<<} with prose around it",
		"multiple {++one++} {--two--} {~~three~>3~~} {==four==} marks in one line",
	];
	for (const body of bodies) {
		const declined = declineAll(body);
		assert.equal(acceptAll(declined), declined, body);
	}
});

test("escapeToken/unescapeToken round-trip every fixture input, pilcrows included", () => {
	for (const c of conformance) {
		assert.equal(unescapeToken(escapeToken(c.input)), c.input, c.id);
	}
	assert.equal(escapeToken("no pilcrow in this one"), "no pilcrow in this one");
});

test("maskNested/unmaskNested round-trip every fixture input, sentinels included", () => {
	for (const c of conformance) {
		const { masked } = maskNested(c.input);
		assert.equal(unmaskNested(masked), c.input, c.id);
	}
});

test("maskNested is a no-op — zero masks, identical string — on input with no nesting", () => {
	for (const c of conformance.filter((c) => !/nested/i.test(c.id))) {
		const { masked, masks } = maskNested(c.input);
		if (parseMarks(c.input).some((m) => m.nested)) continue; // this input does have nesting
		assert.equal(masks, 0, c.id);
		assert.equal(masked, c.input, c.id);
	}
});

test("maskNested masks only the inner mark's own delimiters, not its content", () => {
	const { masked, masks } = maskNested("{--a {--b--} c--}");
	assert.equal(masks, 1);
	// the inner mark's content ("b") survives as plain text; only its three-character
	// open/close delimiters were replaced with private-use sentinels.
	assert.ok(masked.includes("b"));
	assert.notEqual(masked, "{--a {--b--} c--}");
	assert.equal(unmaskNested(masked), "{--a {--b--} c--}");
});

test("normalizeBlockSpanning splits insertion/deletion/highlight, leaves substitution/comment refused as literal text", () => {
	assert.equal(normalizeBlockSpanning("{++A\n\nB++}"), "{++A++}\n\n{++B++}");
	// a block-spanning substitution has no well-defined per-block old/new pairing, so route 1
	// leaves it untouched — still literal delimiter characters, never silently merged into prose.
	const substitution = "{~~A\n\nB~>C~~}";
	assert.equal(normalizeBlockSpanning(substitution), substitution);
});

test("toPortableCriticMarkup's decline carries route 1's known blank-line cost, not a bug", () => {
	// Declining the dialect (tokenized) form removes the insertion cleanly, no trace left —
	// case "token-decline-insertion-no-orphan-blank-line" above already asserts this as "".
	// Declining the PORTABLE (route-1 split) form of the exact same content leaves the blank line
	// between the two pieces standing, because splitting moved it outside both marks. This is the
	// accepted price of interop with a tool that has never heard of the paragraph token, asserted
	// here as the literal string it produces rather than as "no prose is lost".
	const portable = toPortableCriticMarkup("{++A¶B++}");
	assert.equal(portable, "{++A++}\n\n{++B++}");
	assert.equal(declineAll(portable), "\n\n");
});

test("PARAGRAPH_TOKEN is the visible ASCII-printable pilcrow, not a private-use sentinel", () => {
	assert.equal(PARAGRAPH_TOKEN, "¶");
});

// Assert the tarball, not a --dry-run report of what npm intends to do: a determinism check that
// never actually produced the artifact it claims to would false-pass. Pack for real into a scratch
// directory, read the tarball's real member list with `tar`, then clean up.
test("npm pack includes fixtures/conformance.json (files field is not enough to trust)", () => {
	const scratch = mkdtempSync(path.join(os.tmpdir(), "criticmarkup-pack-"));
	try {
		const packOut = execFileSync("npm", ["pack", "--pack-destination", scratch], {
			cwd: PACKAGE_ROOT,
			encoding: "utf8",
		});
		const tarballName = packOut.trim().split("\n").pop();
		const tarballPath = path.join(scratch, tarballName);
		const members = execFileSync("tar", ["tzf", tarballPath], { encoding: "utf8" }).trim().split("\n");
		assert.ok(members.length > 0, "tarball is empty");
		assert.ok(
			members.some((m) => m.endsWith("fixtures/conformance.json")),
			`fixtures/conformance.json missing from tarball: ${members.join(", ")}`,
		);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
});
