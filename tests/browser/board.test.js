// dj-board, in a real browser: it groups records into lanes and renders cards, and clicking a
// card emits dj-card-click; plus axe on a populated board. (Drag-to-move is pointer/dnd-heavy
// and controlled by the app; the click + render + a11y are the reliable browser checks here.)
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/board/dist/index.js";

const LANES = [{ value: "todo", label: "To Do" }, { value: "done", label: "Done" }];
const DATA = [
	{ id: "1", title: "Task A", status: "todo" },
	{ id: "2", title: "Task B", status: "todo" },
	{ id: "3", title: "Task C", status: "done" },
];

function build() {
	return make("dj-board", { label: "Work", lanes: LANES, data: DATA, groupBy: "status" });
}

describe("dj-board", () => {
	afterEach(cleanup);

	it("groups records into lanes and renders a card per record", async () => {
		const el = await mount(build());
		await el.updateComplete;
		const cards = el.shadowRoot.querySelectorAll('[part="card"]');
		assertEqual(cards.length, 3, "one card per record");
	});

	it("clicking a card emits dj-card-click", async () => {
		const el = await mount(build());
		await el.updateComplete;
		let detail;
		el.addEventListener("dj-card-click", (e) => { detail = e.detail; });
		// The click handler sits on the card body inside the card element.
		el.shadowRoot.querySelector('[part="card"] .card-content').click();
		await el.updateComplete;
		assert(detail && detail.card && String(detail.key) === "1", "dj-card-click carries the card and its key");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(build());
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
