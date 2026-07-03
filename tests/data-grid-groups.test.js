// data-grid-groups smokes (T8). Give the scroll viewport a real offset size so the virtualizer
// renders body rows (group rows + revealed leaves).
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { groupsPlugin } from "../packages/data-grid-groups/dist/index.js";
import { treePlugin } from "../packages/data-grid-tree/dist/index.js";
import "../packages/data-grid/dist/index.js";

const proto = globalThis.window.HTMLElement.prototype;
for (const [prop, val] of [["offsetHeight", 400], ["offsetWidth", 320]]) {
	Object.defineProperty(proto, prop, {
		configurable: true,
		get() { return this.classList?.contains("scroll") ? val : 0; },
	});
}

const cells = (el) => [...el.renderRoot.querySelectorAll('[part="cell"]')];
const rows = (el) => el.renderRoot.querySelectorAll('[part="row"]').length;
const COLS = [{ id: "dept", header: "Dept", accessorKey: "dept" }, { id: "amt", header: "Amount", accessorKey: "amt" }];
const DATA = [
	{ dept: "Eng", amt: 100 }, { dept: "Eng", amt: 200 },
	{ dept: "Sales", amt: 50 }, { dept: "Sales", amt: 70 }, { dept: "Sales", amt: 30 },
];
const groupGrid = (aggregates) => mount("dj-data-grid", { columns: COLS, data: DATA, plugins: [groupsPlugin({ by: "dept", aggregates })] });

test("grouping by a column yields group rows with leaf counts", async () => {
	const el = await groupGrid({ amt: "sum" });
	assert.equal(rows(el), 2, "two groups, collapsed");
	assert.ok(cells(el)[0].textContent.includes("Eng (2)"), "Eng group shows its leaf count");
	assert.ok(cells(el)[2].textContent.includes("Sales (3)"), "Sales group shows its leaf count");
});

test("sum aggregate is computed per group", async () => {
	const el = await groupGrid({ amt: "sum" });
	assert.equal(cells(el)[1].textContent, "300", "Eng sum = 100 + 200");
	assert.equal(cells(el)[3].textContent, "150", "Sales sum = 50 + 70 + 30");
});

test("mean aggregate is computed per group", async () => {
	const el = await groupGrid({ amt: "mean" });
	assert.equal(cells(el)[1].textContent, "150", "Eng mean = 300 / 2");
	assert.equal(cells(el)[3].textContent, "50", "Sales mean = 150 / 3");
});

test("expanding a group reveals its leaf rows", async () => {
	const el = await groupGrid({ amt: "sum" });
	el.renderRoot.querySelector('[part="expander"]').click(); // Eng
	await settled(el);
	assert.equal(rows(el), 4, "Eng group + its 2 leaves + Sales group");
});

test("a grand-totals row shows the overall aggregate", async () => {
	const el = await groupGrid({ amt: "sum" });
	const totals = el.renderRoot.querySelector('[part="chrome-bottom"] [part="totals"]');
	assert.ok(totals, "totals row renders");
	assert.ok(totals.textContent.includes("Amount: 450"), "overall sum = 100+200+50+70+30");
});

test("using treePlugin and groupsPlugin together throws", () => {
	const fakeCtx = { host: { plugins: [{ name: "tree" }, { name: "groups" }] } };
	assert.throws(() => groupsPlugin({ by: "dept" }).setup(fakeCtx), /not both/);
	// And the two really are mutually exclusive plugin names.
	assert.equal(treePlugin().name, "tree");
});
