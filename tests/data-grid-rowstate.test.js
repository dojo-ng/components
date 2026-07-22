// data-grid-rowstate smokes. As in the other grid tests, give the scroll
// viewport a real offset size so the TanStack virtualizer renders body rows.
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { rowStatePlugin } from "../packages/data-grid-rowstate/dist/index.js";
import { treePlugin } from "../packages/data-grid-tree/dist/index.js";
import "../packages/data-grid/dist/index.js";

const proto = globalThis.window.HTMLElement.prototype;
for (const [prop, val] of [["offsetHeight", 400], ["offsetWidth", 320]]) {
	Object.defineProperty(proto, prop, {
		configurable: true,
		get() { return this.classList?.contains("scroll") ? val : 0; },
	});
}

async function grid(plugins, data, columns) {
	const el = document.createElement("dj-data-grid");
	el.columns = columns ?? [{ id: "subject", header: "Subject", accessorKey: "subject" }];
	el.data = data;
	el.plugins = plugins;
	document.body.appendChild(el);
	await el.updateComplete;
	await settled(el);
	return el;
}

const rowEls = (el) => [...el.renderRoot.querySelectorAll('[part~="row"]')];
const parts = (node) => (node.getAttribute("part") || "").split(/\s+/).filter(Boolean);

test("row() tokens become row--T parts and the base row part is kept on every row", async () => {
	const el = await grid(
		[rowStatePlugin({ row: (r) => (r.seen ? null : "unread") })],
		[{ subject: "a", seen: false }, { subject: "b", seen: true }],
	);
	const rows = rowEls(el);
	assert.equal(rows.length, 2);
	for (const r of rows) assert.ok(parts(r).includes("row"), "base row part present");
	const unread = rows.filter((r) => parts(r).includes("row--unread"));
	assert.equal(unread.length, 1, "exactly the unseen row is tagged unread");
});

test("a row that returns no token still keeps part='row' (reconcile regression)", async () => {
	// Every row is 'seen', so the classifier returns null for all — none may lose
	// the base row part (a bare {} return would strip it off the reused rows).
	const el = await grid(
		[rowStatePlugin({ row: () => null })],
		[{ subject: "a", seen: true }, { subject: "b", seen: true }],
	);
	const rows = rowEls(el);
	assert.equal(rows.length, 2);
	for (const r of rows) {
		assert.ok(parts(r).includes("row"));
		assert.ok(!parts(r).some((p) => p.startsWith("row--")));
	}
});

test("an invalid state token warns once and is dropped", async () => {
	const warnings = [];
	const orig = console.warn;
	console.warn = (m) => warnings.push(String(m));
	try {
		const el = await grid(
			[rowStatePlugin({ row: () => "not valid" })],
			[{ subject: "a" }, { subject: "b" }],
		);
		for (const r of rowEls(el)) {
			assert.ok(parts(r).includes("row"));
			assert.ok(!parts(r).some((p) => p.startsWith("row--")), "the bad token produced no part");
		}
	} finally {
		console.warn = orig;
	}
	assert.equal(warnings.filter((w) => w.includes("invalid state token")).length, 1);
});

test("cell() styles only the named column, wrapping its content", async () => {
	const el = await grid(
		[rowStatePlugin({ cell: (id) => (id === "subject" ? "font-weight:600" : undefined) })],
		[{ from: "x", subject: "hello" }],
		[
			{ id: "from", header: "From", accessorKey: "from" },
			{ id: "subject", header: "Subject", accessorKey: "subject" },
		],
	);
	const cells = [...el.renderRoot.querySelectorAll('[part="cell"]')];
	const subj = cells.find((c) => c.textContent.trim() === "hello");
	const from = cells.find((c) => c.textContent.trim() === "x");
	assert.ok(subj.querySelector('span[style*="font-weight"]'), "subject cell is wrapped + styled");
	assert.ok(!from.querySelector('span[style*="font-weight"]'), "from cell is untouched");
});

test("composes with treePlugin — expander and emphasis both on the first cell", async () => {
	const el = await grid(
		[treePlugin(), rowStatePlugin({ cell: (id) => (id === "name" ? "font-weight:600" : undefined) })],
		[{ name: "parent", children: [{ name: "child" }] }],
		[{ id: "name", header: "Name", accessorKey: "name" }],
	);
	const firstCell = el.renderRoot.querySelector('[part="cell"]');
	assert.ok(firstCell.querySelector("button"), "tree expander button present");
	assert.ok(firstCell.querySelector('span[style*="font-weight"]'), "rowstate emphasis present");
});

test("with no options the plugin is a no-op and rows keep the base part", async () => {
	const el = await grid([rowStatePlugin()], [{ subject: "a" }]);
	const rows = rowEls(el);
	assert.equal(rows.length, 1);
	assert.ok(parts(rows[0]).includes("row"));
});
