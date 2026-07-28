// dj-range-change in a real browser (viewport reporting spec VP1/VP2).
//
// The whole contract is already covered by tests/data-grid-viewport.test.js, which stubs the scroll
// element's offsetHeight so happy-dom produces a genuine moving window. This suite exists because
// that stub is still a fake: row heights there fall back to the `rowHeight` estimate, while a real
// browser MEASURES them. So this re-checks the same claims against true layout — the window moves
// and stays bounded, `rendered` matches the DOM, the overscan claim holds, the end-reached recipe
// fires at the bottom, and a renderDetail plugin's genuinely variable-height rows still report a
// contiguous window. If the two suites ever disagree, the browser is right.
import { html } from "lit";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import "../../packages/data-grid/dist/index.js";
import { detailPlugin } from "../../packages/data-grid-detail/dist/index.js";

// @tanstack/table-core reads `process.env.NODE_ENV`; the unbundled test-runner page has no
// `process`. WTR isolates each file in its own page, so this shim is local to this suite.
if (!globalThis.process) globalThis.process = { env: { NODE_ENV: "production" } };

const COLUMNS = [
	{ id: "id", header: "ID" },
	{ id: "name", header: "Name" },
];
const bigData = (n) => Array.from({ length: n }, (_, i) => ({ id: i, name: `Row ${i}` }));

/** Mount a grid and record every dj-range-change from a listener on the HOST, which also proves the
 *  event bubbles out of the shadow root. Settles twice: the virtualizer needs a measured scroll box
 *  before it reports a window. */
async function gridWithRanges(props) {
	const grid = await mount(make("dj-data-grid", { columns: COLUMNS, ...props }));
	const seen = [];
	grid.addEventListener("dj-range-change", (e) => seen.push(e.detail));
	await grid.updateComplete;
	await settleFrames();
	await settleFrames();
	return { grid, seen };
}

/** The row-model indices actually in the DOM, from each row's `r-<index>` id. */
function domIndices(grid) {
	return [...grid.shadowRoot.querySelectorAll('[part="row"]')]
		.map((r) => Number(r.id.replace(/^r-/, "")))
		.sort((a, b) => a - b);
}

/** Scroll and let the virtualizer react. */
async function scrollTo(grid, top) {
	const scroll = grid.shadowRoot.querySelector(".scroll");
	scroll.scrollTop = top;
	await settleFrames();
	await settleFrames();
}

/** Produce a fresh event for the TOP window. Whether the mount-time emit lands before or after a
 *  test's listener attaches depends on when the ResizeObserver first measures, so don't depend on
 *  it: scroll away and back, which is guaranteed to move the window and emit. */
async function reemitTopWindow(grid) {
	await scrollTo(grid, 1200);
	await scrollTo(grid, 0);
}

describe("dj-data-grid dj-range-change", () => {
	afterEach(cleanup);

	it("reports a real window at the top of the list, bounded and starting at row 0", async () => {
		const { grid, seen } = await gridWithRanges({ data: bigData(5000), rowHeight: 30, height: "200px" });
		await reemitTopWindow(grid);
		assert(seen.length > 0, "at least one range event fired once layout settled");
		const last = seen[seen.length - 1];
		assertEqual(last.count, 5000, "count is the full row count");
		assertEqual(last.start, 0, "the initial window starts at row 0");
		assert(last.end > 0 && last.end < 80, `end is a bounded window, not the last row (got ${last.end})`);
		assertEqual(last.rendered.length, last.end - last.start + 1, "rendered spans start..end inclusive");
		// `rendered` must describe what is really in the DOM — that is the whole point of the event.
		assertEqual(last.rendered.join(","), domIndices(grid).join(","), "rendered matches the DOM rows");
	});

	it("advances start/end as the user scrolls, and rendered keeps matching the DOM", async () => {
		const { grid, seen } = await gridWithRanges({ data: bigData(5000), rowHeight: 30, height: "200px" });
		await reemitTopWindow(grid);
		const first = seen[seen.length - 1];
		const before = seen.length;

		await scrollTo(grid, 90000); // ~row 3000

		assert(seen.length > before, "scrolling produced at least one more range event");
		const after = seen[seen.length - 1];
		assert(after.start > first.start, `start advanced (${first.start} -> ${after.start})`);
		assert(after.end > first.end, `end advanced (${first.end} -> ${after.end})`);
		assertEqual(after.count, 5000, "count is unchanged by scrolling");
		assertEqual(after.rendered.join(","), domIndices(grid).join(","), "rendered still matches the DOM rows");
		// Contiguous window.
		for (let i = 1; i < after.rendered.length; i++) {
			assertEqual(after.rendered[i], after.rendered[i - 1] + 1, "rendered indices are contiguous");
		}
	});

	it("reports more rows than fit the viewport (the overscan caveat is real)", async () => {
		// 200px at 30px/row shows ~7 rows; overscan: 8 means the reported window is wider. This is why
		// the detail says `rendered`, not "visible" — a consumer treating it as the visible set would
		// be wrong by up to 8 rows at each end.
		const { grid, seen } = await gridWithRanges({ data: bigData(5000), rowHeight: 30, height: "200px" });
		await reemitTopWindow(grid);
		const last = seen[seen.length - 1];
		const fits = Math.ceil(200 / 30);
		assert(
			last.rendered.length > fits,
			`the window (${last.rendered.length}) exceeds what fits the viewport (~${fits}), so it includes overscan`,
		);
	});

	it("supports the documented end-reached recipe at the bottom of the list", async () => {
		// The exact derivation the README gives consumers: end >= count - 1.
		const { grid, seen } = await gridWithRanges({ data: bigData(500), rowHeight: 30, height: "200px" });
		let endReached = 0;
		grid.addEventListener("dj-range-change", (e) => {
			if (e.detail.end >= e.detail.count - 1) endReached++;
		});
		await reemitTopWindow(grid);
		assert(seen[seen.length - 1].end < 499, "not at the end while at the top");

		const scroll = grid.shadowRoot.querySelector(".scroll");
		await scrollTo(grid, scroll.scrollHeight); // all the way down

		assert(endReached > 0, "scrolling to the bottom satisfied end >= count - 1");
		assertEqual(seen[seen.length - 1].end, 499, "the last window ends on the final row");
	});

	it("does not re-emit when a re-render leaves the window alone", async () => {
		const { grid, seen } = await gridWithRanges({ data: bigData(500), rowHeight: 30, height: "200px", selectionMode: "multiple" });
		await reemitTopWindow(grid);
		const before = seen.length;
		// Selection and active-row changes re-render but do not move the window.
		grid.toggleAt(1);
		await grid.updateComplete;
		await settleFrames();
		grid.activeIndex = 2;
		await grid.updateComplete;
		await settleFrames();
		assertEqual(seen.length, before, "no extra range events from re-renders that don't move the window");
	});

	it("reports a contiguous window with a renderDetail plugin's variable-height rows", async () => {
		const { grid, seen } = await gridWithRanges({
			data: bigData(500),
			rowHeight: 30,
			height: "240px",
			plugins: [detailPlugin({ render: (row) => html`<em class="det">Detail for ${row.original.name}</em>` })],
		});
		// Expand a row through its expander button so the rendered set really does contain a
		// variable-height wrapper that the browser measures for real.
		const expander = grid.shadowRoot.querySelector(".vrow button[aria-expanded]");
		assert(expander, "the detail plugin injected its expander column");
		expander.click();
		await grid.updateComplete;
		await settleFrames();
		await scrollTo(grid, 900);

		const last = seen[seen.length - 1];
		assertEqual(last.count, 500, "count unaffected by the detail plugin");
		for (let i = 1; i < last.rendered.length; i++) {
			assertEqual(last.rendered[i], last.rendered[i - 1] + 1, "rendered stays contiguous with measured rows");
		}
		assertEqual(last.rendered.join(","), domIndices(grid).join(","), "rendered matches the rows in the DOM");
	});
});
