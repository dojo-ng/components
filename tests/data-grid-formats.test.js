// data-grid-formats smokes (T2). Formatting runs per body cell, so — as in
// data-grid-plugins.test.js — give the scroll viewport a real offset size so the
// TanStack virtualizer renders body rows. Locale is pinned by setting lang on the
// grid element before it connects, so the LocaleController reads en-US at setup.
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { formatsPlugin } from "../packages/data-grid-formats/dist/index.js";
import "../packages/data-grid/dist/index.js";

const proto = globalThis.window.HTMLElement.prototype;
for (const [prop, val] of [["offsetHeight", 400], ["offsetWidth", 320]]) {
	Object.defineProperty(proto, prop, {
		configurable: true,
		get() { return this.classList?.contains("scroll") ? val : 0; },
	});
}

async function fmtGrid(columns, data, locale = "en-US") {
	const el = document.createElement("dj-data-grid");
	el.setAttribute("lang", locale);
	el.columns = columns;
	el.data = data;
	el.plugins = [formatsPlugin()];
	document.body.appendChild(el);
	await el.updateComplete;
	await settled(el);
	return el;
}
const cellText = (el) => [...el.renderRoot.querySelectorAll('[part="cell"]')].map((c) => c.textContent);

test("currency renders like $1,234.50 under en-US", async () => {
	const el = await fmtGrid(
		[{ id: "price", header: "Price", accessorKey: "price", format: { kind: "currency" } }],
		[{ price: 1234.5 }],
	);
	assert.equal(cellText(el)[0], "$1,234.50");
});

test("date is formatted through Intl (matches Intl.DateTimeFormat exactly)", async () => {
	const value = "2026-07-02";
	const el = await fmtGrid(
		[{ id: "when", header: "When", accessorKey: "when", format: { kind: "date" } }],
		[{ when: value }],
	);
	const expected = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
	assert.equal(cellText(el)[0], expected);
});

test("number and percent kinds go through Intl", async () => {
	const el = await fmtGrid(
		[
			{ id: "n", header: "N", accessorKey: "n", format: { kind: "number", options: { minimumFractionDigits: 1 } } },
			{ id: "p", header: "P", accessorKey: "p", format: { kind: "percent" } },
		],
		[{ n: 1234, p: 0.25 }],
	);
	const cells = cellText(el);
	assert.equal(cells[0], new Intl.NumberFormat("en-US", { minimumFractionDigits: 1 }).format(1234));
	assert.equal(cells[1], new Intl.NumberFormat("en-US", { style: "percent" }).format(0.25));
});

test("function-form format is applied with (value, row)", async () => {
	const el = await fmtGrid(
		[{ id: "name", header: "Name", accessorKey: "name", format: (v, row) => `#${v}:${row.rank}` }],
		[{ name: "foo", rank: 3 }],
	);
	assert.equal(cellText(el)[0], "#foo:3");
});

test("columns without a format are untouched (core default string)", async () => {
	const el = await fmtGrid(
		[
			{ id: "price", header: "Price", accessorKey: "price", format: { kind: "currency" } },
			{ id: "sku", header: "SKU", accessorKey: "sku" },
		],
		[{ price: 10, sku: "ABC-1" }],
	);
	const cells = cellText(el);
	assert.equal(cells[0], "$10.00");
	assert.equal(cells[1], "ABC-1", "unformatted column renders the raw value");
});

test("null/undefined values render as an empty string", async () => {
	const el = await fmtGrid(
		[{ id: "price", header: "Price", accessorKey: "price", format: { kind: "currency" } }],
		[{ price: null }, { price: undefined }],
	);
	const cells = cellText(el);
	assert.equal(cells[0], "");
	assert.equal(cells[1], "");
});

test("locale reactivity: changing the document lang re-formats cells", async () => {
	// The playground's locale switcher sets document.documentElement.lang; the plugin's
	// LocaleController (attached in setup) must re-render with the new locale. This only works
	// when the plugin's setup actually ran — the upgrade-order race silently disabled it.
	const prev = document.documentElement.getAttribute("lang");
	document.documentElement.setAttribute("lang", "en-US");
	const el = document.createElement("dj-data-grid");
	el.columns = [{ id: "amount", header: "Amount", format: { kind: "currency", currency: "USD" } }];
	el.data = [{ amount: 1234.5 }];
	document.body.appendChild(el);
	el.plugins = [formatsPlugin()]; // deliberately the racing assignment order
	await settled(el);
	// Intl inserts no-break spaces (U+00A0/U+202F) around currency symbols; normalize for literals.
	const cell = () => el.renderRoot.querySelector('[part="cell"]').textContent.replace(/[\u00a0\u202f]/g, " ");
	assert.equal(cell(), "$1,234.50", "en-US currency");
	document.documentElement.setAttribute("lang", "de-DE");
	await new Promise((r) => setTimeout(r, 0)); // let the MutationObserver deliver
	await settled(el);
	assert.equal(cell(), "1.234,50 $", "de-DE formatting (USD in German locale) after a runtime locale change");
	if (prev === null) document.documentElement.removeAttribute("lang");
	else document.documentElement.setAttribute("lang", prev);
	el.remove();
});
