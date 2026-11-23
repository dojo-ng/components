// Tri-state math for dj-tree `checkable` (TS3, tree-scale-spec.md). Pure functions, no DOM.
import test from "node:test";
import assert from "node:assert/strict";
import { computeChecks, toggleCheck, pendingParents } from "../packages/tree/dist/check.js";

const NODES = () => [
	{ id: "a", label: "A", children: [
		{ id: "a1", label: "A1", children: [{ id: "a1x", label: "A1x" }, { id: "a1y", label: "A1y" }] },
		{ id: "a2", label: "A2" },
	] },
	{ id: "b", label: "B" },
	{ id: "lz", label: "Lazy", hasChildren: true },
];
const sorted = (s) => [...s].sort();

test("checks: nothing listed, nothing checked", () => {
	const c = computeChecks(NODES(), []);
	assert.deepEqual(sorted(c.checked), []);
	assert.deepEqual(sorted(c.partial), []);
});

test("checks: a checked leaf makes every ancestor partial", () => {
	const c = computeChecks(NODES(), ["a1x"]);
	assert.deepEqual(sorted(c.checked), ["a1x"]);
	assert.deepEqual(sorted(c.partial), ["a", "a1"]);
});

test("checks: all children checked makes the parent checked, not partial", () => {
	const c = computeChecks(NODES(), ["a1x", "a1y"]);
	assert.deepEqual(sorted(c.checked), ["a1", "a1x", "a1y"]);
	assert.deepEqual(sorted(c.partial), ["a"]);
});

test("checks: a listed parent checks everything loaded below it", () => {
	const c = computeChecks(NODES(), ["a"]);
	assert.deepEqual(sorted(c.checked), ["a", "a1", "a1x", "a1y", "a2"]);
	assert.deepEqual(sorted(c.partial), []);
});

test("checks: an unloaded lazy node is checked only when listed, and is never partial", () => {
	assert.deepEqual(sorted(computeChecks(NODES(), ["lz"]).checked), ["lz"]);
	assert.deepEqual(sorted(computeChecks(NODES(), []).partial), []);
});

test("toggle: checking a parent checks all loaded descendants", () => {
	assert.deepEqual(sorted(toggleCheck(NODES(), [], "a1")), ["a1", "a1x", "a1y"]);
});

test("toggle: checking the last unchecked child checks its parent, and so up", () => {
	assert.deepEqual(sorted(toggleCheck(NODES(), ["a1x", "a1y"], "a2")), ["a", "a1", "a1x", "a1y", "a2"]);
});

test("toggle: unchecking a child clears its checked ancestors", () => {
	const all = toggleCheck(NODES(), [], "a");
	assert.deepEqual(sorted(toggleCheck(NODES(), all, "a1x")), ["a1y", "a2"]);
});

test("toggle: a partial parent becomes fully checked; a checked one clears", () => {
	assert.deepEqual(sorted(toggleCheck(NODES(), ["a1x"], "a1")), ["a1", "a1x", "a1y"]);
	assert.deepEqual(sorted(toggleCheck(NODES(), ["a1", "a1x", "a1y"], "a1")), []);
});

test("toggle: an unknown id changes nothing", () => {
	assert.deepEqual(sorted(toggleCheck(NODES(), ["b"], "nope")), ["b"]);
});

test("pendingParents: checked lazy nodes are reported by id", () => {
	const nodes = NODES();
	assert.deepEqual(pendingParents(nodes, computeChecks(nodes, ["lz", "b"]).checked), ["lz"]);
	assert.deepEqual(pendingParents(nodes, computeChecks(nodes, ["b"]).checked), []);
});

test("loading children under a checked lazy node checks them", () => {
	const nodes = NODES();
	nodes[2].children = [{ id: "l1", label: "L1" }, { id: "l2", label: "L2" }];
	const c = computeChecks(nodes, ["lz"]);
	assert.deepEqual(sorted(c.checked), ["l1", "l2", "lz"]);
	assert.deepEqual(pendingParents(nodes, c.checked), []);
});
