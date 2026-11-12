// CB35: the grid is ONE element that both holds the keyboard focus (role="grid", tabindex=0) and
// scrolls, with the header rows as a sticky strip inside it. axe's scrollable-region-focusable
// rule then passes on grids that overflow, and the layout keeps its old contract: `height` is the
// rows' viewport, rows start below the header, and the keyboard keeps the active row clear of it.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/data-grid/dist/index.js";

if (!globalThis.process) globalThis.process = { env: { NODE_ENV: "production" } };

const ONE_COL = [{ id: "a", header: "Alpha" }];
const WIDE = Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, header: `Col ${i}`, width: "150px" }));
const rowsFor = (cols, n) => Array.from({ length: n }, (_, r) => Object.fromEntries(cols.map((c, i) => [c.id, `r${r}c${i}`])));

async function grid({ columns = ONE_COL, rows = 20, width = "400px", ...props } = {}) {
	const g = make("dj-data-grid", { columns, data: rowsFor(columns, rows), height: "300px", ...props });
	g.style.width = width;
	await mount(g);
	await settle(g);
	return g;
}
const settle = async (g) => { await g.updateComplete; await settleFrames(); await settleFrames(); };
const sc = (g) => g.shadowRoot.querySelector(".grid");
const headBottom = (g) => g.shadowRoot.querySelector(".headwrap").getBoundingClientRect().bottom;
const rowRect = (g, i) => g.shadowRoot.querySelector(`#r-${i}`).getBoundingClientRect();
const center = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)]; };
const near = (a, b, msg, tol = 1) => assert(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

describe("dj-data-grid scroll container (CB35)", () => {
	// No real mouse input in this file: Firefox shares the mouse between the pages WTR runs side
	// by side, so a click here lands in the middle of another file's drag. The click-focus check
	// lives in data-grid-columns-plugin.test.js, whose drags run in sequence with it.
	afterEach(cleanup);

	it("passes axe when the rows overflow", async () => {
		const g = await grid();
		assert(sc(g).scrollHeight > sc(g).clientHeight, "rows overflow");
		await assertNoViolations(g);
	});

	it("passes axe when rows and columns overflow, with pinned columns and selection", async () => {
		const g = await grid({ columns: WIDE, selectionMode: "multiple" });
		g.columnState = { pinning: { start: ["c0"], end: ["c7"] } };
		await settle(g);
		assert(sc(g).scrollWidth > sc(g).clientWidth, "columns overflow");
		await assertNoViolations(g);
		sc(g).scrollTop = 200;
		sc(g).scrollLeft = 200;
		await settle(g);
		await assertNoViolations(g);
	});

	it("the scroller is the one tab stop, and it is the role=grid element", async () => {
		const before = make("input", { ariaLabel: "before" });
		const after = make("input", { ariaLabel: "after" });
		document.body.append(before);
		const g = await grid();
		document.body.append(after);
		before.focus();
		await sendKeys({ press: "Tab" });
		const active = g.shadowRoot.activeElement;
		assert(active === sc(g), `Tab lands on the scroller: ${active?.className}`);
		assertEqual(active.getAttribute("role"), "grid");
		assert(active.scrollHeight > active.clientHeight, "and it is the element that scrolls");
		await sendKeys({ press: "Tab" });
		assertEqual(document.activeElement, after, "the next Tab leaves the grid");
	});

	it("`height` stays the rows' viewport, and rows start below the header", async () => {
		const g = await grid();
		const head = g.shadowRoot.querySelector(".headwrap");
		near(sc(g).clientHeight - head.offsetHeight, 300, "rows viewport");
		near(rowRect(g, 0).top, headBottom(g), "row 0 under the header");
	});

	it("the header stays put while the rows scroll, above pinned cells", async () => {
		const g = await grid({ columns: WIDE });
		g.columnState = { pinning: { start: ["c0"], end: [] } };
		await settle(g);
		const top = g.shadowRoot.querySelector(".head").getBoundingClientRect().top;
		sc(g).scrollTop = 250;
		await settle(g);
		near(g.shadowRoot.querySelector(".head").getBoundingClientRect().top, top, "sticky header");
		const pinned = g.shadowRoot.querySelector('.head [data-column="c0"]');
		const hit = g.shadowRoot.elementFromPoint(...center(pinned));
		assert(pinned.contains(hit), `the pinned header cell is on top: ${hit?.className}`);
		const plain = g.shadowRoot.querySelector('.head [data-column="c1"]');
		const hit2 = g.shadowRoot.elementFromPoint(...center(plain));
		assert(plain.contains(hit2), `a plain header cell is on top: ${hit2?.className}`);
	});

	it("the header follows the body sideways", async () => {
		const g = await grid({ columns: WIDE });
		sc(g).scrollLeft = 220;
		await settle(g);
		const h = g.shadowRoot.querySelector('.head [data-column="c3"]').getBoundingClientRect();
		const b = g.shadowRoot.querySelector('#r-0 [data-column="c3"]').getBoundingClientRect();
		near(h.left, b.left, "header and body columns line up");
	});

	it("the keyboard keeps the active row clear of the header", async () => {
		const g = await grid({ rows: 60 });
		g.focus();
		await sendKeys({ press: "End" });
		await settle(g);
		for (let i = 0; i < 12; i++) await sendKeys({ press: "ArrowUp" });
		await settle(g);
		const i = g.activeIndex;
		assertEqual(i, 47);
		assert(rowRect(g, i).top >= headBottom(g) - 0.5, `active row ${i} below the header: ${rowRect(g, i).top} vs ${headBottom(g)}`);
		const box = sc(g).getBoundingClientRect();
		assert(rowRect(g, i).bottom <= box.top + sc(g).clientTop + sc(g).clientHeight + 0.5, "and inside the viewport");
		await sendKeys({ press: "PageUp" });
		await settle(g);
		assert(rowRect(g, g.activeIndex).top >= headBottom(g) - 0.5, "PageUp: clear of the header");
	});

	it("PageDown moves by the rows that fit under the header", async () => {
		const g = await grid({ rows: 60 });
		g.focus();
		await sendKeys({ press: "PageDown" });
		await settle(g);
		assertEqual(g.activeIndex, Math.floor(300 / 36), "300px / 36px rows");
	});

	it("scrollToIndex start and getVisibleRange agree with what is on screen", async () => {
		const g = await grid({ rows: 60 });
		g.scrollToIndex(10, { align: "start" });
		await settle(g);
		near(rowRect(g, 10).top, headBottom(g), "row 10 right under the header");
		const { first, last } = g.getVisibleRange();
		assertEqual(first, 10, "first visible");
		// 300px of rows from row 10: rows 10..18, the last one partly in view.
		assertEqual(last, 10 + Math.ceil(300 / 36) - 1, "last visible");
	});
});
