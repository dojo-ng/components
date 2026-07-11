// Component performance gate (RELATIVE, not absolute). Measures the two heavy paths in a real
// browser — a 5,000-row data-grid (mount + scroll, bounded by the virtualizer) and a 5,000-point
// line chart render — and compares each timing against a checked-in baseline with a 2× tolerance.
// The FIRST run (empty baseline) SEEDS tests/browser/bench-baseline.json and passes; later runs
// compare and fail only past 2×. Absolute-ms gates are banned (CI machines vary); updating the
// baseline is a deliberate, reviewed edit.
//
// Excluded from the default test:browser run and run on its own via `npm run bench:components`
// (chromium only — a single engine so one baseline isn't fought over by three).
import { executeServerCommand } from "@web/test-runner-commands";
import { compareBench, isBaselineEmpty } from "../bench-compare.js";
import { nextFrame } from "./helpers.js";
import "../../packages/data-grid/dist/index.js";
import "../../packages/chart/dist/index.js";

// @tanstack/table-core reads process.env.NODE_ENV (a bundler defines it in an app).
if (!globalThis.process) globalThis.process = { env: { NODE_ENV: "production" } };

const TOLERANCE = 2;
const ROWS = 5000;
const POINTS = 5000;
const COLUMNS = [{ id: "id", header: "ID" }, { id: "name", header: "Name" }, { id: "value", header: "Value" }];
const gridData = (n) => Array.from({ length: n }, (_, i) => ({ id: i, name: `Row ${i}`, value: i }));
const chartData = (n) => Array.from({ length: n }, (_, i) => ({ x: String(i), y: Math.sin(i / 40) * 50 + 50 }));

async function settle() { await nextFrame(); await nextFrame(); }

describe("component benchmarks (relative 2× gate)", () => {
	it("data-grid and chart stay within their timing baselines", async function () {
		this.timeout(60000);
		const results = {};

		// --- data-grid: 5,000-row mount (virtualizer keeps the DOM window bounded) ---
		const grid = document.createElement("dj-data-grid");
		grid.columns = COLUMNS;
		grid.rowHeight = 30;
		grid.height = "400px";
		grid.data = gridData(ROWS);
		let t0 = performance.now();
		document.body.append(grid);
		await grid.updateComplete;
		await settle();
		results.gridMount = performance.now() - t0;
		const rendered = grid.shadowRoot.querySelectorAll('[part="row"]').length;
		if (!(rendered > 0 && rendered < 120)) throw new Error(`grid did not virtualize (rendered ${rendered} rows)`);

		// --- data-grid: scroll through the full range, re-rendering the window each step ---
		const scroll = grid.shadowRoot.querySelector(".scroll");
		const totalPx = grid.rowHeight * ROWS;
		const STEPS = 20;
		t0 = performance.now();
		for (let i = 1; i <= STEPS; i++) {
			scroll.scrollTop = (totalPx * i) / (STEPS + 1);
			await nextFrame();
			await grid.updateComplete;
		}
		results.gridScroll = performance.now() - t0;
		document.body.removeChild(grid);

		// --- chart: 5,000-point line render (mount + render until the line draws) ---
		// The SVG is ResizeObserver-gated (it renders only once the plot has a measured size), so we
		// mount with the full data and time until the line element actually appears — a mount+render
		// figure, which is what the relative gate needs.
		const chart = document.createElement("dj-chart");
		chart.type = "line";
		chart.categoryKey = "x";
		chart.series = [{ key: "y", label: "Y" }];
		chart.data = chartData(POINTS);
		// No inline `display` — the host's own `:host { display: flex }` is what gives the plot its
		// height. (Overriding it to block collapses the plot to 0 height, and the SVG never renders.)
		t0 = performance.now();
		document.body.append(chart);
		await chart.updateComplete;
		let line = null;
		for (let i = 0; i < 90 && !line; i++) { await nextFrame(); line = chart.shadowRoot.querySelector('[part="line"]'); }
		results.chartRender = performance.now() - t0;
		document.body.removeChild(chart);
		if (!line) throw new Error("chart did not render a line series (no [part=line]) after mount — measurement is meaningless");

		// --- seed on first run, else compare against the baseline ---
		const baseline = await executeServerCommand("read-bench-baseline");
		if (isBaselineEmpty(baseline)) {
			await executeServerCommand("save-bench-baseline", results);
			console.log(`[bench] SEEDED baseline (first run):\n${JSON.stringify(results, null, 2)}`);
			return;
		}
		const report = compareBench(results, baseline, TOLERANCE);
		console.log(`[bench] measured vs baseline @ ${TOLERANCE}×:\n${report.table}`);
		if (!report.pass) throw new Error(`[bench] a metric exceeded its ${TOLERANCE}× baseline (see the table above)`);
	});
});
