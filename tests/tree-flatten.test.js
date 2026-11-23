// flattenTree (TS1, tree-scale-spec.md): the pure function that turns nodes + open ids into the
// visible rows dj-tree renders and windows. No DOM involved.
import test from "node:test";
import assert from "node:assert/strict";
import { flattenTree } from "../packages/tree/dist/flatten.js";

const NODES = [
	{ id: "a", label: "A", children: [
		{ id: "a1", label: "A1", children: [{ id: "a1x", label: "A1x" }] },
		{ id: "a2", label: "A2" },
	] },
	{ id: "b", label: "B" },
];
const ids = (flat) => flat.rows.map((r) => r.id);

test("flatten: everything collapsed shows only the roots", () => {
	const flat = flattenTree(NODES, new Set());
	assert.deepEqual(ids(flat), ["a", "b"]);
	assert.equal(flat.rows[0].hasChildren, true);
	assert.equal(flat.rows[0].open, false);
});

test("flatten: an open node is followed by its children, in tree order", () => {
	const flat = flattenTree(NODES, new Set(["a"]));
	assert.deepEqual(ids(flat), ["a", "a1", "a2", "b"]);
	assert.deepEqual(flat.rows.map((r) => r.level), [1, 2, 2, 1]);
});

test("flatten: deep expansion, and an open id under a closed parent stays hidden", () => {
	assert.deepEqual(ids(flattenTree(NODES, new Set(["a", "a1"]))), ["a", "a1", "a1x", "a2", "b"]);
	assert.deepEqual(ids(flattenTree(NODES, new Set(["a1"]))), ["a", "b"]);
});

test("flatten: empty nodes, and an open leaf, are fine", () => {
	const empty = flattenTree([], new Set(["a"]));
	assert.deepEqual(empty.rows, []);
	const leaf = flattenTree(NODES, new Set(["b"]));
	assert.equal(leaf.rows[1].open, false);
	assert.equal(leaf.rows[1].hasChildren, false);
});

test("flatten: setSize and posInSet count siblings, not rows", () => {
	const flat = flattenTree(NODES, new Set(["a"]));
	const by = Object.fromEntries(flat.rows.map((r) => [r.id, [r.posInSet, r.setSize]]));
	assert.deepEqual(by, { a: [1, 2], a1: [1, 2], a2: [2, 2], b: [2, 2] });
});

test("flatten: parentOf and indexOf agree with the rows", () => {
	const flat = flattenTree(NODES, new Set(["a", "a1"]));
	assert.equal(flat.parentOf.get("a1x"), "a1");
	assert.equal(flat.parentOf.get("a"), undefined);
	flat.rows.forEach((r, i) => assert.equal(flat.indexOf.get(r.id), i));
});

test("flatten: 50,000 nodes flatten without recursion trouble", () => {
	const nodes = Array.from({ length: 50 }, (_, g) => ({
		id: `g${g}`, label: `G${g}`,
		children: Array.from({ length: 1000 }, (_, i) => ({ id: `g${g}-${i}`, label: `N${i}` })),
	}));
	const open = new Set(nodes.map((n) => n.id));
	const flat = flattenTree(nodes, open);
	assert.equal(flat.rows.length, 50 + 50000);
});

// ---- lazy nodes (TS2) ----
const LAZY = () => [
	{ id: "a", label: "A", hasChildren: true },
	{ id: "b", label: "B", hasChildren: true, children: [{ id: "b1", label: "B1" }] },
	{ id: "c", label: "C", hasChildren: true, children: [] },
];

test("flatten: a lazy node has a chevron, and a loaded-empty one does not", () => {
	const flat = flattenTree(LAZY(), new Set());
	assert.deepEqual(flat.rows.map((r) => r.hasChildren), [true, true, false]);
	assert.deepEqual(flat.needLoad, []);
});

test("flatten: an open lazy node gets a loading row and is listed in needLoad once", () => {
	const flat = flattenTree(LAZY(), new Set(["a"]));
	assert.deepEqual(flat.rows.map((r) => `${r.kind}:${r.level}`), ["node:1", "loading:2", "node:1", "node:1"]);
	assert.deepEqual(flat.needLoad, ["a"]);
	assert.equal(flat.parentOf.get(flat.rows[1].id), "a");
});

test("flatten: once requested the node is not asked for again, and a failure shows a retry row", () => {
	const asked = flattenTree(LAZY(), new Set(["a"]), { loading: new Set(["a"]) });
	assert.deepEqual(asked.needLoad, []);
	assert.equal(asked.rows[1].kind, "loading");
	const failed = flattenTree(LAZY(), new Set(["a"]), { failed: new Map([["a", "boom"]]) });
	assert.deepEqual(failed.needLoad, []);
	assert.equal(failed.rows[1].kind, "error");
});
