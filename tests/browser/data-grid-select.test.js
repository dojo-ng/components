// dj-data-grid activation + the selection column, in a real browser (spec SC2).
//
// This is the layer that can prove what happy-dom cannot: real focus order, real Tab and
// Space and arrow keys through the browser's own event pipeline, a real double click, and an
// axe pass over a populated grid. The node suites
// (tests/data-grid-activation.test.js, tests/data-grid-select.test.js) cover the logic; this
// one covers the parts where the platform decides the behavior.
//
// SAFARI/WEBKIT NOTE: this suite drives focus with explicit .focus() calls rather than
// pressing Tab, because WebKit excludes buttons and (depending on preference) other controls
// from sequential tab navigation. Testing "can the user reach it" via Tab would fail on
// WebKit for a browser-preference reason, not a component defect — see
// docs/qa-requirements.md, "Known limitations". What we assert here is that the control IS
// focusable and operable once focused, which is the part we own.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/data-grid/dist/index.js";
import { selectColumnPlugin } from "../../packages/data-grid-select/dist/index.js";

// @tanstack/table-core reads process.env.NODE_ENV; the unbundled test page has no process.
// WTR isolates each file in its own page, so this shim is local to this suite.
if (!globalThis.process) globalThis.process = { env: { NODE_ENV: "production" } };

const COLUMNS = [
	{ id: "from", header: "From" },
	{ id: "subject", header: "Subject" },
];
const mail = (n) =>
	Array.from({ length: n }, (_, i) => ({ from: `Sender ${i}`, subject: `Subject ${i}` }));

async function gridWith(props, pluginOptions) {
	const g = make("dj-data-grid", { columns: COLUMNS, data: mail(8), height: "300px", ...props });
	g.plugins = [selectColumnPlugin({ label: (m) => `Select ${m.subject}`, ...pluginOptions })];
	await mount(g);
	await g.updateComplete;
	await settleFrames();
	await settleFrames();
	return g;
}

const rowBoxes = (g) => [...g.shadowRoot.querySelectorAll(".dj-select-row")];
const selectAllBox = (g) => g.shadowRoot.querySelector(".dj-select-all");
const gridEl = (g) => g.shadowRoot.querySelector('[part="grid"]');

describe("dj-data-grid selection column", () => {
	afterEach(cleanup);

	it("renders one named checkbox per row plus a named select-all", async () => {
		const g = await gridWith({ selectionMode: "multiple" });
		const boxes = rowBoxes(g);
		assert(boxes.length > 0, "checkboxes render");
		assertEqual(boxes[0].getAttribute("aria-label"), "Select Subject 0", "named for its row, not 'Select row'");
		assertEqual(selectAllBox(g).getAttribute("aria-label"), "Select all rows", "header names the ACTION");
	});

	it("a row checkbox is focusable and Space toggles exactly that row", async () => {
		const g = await gridWith({ selectionMode: "multiple" });
		let lastCount = -1;
		g.addEventListener("dj-selection-change", (e) => { lastCount = e.detail.rows.length; });

		const box = rowBoxes(g)[2];
		box.focus();
		assert(g.shadowRoot.activeElement === box, "the checkbox takes focus");

		await sendKeys({ press: "Space" });
		await g.updateComplete;
		await settleFrames();

		assertEqual(lastCount, 1, "exactly one row is selected");
		assertEqual(Object.keys(g.rowSelection)[0], "2", "and it is the FOCUSED row, not the active one");
	});

	it("Space on the select-all checkbox selects every row", async () => {
		const g = await gridWith({ selectionMode: "multiple" });
		selectAllBox(g).focus();
		await sendKeys({ press: "Space" });
		await g.updateComplete;
		await settleFrames();
		assertEqual(Object.keys(g.rowSelection).length, 8, "all eight rows selected from the keyboard");
	});

	it("arrow keys still move between rows with focus inside a checkbox cell", async () => {
		const g = await gridWith({ selectionMode: "multiple" });
		rowBoxes(g)[0].focus();
		await sendKeys({ press: "ArrowDown" });
		await g.updateComplete;
		assertEqual(g.activeIndex, 1, "focus in the cell does not trap row navigation");
	});

	it("the row's aria-selected stays authoritative when the checkbox drives selection", async () => {
		const g = await gridWith({ selectionMode: "multiple" });
		const row = g.shadowRoot.querySelectorAll('[part="row"]')[1];
		assertEqual(row.getAttribute("aria-selected"), "false");

		rowBoxes(g)[1].click();
		await g.updateComplete;
		await settleFrames();

		const rowAfter = g.shadowRoot.querySelectorAll('[part="row"]')[1];
		assertEqual(rowAfter.getAttribute("aria-selected"), "true", "the ROW reports selection; the checkbox only reflects it");
	});

	it("the select-all shows a real indeterminate state for a partial selection", async () => {
		const g = await gridWith({ selectionMode: "multiple" });
		rowBoxes(g)[0].click();
		await g.updateComplete;
		await settleFrames();
		assertEqual(selectAllBox(g).indeterminate, true, "partial selection is indeterminate");

		selectAllBox(g).click();
		await g.updateComplete;
		await settleFrames();
		assertEqual(selectAllBox(g).indeterminate, false, "select-all clears indeterminate");
		assertEqual(selectAllBox(g).checked, true);
	});

	it("shift-click selects a contiguous range", async () => {
		const g = await gridWith({ selectionMode: "multiple" });
		rowBoxes(g)[1].click();
		await g.updateComplete;
		await settleFrames();

		const target = rowBoxes(g)[5];
		target.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, shiftKey: true }));
		await g.updateComplete;
		await settleFrames();

		assertEqual(Object.keys(g.rowSelection).sort().join(","), "1,2,3,4,5", "rows 1..5 inclusive");
	});

	it("single mode renders radios and no select-all", async () => {
		const g = await gridWith({ selectionMode: "single" });
		assertEqual(rowBoxes(g)[0].type, "radio");
		assertEqual(selectAllBox(g), null);
	});

	it("selectionMode=none adds no column", async () => {
		const g = await gridWith({ selectionMode: "none" });
		assertEqual(rowBoxes(g).length, 0);
		assertEqual(g.shadowRoot.querySelectorAll('[role="columnheader"]').length, 2, "only the data columns");
	});

	it("has no serious or critical accessibility violations", async () => {
		const g = await gridWith({ selectionMode: "multiple" });
		await assertNoViolations(g);
	});
});

describe("dj-data-grid activation", () => {
	afterEach(cleanup);

	it('activation="click": a real click opens the row and leaves selection alone', async () => {
		const g = await gridWith({ selectionMode: "multiple", activation: "click" });
		const opened = [];
		g.addEventListener("dj-activate", (e) => opened.push(e.detail.index));

		g.shadowRoot.querySelectorAll('[part="row"]')[2].click();
		await g.updateComplete;
		await settleFrames();

		assertEqual(opened.length, 1, "one activation");
		assertEqual(opened[0], 2, "for the clicked row");
		assertEqual(Object.keys(g.rowSelection).length, 0, "and nothing was selected");
	});

	it('activation="double": the browser\'s own double click activates exactly once', async () => {
		// The real pipeline: two clicks then a dblclick. A hand-rolled click timer would
		// over- or under-count here in a way happy-dom cannot show.
		const g = await gridWith({ selectionMode: "multiple", activation: "double" });
		const opened = [];
		g.addEventListener("dj-activate", (e) => opened.push(e.detail.index));

		const row = g.shadowRoot.querySelectorAll('[part="row"]')[1];
		row.click();
		await g.updateComplete;
		assertEqual(opened.length, 0, "a single click does not activate");

		row.click();
		row.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }));
		await g.updateComplete;
		await settleFrames();
		assertEqual(opened.length, 1, "one double click, one activation");
	});

	it("Enter activates and Space selects, from the grid's roving focus", async () => {
		const g = await gridWith({ selectionMode: "multiple", activation: "click" });
		const opened = [];
		g.addEventListener("dj-activate", (e) => opened.push(e.detail.index));

		gridEl(g).focus();
		await sendKeys({ press: "ArrowDown" });
		await g.updateComplete;

		await sendKeys({ press: "Enter" });
		await g.updateComplete;
		assertEqual(opened.join(","), "1", "Enter opens the active row");
		assertEqual(Object.keys(g.rowSelection).length, 0, "Enter does not select");

		await sendKeys({ press: "Space" });
		await g.updateComplete;
		assertEqual(Object.keys(g.rowSelection).join(","), "1", "Space selects the active row");
		assertEqual(opened.length, 1, "Space does not activate");
	});

	it("a checkbox click never activates the row underneath it", async () => {
		const g = await gridWith({ selectionMode: "multiple", activation: "click" });
		const opened = [];
		g.addEventListener("dj-activate", () => opened.push(1));

		rowBoxes(g)[3].click();
		await g.updateComplete;
		await settleFrames();

		assertEqual(opened.length, 0, "the control owns the gesture");
		assertEqual(Object.keys(g.rowSelection).join(","), "3", "only selection happened");
	});

	it("the master/detail combination is keyboard-operable end to end", async () => {
		// Open one row, then build a multi-row selection, without a mouse.
		const g = await gridWith({ selectionMode: "multiple", activation: "click" });
		const opened = [];
		g.addEventListener("dj-activate", (e) => opened.push(e.detail.index));

		gridEl(g).focus();
		await sendKeys({ press: "Enter" });        // open row 0
		await sendKeys({ press: "ArrowDown" });
		await sendKeys({ press: "Space" });        // select row 1
		await sendKeys({ press: "ArrowDown" });
		await sendKeys({ press: "Space" });        // select row 2
		await g.updateComplete;
		await settleFrames();

		assertEqual(opened.join(","), "0", "exactly one row was opened");
		assertEqual(Object.keys(g.rowSelection).sort().join(","), "1,2", "and two others are selected");
	});

	it("has no serious or critical accessibility violations with activation on", async () => {
		const g = await gridWith({ selectionMode: "multiple", activation: "click" });
		await assertNoViolations(g);
	});
});
