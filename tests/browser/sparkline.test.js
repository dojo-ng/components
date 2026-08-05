// dj-sparkline, in a real browser.
//
// Why this file exists: happy-dom drops ALL expression-inserted SVG child content under Lit
// (chart-later-spec.md, SL1's harness finding), so the sandbox suite can only assert
// attribute-level bindings on the <svg> root. The node-level assertions — is a line drawn, is
// the area closed, is there one rect per bar — belong here, where a real engine renders them,
// exactly as dj-chart's own geometry assertions already do in chart.test.js.
//
// The marker case is the sharp one. dj-sparkline uses a fixed 100×30 viewBox with
// preserveAspectRatio="none", so the scale is non-uniform and anything drawn inside the SVG is
// stretched. The marker is an HTML overlay for that reason; the roundness assertion below is
// what fails if it ever moves back into the <svg>.
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/chart/dist/index.js";

const DATA = [4, 9, 6, 12, 8, 15, 11];

function spark(props) {
	return make("dj-sparkline", { data: DATA, ...props });
}

describe("dj-sparkline", () => {
	afterEach(cleanup);

	it("draws a line path and nothing else for type=line", async () => {
		const el = await mount(spark({}));
		await settleFrames();
		const line = el.shadowRoot.querySelector("path.line");
		assert(line, "the line path renders");
		assert(line.getAttribute("d").startsWith("M"), "the line path carries real path data");
		assert(!el.shadowRoot.querySelector("path.area"), "type=line draws no area fill");
		assert(!el.shadowRoot.querySelector("rect.bar"), "type=line draws no bars");
	});

	it("draws a closed area fill plus its line for type=area", async () => {
		const el = await mount(spark({ type: "area" }));
		await settleFrames();
		const area = el.shadowRoot.querySelector("path.area");
		assert(area, "the area path renders");
		assert(area.getAttribute("d").endsWith("Z"), "the area path is closed");
		assert(el.shadowRoot.querySelector("path.line"), "type=area still draws its line on top");
	});

	it("draws one rect per point for type=bar", async () => {
		const el = await mount(spark({ type: "bar" }));
		await settleFrames();
		assertEqual(el.shadowRoot.querySelectorAll("rect.bar").length, DATA.length, "one bar per data point");
		assert(!el.shadowRoot.querySelector("path.line"), "type=bar draws no line");
	});

	it("draws no marks for empty data", async () => {
		const el = await mount(spark({ data: [] }));
		await settleFrames();
		assert(!el.shadowRoot.querySelector("path.line, path.area, rect.bar"), "no marks without data");
	});

	it("the marker is round, not stretched by preserveAspectRatio=none", async () => {
		// A host aspect deliberately far from the coordinate space: 10:1 against the viewBox's
		// 10:3, so an SVG <circle> here would come out about 3× wider than tall.
		const el = await mount(spark({ marker: true }));
		el.style.width = "200px";
		el.style.height = "20px";
		await el.updateComplete;
		await settleFrames();
		const marker = el.shadowRoot.querySelector(".marker");
		assert(marker, "the marker renders when `marker` is set");
		const box = marker.getBoundingClientRect();
		assert(box.width > 0 && box.height > 0, "the marker has a real rendered size");
		assert(
			Math.abs(box.width - box.height) < 0.5,
			`the marker is round regardless of host aspect (got ${box.width}×${box.height})`,
		);
	});

	it("the marker sits on the last point", async () => {
		const el = await mount(spark({ marker: true }));
		el.style.width = "200px";
		el.style.height = "20px";
		await el.updateComplete;
		await settleFrames();
		const host = el.getBoundingClientRect();
		const marker = el.shadowRoot.querySelector(".marker").getBoundingClientRect();
		const cx = marker.left + marker.width / 2;
		// The last point is at x = W in the fixed coordinate space, i.e. the host's right edge.
		assert(Math.abs(cx - host.right) < 1, `the marker centers on the last point (${cx} vs ${host.right})`);
	});

	it("suppresses the marker for type=bar", async () => {
		const el = await mount(spark({ type: "bar", marker: true }));
		await settleFrames();
		assert(!el.shadowRoot.querySelector(".marker"), "bars get no last-point marker");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(spark({ label: "Latency, ms", marker: true }));
		await settleFrames();
		await assertNoViolations(el);
	});
});
