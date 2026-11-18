// @dojo-ng/command-palette's matcher, ported from NovelMaker's web/tools/palette.test.mjs.
// The element is covered in tests/browser/command-palette.test.js.
import test from "node:test";
import assert from "node:assert/strict";
import { filterCommands } from "../packages/command-palette/dist/match.js";

const COMMANDS = [
	{ id: "print", group: "Book", label: "Print-ready PDF" },
	{ id: "snapshot", group: "Book", label: "Take beta snapshot" },
	{ id: "theme", group: "Book", label: "Switch theme" },
	{ id: "top", group: "Chapter", label: "Go to top" },
	{ id: "ch-1", group: "Go to", label: "Chapter 1 · Job Fair" },
	{ id: "ch-10", group: "Go to", label: "Chapter 10 · Retirement" },
	{ id: "ref", group: "Reference", label: "Dossier · decisions" },
	{ id: "pass", group: "Run pass", label: "line-edit", keywords: "edit pass" },
];

const ids = (list) => list.map((c) => c.id);

test("an empty query is every command, in the order given", () => {
	assert.deepEqual(ids(filterCommands(COMMANDS, "")), ids(COMMANDS));
	assert.deepEqual(ids(filterCommands(COMMANDS, "   ")), ids(COMMANDS));
});

test("typing narrows the list, case does not matter", () => {
	assert.deepEqual(ids(filterCommands(COMMANDS, "SNAP")), ["snapshot"]);
});

test("every word must match, in any order, across group, label, and keywords", () => {
	assert.deepEqual(ids(filterCommands(COMMANDS, "ref dec")), ["ref"]);
	assert.deepEqual(ids(filterCommands(COMMANDS, "decisions dossier")), ["ref"]);
	assert.deepEqual(ids(filterCommands(COMMANDS, "pass edit")), ["pass"]);
	assert.deepEqual(ids(filterCommands(COMMANDS, "snap theme")), []);
});

test("a label that starts with the word comes before one that merely contains it", () => {
	const found = ids(filterCommands(COMMANDS, "go"));
	assert.equal(found[0], "top");
	assert.ok(found.includes("ch-1"));
	const both = ids(filterCommands(COMMANDS, "ch"));
	assert.equal(both[0], "ch-1");
	assert.ok(both.indexOf("theme") > both.indexOf("ch-10"));
});

test("equally good matches keep the registered order", () => {
	assert.deepEqual(ids(filterCommands(COMMANDS, "chapter")), ["ch-1", "ch-10", "top"]);
});

test("nothing matching is an empty list, not an error", () => {
	assert.deepEqual(filterCommands(COMMANDS, "zzz"), []);
});

test("the input is not changed", () => {
	const copy = [...COMMANDS];
	filterCommands(COMMANDS, "go");
	assert.deepEqual(COMMANDS, copy);
});
