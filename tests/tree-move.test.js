// Pure helpers behind dj-tree row dragging (TS4, tree-scale-spec.md).
import test from "node:test";
import assert from "node:assert/strict";
import { dropZone, dragIds, isUnder } from "../packages/tree/dist/move.js";

test("dropZone: a row that can take the drop has before, inside, after bands", () => {
	assert.equal(dropZone(0.1, true, false), "before");
	assert.equal(dropZone(0.5, true, false), "inside");
	assert.equal(dropZone(0.9, true, false), "after");
});

test("dropZone: the bottom band of an open parent means inside", () => {
	assert.equal(dropZone(0.9, true, true), "inside");
	assert.equal(dropZone(0.1, true, true), "before");
});

test("dropZone: a row that cannot take the drop splits in two; an open one refuses its bottom half", () => {
	assert.equal(dropZone(0.2, false, false), "before");
	assert.equal(dropZone(0.7, false, false), "after");
	assert.equal(dropZone(0.7, false, true), null);
});

const NODES = [
	{ id: "a", label: "A", children: [{ id: "a1", label: "A1" }, { id: "a2", label: "A2" }] },
	{ id: "b", label: "B" },
	{ id: "c", label: "C", children: [{ id: "c1", label: "C1" }] },
];

test("dragIds: an unchecked row drags alone, even when others are checked", () => {
	assert.deepEqual(dragIds(NODES, new Set(["b", "c1"]), "a1"), ["a1"]);
});

test("dragIds: a checked row drags every checked row, top-most only, in tree order", () => {
	assert.deepEqual(dragIds(NODES, new Set(["c", "c1", "b", "a1"]), "b"), ["a1", "b", "c"]);
	assert.deepEqual(dragIds(NODES, new Set(["a", "a1", "a2"]), "a1"), ["a"]);
});

test("isUnder: the row itself and anything below a dragged id", () => {
	const parentOf = new Map([["a1", "a"], ["a2", "a"], ["c1", "c"]]);
	assert.equal(isUnder("a", new Set(["a"]), parentOf), true);
	assert.equal(isUnder("a2", new Set(["a"]), parentOf), true);
	assert.equal(isUnder("c1", new Set(["a"]), parentOf), false);
	assert.equal(isUnder("b", new Set(["a"]), parentOf), false);
});
