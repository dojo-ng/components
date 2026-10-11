// CB13: a selected row keeps its selection tint while the pointer is over it. `.vrow:hover`
// (a class plus a pseudo-class) used to outrank `.vrow--selected` (one class), so hovering a
// ticked row painted it with the plain hover tint and it looked unticked. Only a real browser
// has a pointer and computed backgrounds, so this is browser-only.
import { sendMouse, emulateMedia } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, settleFrames } from "./helpers.js";
import "../../packages/data-grid/dist/index.js";

// @tanstack/table-core reads process.env.NODE_ENV; the unbundled test page has no process.
if (!globalThis.process) globalThis.process = { env: { NODE_ENV: "production" } };

const COLUMNS = [{ id: "name", header: "Name" }];
const DATA = Array.from({ length: 4 }, (_, i) => ({ name: `Row ${i}` }));

async function selectedGrid() {
	const g = await mount(make("dj-data-grid", { columns: COLUMNS, data: DATA, height: "200px", selectionMode: "multiple" }));
	await g.updateComplete;
	await settleFrames();
	g.toggleAt(1);
	await g.updateComplete;
	await settleFrames();
	return g;
}

const rows = (g) => [...g.shadowRoot.querySelectorAll('[part~="row"]')];
const bg = (el) => getComputedStyle(el).backgroundColor;

async function hover(el) {
	const r = el.getBoundingClientRect();
	await sendMouse({ type: "move", position: [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)] });
	await settleFrames();
}

// Measure a row's background unhovered, then hovered. Row 0 is plain, row 1 is selected.
async function measure(g) {
	await sendMouse({ type: "move", position: [0, 0] });
	await settleFrames();
	const [plain, selected] = rows(g);
	assert(selected.getAttribute("part").split(" ").includes("row--selected"), "row 1 is selected");
	const selectedRest = bg(selected);
	await hover(plain);
	const plainHover = bg(plain);
	await hover(selected);
	const selectedHover = bg(selected);
	return { selectedRest, plainHover, selectedHover };
}

describe("dj-data-grid hover on a selected row", () => {
	afterEach(async () => {
		cleanup();
		await sendMouse({ type: "move", position: [0, 0] });
		await emulateMedia({ forcedColors: "none" });
	});

	it("keeps the selection tint under the pointer", async () => {
		const m = await measure(await selectedGrid());
		assert(m.selectedHover === m.selectedRest, `hovered selected row keeps its tint (rest ${m.selectedRest}, hovered ${m.selectedHover})`);
		assert(m.selectedHover !== m.plainHover, `hovered selected row differs from a hovered plain row (both ${m.plainHover})`);
	});

	it("keeps the system selection colors under the pointer in forced colors", async () => {
		await emulateMedia({ forcedColors: "active" });
		if (!matchMedia("(forced-colors: active)").matches) {
			console.log("forced-colors emulation not supported by this engine; skipping the assertion");
			return;
		}
		const m = await measure(await selectedGrid());
		assert(m.selectedHover === m.selectedRest, `hovered selected row keeps Highlight (rest ${m.selectedRest}, hovered ${m.selectedHover})`);
		assert(m.selectedHover !== m.plainHover, `hovered selected row differs from a hovered plain row (both ${m.plainHover})`);
	});
});
