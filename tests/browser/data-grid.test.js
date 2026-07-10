// dj-data-grid, in a real browser: the things only real layout can prove — TanStack Virtual
// keeps the rendered row count bounded while scrolling 5,000 rows, plus sort, selection,
// keyboard row navigation, the edit plugin's focus behavior, and an axe pass on a populated
// grid. Virtualization needs a real scroll box (happy-dom has no layout), so this is a
// browser-only suite.
import { sendKeys } from "@web/test-runner-commands";
import { deepActiveElement } from "../../packages/dojo-element/dist/index.js";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/data-grid/dist/index.js";
import { editPlugin } from "../../packages/data-grid-edit/dist/index.js";

// @tanstack/table-core reads `process.env.NODE_ENV` (a bundler defines this in a real app;
// the unbundled test-runner page does not). WTR isolates each test file in its own page, so
// this shim is local to the data-grid suite. "production" takes TanStack's non-dev path.
if (!globalThis.process) globalThis.process = { env: { NODE_ENV: "production" } };

const COLUMNS = [
	{ id: "id", header: "ID" },
	{ id: "name", header: "Name" },
	{ id: "value", header: "Value", sortable: true },
];
const bigData = (n) => Array.from({ length: n }, (_, i) => ({ id: i, name: `Row ${i}`, value: i }));

function gridWith(props) {
	const g = make("dj-data-grid", { columns: COLUMNS, ...props });
	return g;
}

describe("dj-data-grid", () => {
	afterEach(cleanup);

	it("virtualizes: the DOM row count stays bounded while scrolling 5,000 rows", async () => {
		const grid = await mount(gridWith({ data: bigData(5000), rowHeight: 30, height: "200px" }));
		await grid.updateComplete;
		await settleFrames();
		await settleFrames();

		const rendered = () => grid.shadowRoot.querySelectorAll('[part="row"]').length;
		const initial = rendered();
		assert(initial > 0 && initial < 80, `only a window of rows renders, not all 5,000 (got ${initial})`);
		assert(grid.shadowRoot.querySelector("#r-0"), "row 0 is in the initial window");

		const scroll = grid.shadowRoot.querySelector(".scroll");
		scroll.scrollTop = 90000; // ~row 3000
		await settleFrames();
		await settleFrames();

		assert(rendered() < 80, `still a bounded window after scrolling (got ${rendered()})`);
		assert(!grid.shadowRoot.querySelector("#r-0"), "row 0 was recycled out of the window after scrolling");
		assert(grid.shadowRoot.querySelector('[id^="r-29"], [id^="r-30"], [id^="r-31"]'), "a far-down row is now rendered");
	});

	it("sorts when a sortable header is clicked", async () => {
		const grid = await mount(gridWith({ data: [{ id: 1, name: "a", value: 3 }, { id: 2, name: "b", value: 1 }, { id: 3, name: "c", value: 2 }] }));
		await grid.updateComplete;
		await settleFrames();
		let sorts = 0;
		grid.addEventListener("dj-sort", () => sorts++);

		const valueHeader = [...grid.shadowRoot.querySelectorAll('[role="columnheader"]')].find((h) => h.textContent.includes("Value"));
		valueHeader.click();
		await grid.updateComplete;
		await settleFrames();

		assert(sorts >= 1, "clicking a sortable header emits dj-sort");
		// TanStack sorts numeric columns descending on the first click (its sortDescFirst default).
		assertEqual(valueHeader.getAttribute("aria-sort"), "descending", "the header reports descending sort");
		const firstRowCells = grid.shadowRoot.querySelector('[part="row"]').querySelectorAll('[part="cell"]');
		assertEqual(firstRowCells[2].textContent.trim(), "3", "the largest value sorts to the top");
	});

	it("selects a row on click and emits dj-selection-change", async () => {
		const grid = await mount(gridWith({ data: bigData(10), selectionMode: "multiple", height: "300px" }));
		await grid.updateComplete;
		await settleFrames();
		let detail;
		grid.addEventListener("dj-selection-change", (e) => { detail = e.detail; });

		const row = grid.shadowRoot.querySelector('[part="row"]');
		row.click();
		await grid.updateComplete;
		assert(detail && detail.rows.length === 1, "clicking a row selects exactly one row");
		assertEqual(row.getAttribute("aria-selected"), "true", "the selected row is marked aria-selected");
	});

	it("moves the active row with the keyboard and toggles selection with Space", async () => {
		const grid = await mount(gridWith({ data: bigData(10), selectionMode: "multiple", height: "300px" }));
		await grid.updateComplete;
		await settleFrames();
		let selections = 0;
		grid.addEventListener("dj-selection-change", () => selections++);

		grid.shadowRoot.querySelector('[part="grid"]').focus();
		await sendKeys({ press: "ArrowDown" });
		await grid.updateComplete;
		assertEqual(grid.shadowRoot.querySelector('[part="grid"]').getAttribute("aria-activedescendant"), "r-1", "ArrowDown moves the active row to index 1");

		await sendKeys({ press: "Space" });
		await grid.updateComplete;
		assert(selections >= 1, "Space toggles selection on the active row");
	});

	it("the edit plugin moves focus into an editor on Enter and commits", async () => {
		const cols = [{ id: "name", header: "Name", editable: true }, { id: "value", header: "Value" }];
		const grid = make("dj-data-grid", { columns: cols, data: bigData(5), height: "300px" });
		grid.plugins = [editPlugin()];
		await mount(grid);
		await grid.updateComplete;
		await settleFrames();

		let commit;
		grid.addEventListener("dj-cell-commit", (e) => { commit = e.detail; });

		grid.shadowRoot.querySelector('[part="grid"]').focus();
		await sendKeys({ press: "Enter" }); // edit plugin starts editing the active row's first editable column
		await grid.updateComplete;
		await settleFrames();

		const editor = grid.shadowRoot.querySelector("dj-text-input");
		assert(editor, "an inline editor is rendered on Enter");
		assert(editor.contains(deepActiveElement()) || deepActiveElement()?.tagName === "INPUT", "focus moves into the editor");

		await sendKeys({ press: "Enter" }); // commit
		await grid.updateComplete;
		assert(commit && commit.columnId === "name", "committing emits dj-cell-commit for the edited column");
	});

	it("has no serious or critical accessibility violations", async () => {
		const grid = await mount(gridWith({ data: bigData(8), selectionMode: "multiple", height: "300px" }));
		await grid.updateComplete;
		await settleFrames();
		await assertNoViolations(grid);
	});
});
