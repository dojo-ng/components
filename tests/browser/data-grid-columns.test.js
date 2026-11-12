// data-grid columns spec GC1: the core column state in a real layout engine. Setting
// `columnState` orders and sizes the columns, and pinned cells stay put while the body scrolls
// sideways, in LTR and RTL.
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import "../../packages/data-grid/dist/index.js";

if (!globalThis.process) globalThis.process = { env: { NODE_ENV: "production" } };

const COLUMNS = Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, header: `Col ${i}`, width: "150px" }));
const DATA = Array.from({ length: 30 }, (_, r) => Object.fromEntries(COLUMNS.map((c, i) => [c.id, `r${r}c${i}`])));

async function grid(props = {}, dir = "ltr") {
	const g = make("dj-data-grid", { columns: COLUMNS, data: DATA, height: "300px", ...props });
	g.style.width = "500px";
	g.setAttribute("dir", dir);
	await mount(g);
	await settle(g);
	return g;
}
const settle = async (g) => { await g.updateComplete; await settleFrames(); await settleFrames(); };
const headerIds = (g) => [...g.shadowRoot.querySelectorAll('[role="columnheader"]')].map((h) => h.dataset.column);
const head = (g, id) => g.shadowRoot.querySelector(`.head [data-column="${id}"]`);
const bodyCell = (g, id) => g.shadowRoot.querySelector(`#r-0 [data-column="${id}"]`);
const scroller = (g) => g.shadowRoot.querySelector(".scroll");
const near = (a, b, msg) => assert(Math.abs(a - b) <= 1, `${msg}: ${a} vs ${b}`);

describe("dj-data-grid column state (GC1)", () => {
	afterEach(cleanup);

	it("columnState orders, hides, and sizes columns; header and body agree", async () => {
		const g = await grid();
		g.columnState = { order: ["c3", "c0", "c1", "c2", "c4", "c5", "c6", "c7"], sizing: { c3: 200 }, visibility: { c2: false } };
		await settle(g);
		const ids = headerIds(g);
		assertEqual(ids.slice(0, 3).join(), "c3,c0,c1", "order");
		assert(!ids.includes("c2"), "c2 hidden");
		near(head(g, "c3").getBoundingClientRect().width, 200, "resized header");
		near(bodyCell(g, "c3").getBoundingClientRect().width, 200, "resized body cell");
		for (const id of ids) {
			near(head(g, id).getBoundingClientRect().left, bodyCell(g, id).getBoundingClientRect().left, `${id} header lines up with its cells`);
		}
	});

	for (const dir of ["ltr", "rtl"]) {
		it(`pinned cells stay put while the body scrolls sideways (${dir})`, async () => {
			const g = await grid({}, dir);
			g.columnState = { pinning: { start: ["c0", "c1"], end: ["c7"] } };
			await settle(g);
			const sc = scroller(g);
			assert(sc.scrollWidth > sc.clientWidth + 100, "the body is wider than the grid");
			const before = Object.fromEntries(["c0", "c1", "c7", "c3"].map((id) => [id, bodyCell(g, id).getBoundingClientRect().left]));
			const headBefore = head(g, "c1").getBoundingClientRect().left;
			// Scroll toward the inline end: negative scrollLeft in RTL.
			sc.scrollLeft = dir === "rtl" ? -300 : 300;
			sc.dispatchEvent(new Event("scroll"));
			await settle(g);
			near(bodyCell(g, "c0").getBoundingClientRect().left, before.c0, "pinned start c0 stays");
			near(bodyCell(g, "c1").getBoundingClientRect().left, before.c1, "pinned start c1 stays");
			near(bodyCell(g, "c7").getBoundingClientRect().left, before.c7, "pinned end c7 stays");
			assert(Math.abs(bodyCell(g, "c3").getBoundingClientRect().left - before.c3) > 100, "an unpinned column moved");
			near(head(g, "c1").getBoundingClientRect().left, headBefore, "the pinned header stays too");
			near(head(g, "c3").getBoundingClientRect().left, bodyCell(g, "c3").getBoundingClientRect().left, "the scrolled header follows the body");
			// c1 sits right after c0 on the start side.
			const r0 = bodyCell(g, "c0").getBoundingClientRect(), r1 = bodyCell(g, "c1").getBoundingClientRect();
			if (dir === "ltr") near(r1.left, r0.right, "c1 follows c0");
			else near(r1.right, r0.left, "c1 follows c0 (rtl)");
		});
	}

	it("a pinned flexible column is measured, then pinned", async () => {
		const g = await grid({ columns: [{ id: "flex", header: "Flex" }, ...COLUMNS] });
		g.columnState = { pinning: { start: ["flex"], end: [] } };
		await settle(g);
		await settle(g);
		const h = head(g, "flex");
		assert(h.classList.contains("pin--start"), "pinned once measured");
		assert(h.getBoundingClientRect().width > 0, "has a width");
	});
});

describe("dj-data-grid sideways keyboard scroll (GC1)", () => {
	afterEach(cleanup);
	it("Left and Right scroll the body sideways when the columns overflow", async () => {
		const g = await grid();
		g.columnState = { pinning: { start: ["c0"], end: [] } };
		await settle(g);
		g.focus();
		const sc = scroller(g);
		const { sendKeys } = await import("@web/test-runner-commands");
		await sendKeys({ press: "ArrowRight" });
		await settle(g);
		assert(sc.scrollLeft > 0, "ArrowRight scrolled");
		const head = g.shadowRoot.querySelector(".headwrap");
		near(head.scrollLeft, sc.scrollLeft, "the header follows");
		await sendKeys({ press: "ArrowLeft" });
		await settle(g);
		assertEqual(sc.scrollLeft, 0, "ArrowLeft scrolled back");
	});
});

describe("dj-data-grid header keyboard reveal (GC1)", () => {
	afterEach(cleanup);
	for (const dir of ["ltr", "rtl"]) {
		it(`moving along the header row scrolls the header into view, clear of pinned columns (${dir})`, async () => {
			const g = await grid({}, dir);
			g.columnState = { pinning: { start: ["c0"], end: ["c7"] } };
			await settle(g);
			g.focus();
			const { sendKeys } = await import("@web/test-runner-commands");
			await sendKeys({ press: "ArrowUp" });
			const next = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
			for (let i = 0; i < 5; i++) await sendKeys({ press: next });
			await settle(g);
			const cell = g.shadowRoot.querySelector(".hcell--active");
			assertEqual(cell.dataset.column, "c5");
			const sc = scroller(g).getBoundingClientRect();
			const r = cell.getBoundingClientRect();
			const pinS = head(g, "c0").getBoundingClientRect(), pinE = head(g, "c7").getBoundingClientRect();
			assert(r.left >= sc.left - 1 && r.right <= sc.right + 1, "inside the grid");
			assert(r.right <= pinE.left + 1 || r.left >= pinE.right - 1, "not under the end pin");
			assert(r.right <= pinS.left + 1 || r.left >= pinS.right - 1, "not under the start pin");
		});
	}
});
