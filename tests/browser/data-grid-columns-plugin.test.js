// data-grid columns spec GC2–GC4: the columns plugin in a real browser, with real pointer and
// key input (sendMouse/sendKeys). Resize (drag, double-click fit, min/max, LTR and RTL),
// reorder (pointer and keyboard grab, its announcements, the pinned-group rule), and every
// column menu action from the keyboard alone, checked through `columnState`.
import { sendKeys, sendMouse, resetMouse } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/data-grid/dist/index.js";
import { columnsPlugin } from "../../packages/data-grid-columns/dist/index.js";

if (!globalThis.process) globalThis.process = { env: { NODE_ENV: "production" } };

const COLUMNS = [
	{ id: "a", header: "Alpha", width: "120px" },
	{ id: "b", header: "Bravo", width: "120px", minWidth: 80, maxWidth: 200 },
	{ id: "c", header: "Charlie", width: "120px" },
	{ id: "d", header: "Delta", width: "120px" },
];
const DATA = Array.from({ length: 20 }, (_, r) => ({ a: `a${r}`, b: `b${r}`, c: r === 3 ? "a much longer value in this one cell" : `c${r}`, d: `d${r}` }));

async function grid({ dir = "ltr", columns = COLUMNS, options, rows = DATA.length } = {}) {
	// axe flags any grid whose rows overflow (scrollable-region-focusable): the keyboard reaches
	// the rows through the focused grid element, which axe cannot see. The axe checks below use a
	// grid that fits, so they audit what this plugin adds.
	const g = make("dj-data-grid", { columns, data: DATA.slice(0, rows), height: "300px" });
	g.style.width = "640px";
	g.setAttribute("dir", dir);
	g.plugins = [columnsPlugin(options)];
	await mount(g);
	await settle(g);
	return g;
}
const settle = async (g) => { await g.updateComplete; await settleFrames(); await settleFrames(); };
const head = (g, id) => g.shadowRoot.querySelector(`.head [data-column="${id}"]`);
const headerIds = (g) => [...g.shadowRoot.querySelectorAll('[role="columnheader"]')].map((h) => h.dataset.column);
const width = (g, id) => Math.round(head(g, id).getBoundingClientRect().width);
const center = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)]; };
const events = (g) => { const list = []; g.addEventListener("dj-column-state-change", (e) => list.push(e.detail)); return list; };
const live = (g) => g.shadowRoot.querySelector(".djc-live").textContent;

async function drag(from, to, steps = 4) {
	await sendMouse({ type: "move", position: from });
	await sendMouse({ type: "down" });
	for (let i = 1; i <= steps; i++) {
		await sendMouse({ type: "move", position: [Math.round(from[0] + ((to[0] - from[0]) * i) / steps), Math.round(from[1] + ((to[1] - from[1]) * i) / steps)] });
	}
	await sendMouse({ type: "up" });
}
/** Focus the grid and walk the keyboard position onto header `index`. */
async function toHeader(g, index) {
	g.focus();
	await sendKeys({ press: "ArrowUp" });
	await sendKeys({ press: "Home" });
	const rtl = g.getAttribute("dir") === "rtl";
	for (let i = 0; i < index; i++) await sendKeys({ press: rtl ? "ArrowLeft" : "ArrowRight" });
	await settle(g);
}

describe("dj-data-grid columns plugin: resize (GC2)", () => {
	afterEach(async () => { await resetMouse(); cleanup(); });

	for (const dir of ["ltr", "rtl"]) {
		it(`dragging the handle resizes with a live preview and one event (${dir})`, async () => {
			const g = await grid({ dir });
			const seen = events(g);
			const handle = head(g, "a").querySelector('[part="resize-handle"]');
			const [x, y] = center(handle);
			const outward = dir === "rtl" ? -1 : 1;
			await sendMouse({ type: "move", position: [x, y] });
			await sendMouse({ type: "down" });
			await sendMouse({ type: "move", position: [x + 30 * outward, y] });
			await sendMouse({ type: "move", position: [x + 60 * outward, y] });
			await settle(g);
			assertEqual(width(g, "a"), 180, "live preview while dragging");
			assertEqual(seen.length, 0, "no event until the drag ends");
			await sendMouse({ type: "up" });
			await settle(g);
			assertEqual(g.columnState.sizing.a, 180);
			assertEqual(seen.length, 1, "one event at the end");
			assertEqual(seen[0].sizing.a, 180);
			assertEqual(g.sorting.length, 0, "a resize does not sort");
		});
	}

	it("respects minWidth and maxWidth", async () => {
		const g = await grid();
		const [x, y] = center(head(g, "b").querySelector('[part="resize-handle"]'));
		await drag([x, y], [x + 300, y]);
		await settle(g);
		assertEqual(g.columnState.sizing.b, 200, "clamped to maxWidth");
		const [x2, y2] = center(head(g, "b").querySelector('[part="resize-handle"]'));
		await drag([x2, y2], [x2 - 300, y2]);
		await settle(g);
		assertEqual(g.columnState.sizing.b, 80, "clamped to minWidth");
	});

	for (const dir of ["ltr", "rtl"]) {
		it(`double-click fits the widest rendered cell (${dir})`, async () => {
			const g = await grid({ dir });
			const handle = head(g, "c").querySelector('[part="resize-handle"]');
			await sendMouse({ type: "move", position: center(handle) });
			await sendMouse({ type: "click", position: center(handle) });
			await sendMouse({ type: "click", position: center(handle) });
			handle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }));
			await settle(g);
			const w = g.columnState.sizing.c;
			assert(w > 150, `fit to the long cell: ${w}`);
			const cell = g.shadowRoot.querySelector('#r-3 [data-column="c"]');
			assert(cell.scrollWidth <= cell.clientWidth + 1, "the long value now fits");
		});
	}
});

describe("dj-data-grid columns plugin: reorder (GC3)", () => {
	afterEach(async () => { await resetMouse(); cleanup(); });

	it("dragging a header moves the column, with a drop indicator, and does not sort", async () => {
		const g = await grid();
		const seen = events(g);
		const from = center(head(g, "a"));
		const target = head(g, "c").getBoundingClientRect();
		await sendMouse({ type: "move", position: from });
		await sendMouse({ type: "down" });
		await sendMouse({ type: "move", position: [from[0] + 20, from[1]] });
		await sendMouse({ type: "move", position: [Math.round(target.right - 10), from[1]] });
		await settle(g);
		const drop = g.shadowRoot.querySelector('[part="drop-indicator"]');
		assert(drop && !drop.hidden, "drop indicator shown");
		await sendMouse({ type: "up" });
		await settle(g);
		assertEqual(headerIds(g).join(), "b,c,a,d");
		assertEqual(seen.length, 1);
		assert(drop.hidden, "indicator hidden after the drop");
		assertEqual(g.sorting.length, 0, "the drop's click did not sort");
	});

	it("keyboard: Space grabs, arrows move, Space drops, announced", async () => {
		const g = await grid();
		await toHeader(g, 0);
		await sendKeys({ press: "Space" });
		assert(/Grabbed Alpha/.test(live(g)), `grab announced: ${live(g)}`);
		await sendKeys({ press: "ArrowRight" });
		await sendKeys({ press: "ArrowRight" });
		assert(/Alpha moved to position 3/.test(live(g)), `move announced: ${live(g)}`);
		await sendKeys({ press: "Space" });
		await settle(g);
		assert(/Alpha dropped/.test(live(g)), `drop announced: ${live(g)}`);
		assertEqual(headerIds(g).join(), "b,c,a,d");
		assertEqual(g.sorting.length, 0, "Space did not sort");
		const active = g.shadowRoot.querySelector(".hcell--active");
		assertEqual(active?.dataset.column, "a", "the keyboard position follows the moved column");
	});

	it("keyboard: Escape cancels the grab", async () => {
		const g = await grid();
		await toHeader(g, 1);
		await sendKeys({ press: "Space" });
		await sendKeys({ press: "ArrowLeft" });
		await sendKeys({ press: "Escape" });
		await settle(g);
		assert(/Cancelled moving Bravo/.test(live(g)), live(g));
		assertEqual(headerIds(g).join(), "a,b,c,d");
	});

	it("keyboard in RTL: Left moves toward the end", async () => {
		const g = await grid({ dir: "rtl" });
		await toHeader(g, 0);
		await sendKeys({ press: "Space" });
		await sendKeys({ press: "ArrowLeft" });
		await sendKeys({ press: "Space" });
		await settle(g);
		assertEqual(headerIds(g).join(), "b,a,c,d");
	});

	it("pinned columns move only within their group", async () => {
		const g = await grid();
		g.columnState = { pinning: { start: ["a", "b"], end: [] } };
		await settle(g);
		// Pointer: drag a pinned column far into the unpinned area; it stays in its group.
		const from = center(head(g, "a"));
		const far = head(g, "d").getBoundingClientRect();
		await drag(from, [Math.round(far.right - 5), from[1]]);
		await settle(g);
		assertEqual(headerIds(g).join(), "b,a,c,d", "a moved to the end of the start group only");
		// Keyboard: c (unpinned) cannot move into the pinned group.
		await toHeader(g, 2);
		await sendKeys({ press: "Space" });
		await sendKeys({ press: "ArrowLeft" });
		await sendKeys({ press: "ArrowLeft" });
		await sendKeys({ press: "Space" });
		await settle(g);
		assertEqual(headerIds(g).join(), "b,a,c,d", "c stays first of the unpinned columns");
	});
});

describe("dj-data-grid columns plugin: menu and chooser (GC4)", () => {
	afterEach(async () => { await resetMouse(); cleanup(); });

	const menuList = (g, id) => head(g, id).querySelector("dj-list");
	/** Open column `index`'s menu from the keyboard and choose `label`. */
	async function choose(g, index, label) {
		await toHeader(g, index);
		await sendKeys({ press: "Alt+ArrowDown" });
		await settle(g);
		const id = headerIds(g)[index];
		const list = menuList(g, id);
		// The list's arrow keys skip dividers and disabled items.
		const opts = list.options.filter((o) => !o.divider && !o.disabled);
		const at = opts.findIndex((o) => o.label === label);
		assert(at >= 0, `menu has ${label} enabled: ${opts.map((o) => o.label)}`);
		for (let i = 0; i < at; i++) await sendKeys({ press: "ArrowDown" });
		await sendKeys({ press: "Enter" });
		await settle(g);
		await settle(g);
	}

	it("every action works from the keyboard alone", async () => {
		const g = await grid();
		await choose(g, 0, "Wider");
		assertEqual(g.columnState.sizing.a, 140, "Wider");
		await choose(g, 0, "Narrower");
		assertEqual(g.columnState.sizing.a, 120, "Narrower");
		await choose(g, 0, "Move right");
		assertEqual(headerIds(g).join(), "b,a,c,d", "Move right");
		await choose(g, 1, "Move left");
		assertEqual(headerIds(g).join(), "a,b,c,d", "Move left");
		await choose(g, 2, "Pin left");
		assertEqual(g.columnState.pinning.start.join(), "c", "Pin left");
		assertEqual(headerIds(g)[0], "c");
		await choose(g, 0, "Unpin");
		assertEqual(g.columnState.pinning.start.length, 0, "Unpin");
		await choose(g, 3, "Pin right");
		assertEqual(g.columnState.pinning.end.join(), "d", "Pin right");
		const second = headerIds(g)[1];
		await choose(g, 1, "Hide");
		assertEqual(g.columnState.visibility[second], false, "Hide");
		assert(!headerIds(g).includes(second));
		// Focus comes back to the grid after each choice.
		const active = g.shadowRoot.activeElement;
		assert(active?.classList.contains("grid"), `focus back on the grid: ${active?.className}`);
	});

	it("the chooser shows and hides columns, and Reset restores the declared layout", async () => {
		const g = await grid({ rows: 4 });
		g.columnState = { order: ["d", "c", "b", "a"], sizing: { a: 150 } };
		await settle(g);
		await choose(g, 0, "Columns…");
		const dialog = g.shadowRoot.querySelector("dj-dialog");
		assert(dialog.open, "chooser open");
		const boxes = [...dialog.querySelectorAll("dj-checkbox")];
		assertEqual(boxes.map((b) => b.textContent).join(), "Delta,Charlie,Bravo,Alpha");
		boxes[1].shadowRoot.querySelector("input").click();
		await settle(g);
		assertEqual(g.columnState.visibility.c, false, "unticking hides");
		boxes[1].shadowRoot.querySelector("input").click();
		await settle(g);
		assertEqual(g.columnState.visibility.c, undefined, "ticking shows");
		const reset = [...dialog.querySelectorAll("dj-button")].find((b) => b.textContent === "Reset");
		reset.click();
		await settle(g);
		assertEqual(headerIds(g).join(), "a,b,c,d", "Reset: declared order");
		assertEqual(Object.keys(g.columnState.sizing).length, 0, "Reset: no widths");
		await assertNoViolations(g);
	});

	it("the last visible column cannot be hidden", async () => {
		const g = await grid();
		g.columnState = { visibility: { b: false, c: false, d: false } };
		await settle(g);
		await toHeader(g, 0);
		await sendKeys({ press: "Alt+ArrowDown" });
		await settle(g);
		const hide = menuList(g, "a").options.find((o) => o.value === "hide");
		assert(hide.disabled, "Hide is disabled");
		await sendKeys({ press: "Escape" });
		await choose(g, 0, "Columns…");
		const boxes = [...g.shadowRoot.querySelectorAll("dj-dialog dj-checkbox")];
		assert(boxes.find((b) => b.textContent === "Alpha").disabled, "its chooser box is locked");
	});

	it("menu button: hidden until hover or focus; always visible on request", async () => {
		const g = await grid();
		const btn = head(g, "a").querySelector('[part="column-menu-button"]');
		assertEqual(getComputedStyle(btn).opacity, "0", "hidden at rest");
		await sendMouse({ type: "move", position: center(head(g, "a")) });
		await settle(g);
		assertEqual(getComputedStyle(btn).opacity, "1", "shown on hover");
		await resetMouse();
		await toHeader(g, 0);
		assertEqual(getComputedStyle(btn).opacity, "1", "shown on keyboard focus");
		cleanup();
		const g2 = await grid({ options: { menuButton: "always" } });
		assertEqual(getComputedStyle(head(g2, "a").querySelector('[part="column-menu-button"]')).opacity, "1");
	});

	it("passes axe with the controls in place", async () => {
		const g = await grid({ rows: 4 });
		g.columnState = { pinning: { start: ["a"], end: ["d"] } };
		await settle(g);
		await assertNoViolations(g);
	});
});
