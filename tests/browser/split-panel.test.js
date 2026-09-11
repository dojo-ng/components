// dj-split-panel, in a real browser: real pointer drag against REAL layout (happy-dom does no
// layout at all, which is exactly the geometry this component's pointer math depends on), the
// keyboard equivalent WCAG 2.5.7 requires, the disabled-inert state, and an axe pass.
import { sendKeys, sendMouse } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/split-panel/dist/index.js";

function buildPanel(props) {
	const el = make("dj-split-panel", props);
	el.setAttribute("style", "display:block;width:400px;height:200px");
	el.append(make("div", { slot: "start" }, "A"), make("div", { slot: "end" }, "B"));
	return el;
}

describe("dj-split-panel", () => {
	afterEach(cleanup);

	it("dragging the divider repositions the split, settling dj-reposition once on release", async () => {
		const el = await mount(buildPanel());
		await el.updateComplete;

		let repositions = 0;
		let lastPosition;
		el.addEventListener("dj-reposition", (e) => { repositions++; lastPosition = e.detail.position; });

		const divider = el.shadowRoot.querySelector('[part="divider"]');
		const dr = divider.getBoundingClientRect();
		const hostRect = el.getBoundingClientRect();
		const y = Math.round(dr.top + dr.height / 2);

		await sendMouse({ type: "move", position: [Math.round(dr.left + dr.width / 2), y] });
		await sendMouse({ type: "down" });
		await sendMouse({ type: "move", position: [Math.round(hostRect.left + hostRect.width * 0.75), y] });
		await sendMouse({ type: "up" });
		await el.updateComplete;

		assert(el.position > 60 && el.position < 90, `dragging to ~75% moved the split there (got ${el.position})`);
		assertEqual(repositions, 1, "dj-reposition fires exactly once, on release");
		assertEqual(lastPosition, el.position, "the event detail carries the settled position");
	});

	it("the keyboard path moves the divider: arrows step, Shift steps by 10, Home/End jump", async () => {
		const el = await mount(buildPanel({ position: 50 }));
		await el.updateComplete;
		let repositions = 0;
		el.addEventListener("dj-reposition", () => repositions++);

		const divider = el.shadowRoot.querySelector('[part="divider"]');
		divider.focus();

		await sendKeys({ press: "ArrowRight" });
		await el.updateComplete;
		assertEqual(el.position, 51, "ArrowRight steps +1");

		await sendKeys({ press: "Shift+ArrowRight" });
		await el.updateComplete;
		assertEqual(el.position, 61, "Shift+ArrowRight steps +10");

		await sendKeys({ press: "Home" });
		await el.updateComplete;
		assertEqual(el.position, 0, "Home jumps to 0");

		await sendKeys({ press: "End" });
		await el.updateComplete;
		assertEqual(el.position, 100, "End jumps to 100");

		assertEqual(repositions, 4, "dj-reposition fires once per keypress");
	});

	it("disabled removes the divider from the tab order and makes the keyboard path inert", async () => {
		const el = await mount(buildPanel({ position: 50, disabled: true }));
		await el.updateComplete;
		const divider = el.shadowRoot.querySelector('[part="divider"]');
		assertEqual(divider.getAttribute("tabindex"), "-1", "removed from the tab order");

		divider.focus();
		await sendKeys({ press: "ArrowRight" });
		await el.updateComplete;
		assertEqual(el.position, 50, "keyboard is inert while disabled");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(buildPanel());
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
