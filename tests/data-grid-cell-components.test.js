// data-grid-cell-components smokes (T3). Cell renderers run per body cell, so give the
// scroll viewport a real offset size to make the TanStack virtualizer render body rows.
import { mount } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { html } from "lit";
import { cellComponentsPlugin, actionButton, checkmarkCell } from "../packages/data-grid-cell-components/dist/index.js";
import "../packages/data-grid/dist/index.js";

const proto = globalThis.window.HTMLElement.prototype;
for (const [prop, val] of [["offsetHeight", 400], ["offsetWidth", 320]]) {
	Object.defineProperty(proto, prop, {
		configurable: true,
		get() { return this.classList?.contains("scroll") ? val : 0; },
	});
}

const cells = (el) => [...el.renderRoot.querySelectorAll('[part="cell"]')];

test("a column's render() draws arbitrary Lit content into its cells", async () => {
	const el = await mount("dj-data-grid", {
		columns: [{ id: "name", header: "Name", accessorKey: "name", render: (v) => html`<span class="custom">C:${v}</span>` }],
		data: [{ name: "foo" }],
		plugins: [cellComponentsPlugin()],
	});
	assert.equal(el.renderRoot.querySelector('[part="cell"] .custom')?.textContent, "C:foo");
});

test("actionButton emits dj-cell-action { action, row } and stops row selection", async () => {
	const rows = [{ name: "Ann" }, { name: "Bo" }];
	const el = await mount("dj-data-grid", {
		selectionMode: "single",
		columns: [
			{ id: "name", header: "Name", accessorKey: "name" },
			{ id: "act", header: "", render: actionButton("Edit", "edit") },
		],
		data: rows,
		plugins: [cellComponentsPlugin()],
	});
	let evt;
	el.addEventListener("dj-cell-action", (e) => { evt = e; });
	// The action cell of the SECOND row (index 1, second column).
	const btn = cells(el)[3].querySelector("dj-button");
	assert.ok(btn, "a dj-button renders in the action cell");
	btn.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
	assert.ok(evt, "dj-cell-action fired");
	assert.equal(evt.detail.action, "edit");
	assert.equal(evt.detail.row, rows[1], "detail.row is the exact row object");
	assert.deepEqual(el.rowSelection, {}, "the click did not select the row (propagation stopped)");
});

test("checkmarkCell renders ✓ on truthy and nothing visible on falsy, with a text alternative", async () => {
	const el = await mount("dj-data-grid", {
		columns: [{ id: "active", header: "Active", render: checkmarkCell() }],
		data: [{ active: true }, { active: false }],
		plugins: [cellComponentsPlugin()],
	});
	const [truthy, falsy] = cells(el);
	assert.equal(truthy.querySelector('[aria-hidden="true"]')?.textContent, "✓", "truthy shows the checkmark glyph");
	assert.ok(truthy.textContent.includes("Yes"), "truthy carries the 'Yes' text alternative");
	assert.equal(falsy.querySelector('[aria-hidden="true"]'), null, "falsy shows no checkmark glyph");
	assert.ok(falsy.textContent.includes("No"), "falsy carries the 'No' text alternative");
});
