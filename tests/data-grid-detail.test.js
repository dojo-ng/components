// data-grid-detail smokes (T10). Detail content renders per body row, so — as in
// data-grid-plugins.test.js — give the scroll viewport a real offset size so the TanStack
// virtualizer renders body rows. Real measured-height scrolling is Bill's browser check (T12);
// here the core's measureElement falls back to the row-height estimate (headless DOM reports
// zero-size rects), which keeps the virtualizer stable while asserting structure and behavior.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { html } from "lit";
import { detailPlugin } from "../packages/data-grid-detail/dist/index.js";
import "../packages/data-grid/dist/index.js";

const proto = globalThis.window.HTMLElement.prototype;
for (const [prop, val] of [["offsetHeight", 400], ["offsetWidth", 320]]) {
	Object.defineProperty(proto, prop, {
		configurable: true,
		get() { return this.classList?.contains("scroll") ? val : 0; },
	});
}

const COLUMNS = [{ id: "a", header: "A", accessorKey: "a" }, { id: "b", header: "B", accessorKey: "b" }];
const DATA = [{ a: "a0", b: "b0" }, { a: "a1", b: "b1" }, { a: "a2", b: "b2" }];

async function detailGrid() {
	return mount("dj-data-grid", {
		columns: COLUMNS,
		data: DATA,
		plugins: [detailPlugin({ render: (row) => html`<em class="det">D-${row.original.a}</em>` })],
	});
}

test("detail: expander column injected, wrappers carry data-index (measured path on)", async () => {
	const el = await detailGrid();
	const headers = [...el.renderRoot.querySelectorAll('[role="columnheader"]')];
	assert.equal(headers.length, 3, "__detail + A + B");
	const wraps = [...el.renderRoot.querySelectorAll(".vwrap")];
	assert.equal(wraps.length, DATA.length);
	assert.equal(wraps[0].getAttribute("data-index"), "0");
	const expanders = el.renderRoot.querySelectorAll(".vrow button[aria-expanded]");
	assert.equal(expanders.length, DATA.length, "one expander per row");
});

test("detail: expanding shows the panel, collapsing removes it, dj-expand-change fires", async () => {
	const el = await detailGrid();
	const events = [];
	el.addEventListener("dj-expand-change", (e) => events.push(e.detail));
	const expander = el.renderRoot.querySelector(".vrow button[aria-expanded]");
	expander.click();
	await settled(el);
	const det = el.renderRoot.querySelector('[part="detail"] .det');
	assert.ok(det, "detail panel rendered");
	assert.equal(det.textContent, "D-a0");
	assert.equal(el.renderRoot.querySelector(".vdetail").getAttribute("role"), "row");
	assert.equal(events.length, 1);
	assert.equal(events[0].expanded, true);
	el.renderRoot.querySelector(".vrow button[aria-expanded]").click();
	await settled(el);
	assert.equal(el.renderRoot.querySelector('[part="detail"]'), null, "collapsed removes the panel");
});

test("detail: grids without a renderDetail plugin keep the fixed-height row path", async () => {
	const el = await mount("dj-data-grid", { columns: COLUMNS, data: DATA, plugins: [] });
	assert.equal(el.renderRoot.querySelector(".vwrap"), null, "no measured wrappers");
	const row = el.renderRoot.querySelector(".vrow");
	assert.match(row.getAttribute("style") ?? "", /translateY/, "rows position themselves directly");
});

test("detail: ArrowRight opens and ArrowLeft closes the active row's detail (keyboard parity)", async () => {
	const el = await detailGrid();
	const gridEl = el.renderRoot.querySelector('[role="grid"]');
	const key = (k) => gridEl.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, composed: true }));
	key("ArrowRight");
	await settled(el);
	assert.equal(el.renderRoot.querySelector('[part="detail"] .det')?.textContent, "D-a0", "ArrowRight expanded row 0");
	key("ArrowLeft");
	await settled(el);
	assert.equal(el.renderRoot.querySelector('[part="detail"]'), null, "ArrowLeft collapsed it");
});
