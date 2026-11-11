// dj-data-grid keyboard and accessibility fixes (grid-a11y-fixes-spec.md):
//  GA1 / CB18: keys typed in a filter input reach the input, not the grid.
//  GA2 / CB19: sortable headers work from the keyboard (APG sortable table), aria-sort is
//              ascending/descending/absent, the glyph is hidden, aria-colcount/aria-colindex.
//  GA3 / CB7:  the sticky header's z-index stays inside the grid (`isolation: isolate`).
// Real keystrokes (sendKeys) because the bugs are about what the browser does with a key the
// grid does or does not preventDefault, which happy-dom cannot show.
import { sendKeys } from "@web/test-runner-commands";
import { deepActiveElement } from "../../packages/dojo-element/dist/index.js";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/data-grid/dist/index.js";
import { filterPlugin } from "../../packages/data-grid-filter/dist/index.js";
import { selectColumnPlugin } from "../../packages/data-grid-select/dist/index.js";

// @tanstack/table-core reads process.env.NODE_ENV; the unbundled test page has no process.
if (!globalThis.process) globalThis.process = { env: { NODE_ENV: "production" } };

const COLUMNS = [
	{ id: "id", header: "ID", sortable: false },
	{ id: "name", header: "Name", filter: "text" },
	{ id: "value", header: "Value" },
];
// Every name contains "ab cd", so typing it into the Name filter keeps all rows.
const DATA = Array.from({ length: 10 }, (_, i) => ({ id: i, name: `ab cd ${i}`, value: (i * 7) % 10 }));

async function grid(props = {}, plugins = []) {
	const g = make("dj-data-grid", { columns: COLUMNS, data: DATA, height: "300px", ...props });
	g.plugins = plugins;
	await mount(g);
	await g.updateComplete;
	await settleFrames();
	await settleFrames();
	return g;
}
const gridEl = (g) => g.shadowRoot.querySelector('[part="grid"]');
const headers = (g) => [...g.shadowRoot.querySelectorAll('[role="columnheader"]')];
const settle = async (g) => { await g.updateComplete; await settleFrames(); };

describe("dj-data-grid keyboard: filter inputs (GA1, CB18)", () => {
	afterEach(cleanup);

	it("Space, Home, End and the arrows typed in a filter input edit the input, not the grid", async () => {
		const g = await grid({}, [filterPlugin({ quick: false })]);
		g.shadowRoot.querySelector("dj-text-input").focus();
		await settle(g);
		const input = deepActiveElement();
		assertEqual(input?.localName, "input", "the filter's native input has focus");

		await sendKeys({ type: "ab" });
		await sendKeys({ press: "Space" });
		await sendKeys({ type: "cd" });
		assertEqual(input.value, "ab cd", "Space reached the input");

		// Home/End caret moves differ by platform (macOS Firefox/WebKit use Cmd+Left), so for those
		// the test checks the bug itself: nothing preventDefaults the key on its way out.
		const prevented = [];
		const spy = (e) => { if (e.defaultPrevented) prevented.push(e.key); };
		document.addEventListener("keydown", spy);
		await sendKeys({ press: "ArrowLeft" });
		assertEqual(input.selectionStart, 4, "ArrowLeft moved the caret");
		await sendKeys({ press: "ArrowLeft" });
		await sendKeys({ press: "ArrowRight" });
		assertEqual(input.selectionStart, 4, "ArrowRight moved the caret");
		for (const key of ["Home", "End", "ArrowDown", "ArrowUp", "PageDown"]) await sendKeys({ press: key });
		document.removeEventListener("keydown", spy);
		await settle(g);
		assertEqual(prevented.join(), "", "no key was preventDefaulted");
		assertEqual(g.activeIndex, 0, "the active row did not move");
		assertEqual(deepActiveElement(), input, "focus stayed in the input");
		assertEqual(input.value, "ab cd", "the value is intact");
	});
});

describe("dj-data-grid keyboard: sortable headers (GA2, CB19)", () => {
	afterEach(cleanup);

	it("sortable headers hold a non-tabbable button; a non-sortable one does not; the glyph is hidden", async () => {
		const g = await grid();
		const [id, name, value] = headers(g);
		assert(!id.querySelector("button"), "a sortable:false column gets no button");
		for (const h of [name, value]) {
			const btn = h.querySelector('button[part="sort-button"]');
			assert(btn, "a sortable column's header holds a sort button");
			assertEqual(btn.getAttribute("tabindex"), "-1", "header buttons are not tab stops");
			assertEqual(h.querySelector(".sortind").getAttribute("aria-hidden"), "true", "the glyph is aria-hidden");
			assertEqual(h.getAttribute("aria-sort"), null, "an unsorted header has no aria-sort");
		}
		assertEqual(gridEl(g).getAttribute("aria-colcount"), "3", "aria-colcount on the grid");
		assertEqual(headers(g).map((h) => h.getAttribute("aria-colindex")).join(), "1,2,3", "aria-colindex on headers");
		const cells = g.shadowRoot.querySelector("#r-0").querySelectorAll('[role="gridcell"]');
		assertEqual([...cells].map((c) => c.getAttribute("aria-colindex")).join(), "1,2,3", "aria-colindex on body cells");
	});

	it("ArrowUp from row 0 reaches the headers; Left/Right move; Enter and Space sort; ArrowDown returns", async () => {
		const g = await grid();
		let sorts = 0;
		g.addEventListener("dj-sort", () => sorts++);
		gridEl(g).focus();
		const active = () => gridEl(g).getAttribute("aria-activedescendant");

		await sendKeys({ press: "ArrowUp" });
		await settle(g);
		assertEqual(active(), "h-0", "ArrowUp from row 0 puts the position on the first header");
		assert(headers(g)[0].classList.contains("hcell--active"), "the active header is marked");

		await sendKeys({ press: "ArrowRight" });
		await settle(g);
		assertEqual(active(), "h-1", "ArrowRight moves to the next header");
		await sendKeys({ press: "ArrowRight" });
		await sendKeys({ press: "ArrowRight" });
		await settle(g);
		assertEqual(active(), "h-2", "ArrowRight stops at the last header");
		await sendKeys({ press: "ArrowLeft" });
		await settle(g);
		assertEqual(active(), "h-1", "ArrowLeft moves back");

		await sendKeys({ press: "Enter" });
		await settle(g);
		assertEqual(sorts, 1, "Enter sorts");
		assertEqual(headers(g)[1].getAttribute("aria-sort"), "ascending", "Name sorts ascending first");
		await sendKeys({ press: "Space" });
		await settle(g);
		assertEqual(sorts, 2, "Space sorts");
		assertEqual(headers(g)[1].getAttribute("aria-sort"), "descending", "Space flips to descending");
		assertEqual(g.shadowRoot.querySelector("#r-0").querySelectorAll('[role="gridcell"]')[1].textContent.trim(), "ab cd 9", "rows follow the sort");

		await sendKeys({ press: "ArrowLeft" });
		await sendKeys({ press: "Enter" });
		await settle(g);
		assertEqual(sorts, 2, "Enter on a sortable:false header does nothing");

		await sendKeys({ press: "ArrowDown" });
		await settle(g);
		assertEqual(active(), "r-0", "ArrowDown returns to row 0");
		assertEqual(g.activeIndex, 0, "the active row is 0");
		await sendKeys({ press: "ArrowDown" });
		await settle(g);
		assertEqual(g.activeIndex, 1, "row navigation works again");
		assertEqual(deepActiveElement(), gridEl(g), "the grid kept focus throughout");
	});

	it("the third sort toggle clears aria-sort", async () => {
		const g = await grid();
		const name = headers(g)[1];
		name.click(); await settle(g);
		name.click(); await settle(g);
		assertEqual(name.getAttribute("aria-sort"), "descending", "second click is descending");
		name.click(); await settle(g);
		assertEqual(name.getAttribute("aria-sort"), null, "third click removes the sort and aria-sort");
	});

	it("a row click leaves header mode", async () => {
		const g = await grid();
		gridEl(g).focus();
		await sendKeys({ press: "ArrowUp" });
		await settle(g);
		g.shadowRoot.querySelector("#r-2").click();
		await settle(g);
		assertEqual(gridEl(g).getAttribute("aria-activedescendant"), "r-2", "the clicked row is active");
	});

	it("RTL mirrors Left and Right on the header row", async () => {
		const g = make("dj-data-grid", { columns: COLUMNS, data: DATA, height: "300px" });
		g.setAttribute("dir", "rtl");
		await mount(g);
		await settle(g);
		gridEl(g).focus();
		await sendKeys({ press: "ArrowUp" });
		await sendKeys({ press: "ArrowLeft" });
		await settle(g);
		assertEqual(gridEl(g).getAttribute("aria-activedescendant"), "h-1", "ArrowLeft moves forward in RTL");
	});

	it("the select-all checkbox is not inside a button", async () => {
		const g = await grid({ selectionMode: "multiple" }, [selectColumnPlugin()]);
		const box = g.shadowRoot.querySelector(".dj-select-all");
		assert(box, "select-all renders");
		assert(!box.closest("button"), "select-all is not nested in a sort button");
	});

	it("has no serious or critical accessibility violations with a sorted column and header focus", async () => {
		const g = await grid({ selectionMode: "multiple" }, [selectColumnPlugin(), filterPlugin({ quick: false })]);
		headers(g)[2].click();
		gridEl(g).focus();
		await sendKeys({ press: "ArrowUp" });
		await settle(g);
		await assertNoViolations(g);
	});
});

describe("dj-data-grid stacking (GA3, CB7)", () => {
	afterEach(cleanup);

	// A later sibling with `position: relative` and no z-index, pulled up over the sticky header.
	async function overlap(hostCss) {
		const wrap = make("div");
		const g = make("dj-data-grid", { columns: COLUMNS, data: DATA, height: "200px" });
		const panel = make("div");
		panel.style.cssText = "position:relative;height:40px;background:rgb(200,0,0)";
		wrap.append(g, panel);
		await mount(wrap);
		await settle(g);
		panel.style.marginTop = `-${g.getBoundingClientRect().height}px`;
		if (hostCss) {
			const s = document.createElement("style");
			s.textContent = hostCss;
			g.shadowRoot.append(s);
			await settleFrames();
		}
		const head = g.shadowRoot.querySelector('[part="head"]').getBoundingClientRect();
		const p = panel.getBoundingClientRect();
		assert(p.top <= head.top + 2 && p.bottom >= head.bottom - 2, "the panel covers the header");
		return { panel, hit: document.elementFromPoint(head.left + head.width / 2, head.top + head.height / 2) };
	}

	it("a later sibling with z-index:auto renders above the sticky header", async () => {
		const { panel, hit } = await overlap();
		assert(hit === panel, `the page's later sibling is on top (got ${hit?.localName})`);
	});

	it("control: without isolation the header's z-index leaks and wins", async () => {
		const { panel, hit } = await overlap(":host { isolation: auto !important; }");
		assert(hit !== panel, "with isolation removed the header paints over the sibling (the CB7 bug)");
	});
});
