// dj-chart, in a real browser: the SVG only renders once real layout gives the plot a size
// (ResizeObserver-driven, so happy-dom can't exercise it), interactive legend toggling,
// keyboard operation of the brush window, and an axe pass. Not a form control.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/chart/dist/index.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DATA = [
	{ m: "Jan", v: 3 },
	{ m: "Feb", v: 7 },
	{ m: "Mar", v: 5 },
	{ m: "Apr", v: 9 },
	{ m: "May", v: 4 },
];
const SERIES = [{ key: "v", label: "Visits" }];

function chart(props) {
	return make("dj-chart", { data: DATA, series: SERIES, categoryKey: "m", type: "line", ...props });
}
// Charts render only after ResizeObserver measures the plot; give it real time to settle.
async function settleChart(el) {
	await el.updateComplete;
	await wait(60);
	await settleFrames();
}

describe("dj-chart", () => {
	afterEach(cleanup);

	it("renders the SVG once the plot has real layout", async () => {
		const el = await mount(chart({}));
		await settleChart(el);
		assert(el.shadowRoot.querySelector('svg[part="plot"]'), "the plot SVG renders when the box has a size");
		assert(el.shadowRoot.querySelector('[part="line"]'), "the line series is drawn");
	});

	it("legend items toggle series visibility and emit dj-legend-toggle", async () => {
		const el = await mount(chart({ legendToggle: true }));
		await settleChart(el);
		let detail;
		el.addEventListener("dj-legend-toggle", (e) => { detail = e.detail; });

		assert(el.shadowRoot.querySelector('[part="line"]'), "the series is visible to start");
		const item = el.shadowRoot.querySelector('[part="legend-item"]');
		assert(item, "an interactive legend item renders");
		item.click();
		await el.updateComplete;
		assert(detail && detail.key === "v" && detail.hidden === true, "toggling emits dj-legend-toggle with the hidden state");
		assert(!el.shadowRoot.querySelector('[part="line"]'), "the hidden series is no longer drawn");

		el.shadowRoot.querySelector('[part="legend-item"]').click();
		await el.updateComplete;
		assert(el.shadowRoot.querySelector('[part="line"]'), "toggling again restores the series");
	});

	it("the brush window moves with the keyboard", async () => {
		const el = await mount(chart({ brush: true }));
		await settleChart(el);
		const startHandle = [...el.shadowRoot.querySelectorAll('[part="brush-handle"]')].find((h) => h.getAttribute("aria-label") === "Range start");
		assert(startHandle, "the brush renders a start handle");
		assertEqual(startHandle.getAttribute("aria-valuenow"), "0", "the window starts at category 0");

		startHandle.focus();
		await sendKeys({ press: "ArrowRight" });
		await el.updateComplete;
		const now = [...el.shadowRoot.querySelectorAll('[part="brush-handle"]')].find((h) => h.getAttribute("aria-label") === "Range start").getAttribute("aria-valuenow");
		assert(Number(now) > 0, `ArrowRight narrows the window from the start (got ${now})`);
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(chart({ label: "Monthly visits" }));
		await settleChart(el);
		await assertNoViolations(el);
	});

	// Track M (point labels): decision 27's whole argument is that a <text> label inside
	// role="img" isn't independently announced, so a label adds nothing to double-read — but that
	// argument only holds as long as role="img" is actually still there. Checked directly rather
	// than assumed, same as M3 asks.
	it("point labels: axe clean, and role=\"img\" is still present on the plot SVG", async () => {
		const el = await mount(chart({ label: "Monthly visits", pointLabels: true }));
		await settleChart(el);
		const svg = el.shadowRoot.querySelector('svg[part="plot"]');
		assert(svg, "the plot SVG renders");
		assertEqual(svg.getAttribute("role"), "img", "role=img is what makes the point labels non-double-read (decision 27) — if this ever changes, that assumption breaks");
		assert(el.shadowRoot.querySelectorAll(".point-label").length > 0, "point labels actually rendered for this assertion to mean anything");
		await assertNoViolations(el);
	});

	// Track L (log scale): happy-dom can't lay out real SVG geometry, so the actual break in the
	// line — the thing decision 3 cares about most — is confirmed here, in a real renderer, not just
	// via the linePath string in the unit suite.
	it("y-scale=\"log\": a non-positive value breaks the line into two subpaths, and axe stays clean", async () => {
		const data = [{ m: "Jan", v: 10 }, { m: "Feb", v: 0 }, { m: "Mar", v: 30 }];
		const el = await mount(chart({ data, label: "Sensor", yScale: "log" }));
		await settleChart(el);
		const line = el.shadowRoot.querySelector('[part="line"]');
		assert(line, "the line still renders");
		const d = line.getAttribute("d") ?? "";
		assertEqual((d.match(/M/g) ?? []).length, 2, "the non-positive value breaks the path into two subpaths, same as the unit-tested linePath string");
		await assertNoViolations(el);
	});
});
