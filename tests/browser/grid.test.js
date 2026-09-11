// dj-grid, in a real browser: rendered header/cell semantics (role="grid", columnheader,
// aria-sort), sorting on a header click, and an axe pass on a populated grid.
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/grid/dist/index.js";

const COLUMNS = [
	{ id: "name", title: "Name", sortable: true },
	{ id: "value", title: "Value", sortable: true },
];
const ROWS = [
	{ name: "Charlie", value: 3 },
	{ name: "Alice", value: 1 },
	{ name: "Bob", value: 2 },
];

describe("dj-grid", () => {
	afterEach(cleanup);

	it("renders header and cell semantics for a populated grid", async () => {
		const el = await mount(make("dj-grid", { columns: COLUMNS, rows: ROWS }));
		await el.updateComplete;

		assert(el.shadowRoot.querySelector('table[role="grid"]'), "renders a grid table");
		const headers = el.shadowRoot.querySelectorAll('[role="columnheader"]');
		assertEqual(headers.length, 2, "one columnheader per column");
		assertEqual(headers[0].textContent.trim(), "Name", "the header names the column");
		const rows = el.shadowRoot.querySelectorAll("tbody tr");
		assertEqual(rows.length, 3, "one row per data row");
	});

	it("clicking a sortable header sorts the rows and emits dj-sort", async () => {
		const el = await mount(make("dj-grid", { columns: COLUMNS, rows: ROWS }));
		await el.updateComplete;
		let sorts = 0;
		el.addEventListener("dj-sort", () => sorts++);

		const nameHeader = [...el.shadowRoot.querySelectorAll('[role="columnheader"]')].find((h) => h.textContent.includes("Name"));
		nameHeader.click();
		await el.updateComplete;

		assertEqual(sorts, 1, "clicking a sortable header emits dj-sort");
		assertEqual(nameHeader.getAttribute("aria-sort"), "ascending", "the header reports ascending sort");
		const firstCell = el.shadowRoot.querySelector("tbody tr td");
		assertEqual(firstCell.textContent.trim(), "Alice", "rows sort alphabetically ascending on the first click");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-grid", { columns: COLUMNS, rows: ROWS }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
