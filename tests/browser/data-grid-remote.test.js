// dj-data-grid remote rows (data-grid-remote-rows-spec.md RR11), in a real browser: dragging the
// scrollbar to the bottom of a 100,000-row grid. The happy-dom suite (tests/data-grid-remote.test.js)
// covers the request logic with stubbed sizes; this one checks it against real layout, a real
// 3.6 million px scroll height, and real scroll events.
//
// WTR cannot drag a native scrollbar thumb, so the drag is simulated the way a thumb drag reaches
// the page: the grid scroller's scrollTop moving to its maximum in steps, one per animation frame, each step
// far more than a screen. The grid sees the same jump-and-hold it would see from a real thumb.
import { mount, cleanup, make, assert, assertEqual, nextFrame, settleFrames } from "./helpers.js";
import "../../packages/data-grid/dist/index.js";

// @tanstack/table-core reads `process.env.NODE_ENV`; the unbundled test-runner page has no
// `process`. WTR isolates each file in its own page, so this shim is local to this suite.
if (!globalThis.process) globalThis.process = { env: { NODE_ENV: "production" } };

const COLUMNS = [{ id: "from", header: "From" }, { id: "subject", header: "Subject" }];
const TOTAL = 100000;
const DELAY = 150; // the fake source's answer time
const rowsFrom = (start, end) =>
	Array.from({ length: end - start + 1 }, (_, k) => ({ id: "m" + (start + k), from: "Sender " + (start + k), subject: "Message " + (start + k) }));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const realRows = (grid) => [...grid.renderRoot.querySelectorAll('[part~="row"]')].filter((r) => !r.getAttribute("part").split(" ").includes("row--placeholder"));

describe("dj-data-grid remote rows", () => {
	afterEach(cleanup);

	it("dragging the scrollbar to the bottom of 100,000 rows asks once and shows real rows soon after the answer", async () => {
		// Console errors and uncaught errors during the run fail the test.
		const errors = [];
		const origError = console.error;
		console.error = (...args) => { errors.push(args.map(String).join(" ")); origError.apply(console, args); };
		const onError = (e) => errors.push(String(e.message ?? e));
		window.addEventListener("error", onError);
		try {
			const grid = make("dj-data-grid", { columns: COLUMNS, rowCount: TOTAL, rowHeight: 36, height: "320px", getRowId: (r) => r.id });
			const requests = [];
			let answeredAt = 0;
			grid.addEventListener("dj-rows-request", (e) => {
				const { start, end, epoch } = e.detail;
				requests.push(e.detail);
				setTimeout(() => { answeredAt = performance.now(); grid.setRows(start, rowsFrom(start, end), epoch); }, DELAY);
			});
			await mount(grid);
			await settleFrames();
			assertEqual(requests.length, 1, "the first screen asks once");
			await wait(DELAY + 50);
			await settleFrames();
			assert(realRows(grid).length > 0, "the top rows render");

			// The drag: 20 steps, one per frame, top to bottom.
			const scroll = grid.renderRoot.querySelector(".grid");
			const max = scroll.scrollHeight - scroll.clientHeight;
			assert(max > 3000000, `a real 3.6M px scroll height (max scrollTop ${max})`);
			for (let i = 1; i <= 20; i++) {
				scroll.scrollTop = Math.round((max * i) / 20);
				await nextFrame();
			}
			assertEqual(requests.length, 1, "nothing is requested while the thumb moves");

			// Let the settle hold (100 ms) expire and the request go out.
			await wait(150);
			await settleFrames();
			assertEqual(requests.length, 2, `one request after the drag (got ${JSON.stringify(requests.slice(1))})`);
			const last = requests[1];
			assert(last.end === TOTAL - 1, `the request reaches the last row (${last.start}-${last.end})`);
			assertEqual(last.reason, "range");

			// Real rows within 500 ms of the answer.
			const deadline = performance.now() + DELAY + 1000;
			let shownAt = 0;
			while (performance.now() < deadline) {
				await nextFrame();
				if (answeredAt && realRows(grid).some((r) => r.id === `r-${TOTAL - 1}`)) { shownAt = performance.now(); break; }
			}
			assert(shownAt > 0, "the last row rendered with real content");
			assert(shownAt - answeredAt < 500, `real rows ${Math.round(shownAt - answeredAt)} ms after the answer`);
			assertEqual(grid.renderRoot.querySelector(`#r-${TOTAL - 1} [role="gridcell"]`).textContent.trim(), "Sender 99999");
			assertEqual(requests.length, 2, "no further requests");
			assertEqual(errors.length, 0, `no console errors (${errors.join(" | ")})`);
		} finally {
			console.error = origError;
			window.removeEventListener("error", onError);
		}
	});
});
