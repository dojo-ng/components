// dj-split-panel, in a real browser: real pointer drag against REAL layout (happy-dom does no
// layout at all, which is exactly the geometry this component's pointer math depends on), the
// keyboard equivalent WCAG 2.5.7 requires, the disabled-inert state, and an axe pass. Plus scroll
// restoration of both shadow panes through @dojo-ng/history (C11); scroll timing differs by engine.
import { sendKeys, sendMouse } from "@web/test-runner-commands";
import { createPubSub } from "@dojo-ng/pubsub";
import { installHistory } from "@dojo-ng/history";
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

describe("dj-split-panel scroll restoration", () => {
	let h;
	afterEach(() => {
		h?.destroy();
		h = undefined;
		cleanup();
	});

	/** A panel with an id and two panes tall enough to scroll. */
	function scrollingPanel(id) {
		const el = make("dj-split-panel", { id, orientation: "vertical" });
		el.setAttribute("style", "display:block;width:300px;height:300px");
		el.append(
			make("div", { slot: "start", style: "height:2000px" }, "start"),
			make("div", { slot: "end", style: "height:2000px" }, "end"),
		);
		return el;
	}
	const panes = (el) => [el.shadowRoot.querySelector('[part="start"]'), el.shadowRoot.querySelector('[part="end"]')];
	const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
	async function until(check, message, ms = 2000) {
		const end = Date.now() + ms;
		while (Date.now() < end) {
			if (check()) return;
			await sleep(20);
		}
		throw new Error(`timed out: ${message}`);
	}
	/** Resolves on the next location published after the current one. */
	function nextLocation() {
		return new Promise((resolve) => {
			let replayed = false;
			const stop = h.subscribe((location) => {
				if (!replayed) return;
				stop();
				resolve(location);
			});
			replayed = true;
		});
	}

	it("Back returns both panes to their offsets", async () => {
		h = installHistory(createPubSub(), { dwellMs: 0, scroll: true });
		const el = await mount(scrollingPanel("sp-restore"));
		await el.updateComplete;
		const [start, end] = panes(el);
		start.scrollTop = 400;
		end.scrollTop = 900;
		await until(() => start.scrollTop === 400 && end.scrollTop === 900, "panes scrolled");

		const arrived = nextLocation();
		h.go("/split-panel-test/a");
		await arrived;
		start.scrollTop = 0;
		end.scrollTop = 0;

		const back = nextLocation();
		h.back();
		await back;
		await until(() => start.scrollTop === 400 && end.scrollTop === 900, `both panes restored (got ${start.scrollTop}, ${end.scrollTop})`);
	});

	it("a panel re-created after Back gets the saved offsets", async () => {
		h = installHistory(createPubSub(), { dwellMs: 0, scroll: true });
		let el = await mount(scrollingPanel("sp-recreate"));
		await el.updateComplete;
		let [start, end] = panes(el);
		start.scrollTop = 250;
		end.scrollTop = 600;
		await until(() => start.scrollTop === 250 && end.scrollTop === 600, "panes scrolled");

		// Navigating away replaces the view: the panel goes.
		const arrived = nextLocation();
		h.go("/split-panel-test/b");
		await arrived;
		el.remove();

		// Back renders the view again, as an app does on the location: a new panel, same id.
		const back = nextLocation();
		h.back();
		await back;
		el = await mount(scrollingPanel("sp-recreate"));
		await el.updateComplete;
		[start, end] = panes(el);
		await until(() => start.scrollTop === 250 && end.scrollTop === 600, `re-created panes restored (got ${start.scrollTop}, ${end.scrollTop})`);
	});

	it("no-scroll-restore leaves the panes where they are", async () => {
		h = installHistory(createPubSub(), { dwellMs: 0, scroll: true });
		const el = await mount(scrollingPanel("sp-off"));
		el.noScrollRestore = true;
		await el.updateComplete;
		const [start] = panes(el);
		start.scrollTop = 300;
		await until(() => start.scrollTop === 300, "pane scrolled");
		const arrived = nextLocation();
		h.go("/split-panel-test/c");
		await arrived;
		start.scrollTop = 0;
		const back = nextLocation();
		h.back();
		await back;
		await sleep(150); // well past history's two-frame wait
		assertEqual(start.scrollTop, 0, "an opted-out pane is not restored");
	});
});
