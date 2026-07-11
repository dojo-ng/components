// The presentational components, in a real browser: they render their shadow content and pass
// axe. These are mostly static, so a render check plus an accessibility check is the whole job.
// (Full enter/leave animation timing and reduced-motion behavior are CSS-media-driven and are a
// manual/dev-tools check per docs/qa-requirements.md.)
import { mount, cleanup, make, assert } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/avatar/dist/index.js";
import "../../packages/icon/dist/index.js";
import "../../packages/label/dist/index.js";
import "../../packages/helper-text/dist/index.js";
import "../../packages/card/dist/index.js";
import "../../packages/result/dist/index.js";
import "../../packages/progress/dist/index.js";
import "../../packages/loading-indicator/dist/index.js";
import "../../packages/stack/dist/index.js";
import "../../packages/header/dist/index.js";
import "../../packages/two-column-layout/dist/index.js";
import "../../packages/three-column-layout/dist/index.js";
import "../../packages/text/dist/index.js";
import "../../packages/theme/dist/index.js";
import "../../packages/breadcrumb-group/dist/index.js";
import "../../packages/transition/dist/index.js";
import "../../packages/transition-group/dist/index.js";

// Simple tag + props + text cases: render, then axe.
const CASES = [
	{ tag: "dj-label", props: {}, text: "Full name" },
	{ tag: "dj-helper-text", props: { text: "Enter your legal name" } },
	{ tag: "dj-text", props: {}, text: "Hello world" },
	{ tag: "dj-card", props: { title: "Quarterly report" }, text: "Body content" },
	{ tag: "dj-result", props: { title: "Nothing found", subtitle: "Try another search", status: "info" } },
	{ tag: "dj-progress", props: { value: 40, label: "Upload progress" } },
	{ tag: "dj-loading-indicator", props: { label: "Loading", type: "circular-medium" } },
	{ tag: "dj-avatar", props: { alt: "Ada Lovelace" }, text: "AL" },
	{ tag: "dj-theme", props: { theme: "light" }, text: "Themed region" },
];

describe("presentational components render + axe", () => {
	afterEach(cleanup);

	for (const c of CASES) {
		it(`${c.tag} renders and has no serious/critical a11y violations`, async () => {
			const el = await mount(make(c.tag, c.props, c.text));
			await el.updateComplete;
			assert(el.shadowRoot && el.shadowRoot.childElementCount > 0, `${c.tag} rendered shadow content`);
			await assertNoViolations(el);
		});
	}

	it("dj-progress names its progressbar", async () => {
		const el = await mount(make("dj-progress", { value: 60, label: "Sync" }));
		await el.updateComplete;
		const bar = el.shadowRoot.querySelector('[role="progressbar"]');
		assert(bar.getAttribute("aria-label") === "Sync", "the progressbar carries its accessible name");
	});

	it("dj-icon exposes a labelled role=img", async () => {
		const el = make("dj-icon", { altText: "Information" });
		el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle></svg>';
		await mount(el);
		await el.updateComplete;
		assert(el.shadowRoot.querySelector('[role="img"]'), "icon exposes role=img");
		await assertNoViolations(el);
	});

	it("dj-stack lays out slotted children", async () => {
		const el = make("dj-stack", { direction: "horizontal" });
		el.append(make("div", {}, "A"), make("div", {}, "B"));
		await mount(el);
		await el.updateComplete;
		await assertNoViolations(el);
	});

	it("dj-header renders a banner region", async () => {
		const el = make("dj-header");
		el.append(make("span", {}, "Site name"));
		await mount(el);
		await el.updateComplete;
		assert(el.shadowRoot.querySelector('[role="banner"]'), "header is a banner landmark");
		await assertNoViolations(el);
	});

	it("dj-two-column-layout places its regions", async () => {
		const el = make("dj-two-column-layout");
		el.append(make("nav", { slot: "leading" }, "Nav"), make("main", { slot: "trailing" }, "Main"));
		await mount(el);
		await el.updateComplete;
		await assertNoViolations(el);
	});

	it("dj-three-column-layout places its regions", async () => {
		const el = make("dj-three-column-layout");
		el.append(make("nav", { slot: "leading" }, "Nav"), make("main", { slot: "center" }, "Main"), make("aside", { slot: "trailing" }, "Aside"));
		await mount(el);
		await el.updateComplete;
		await assertNoViolations(el);
	});

	it("dj-breadcrumb-group renders the trail and marks the current crumb", async () => {
		const el = make("dj-breadcrumb-group", { items: [{ label: "Home", href: "/" }, { label: "Docs", href: "/docs" }, { label: "This page", current: true }] });
		await mount(el);
		await el.updateComplete;
		assert(el.shadowRoot.querySelector('[part="list"]'), "renders a list of crumbs");
		assert(el.shadowRoot.querySelector('[aria-current]'), "the last crumb is marked current");
		await assertNoViolations(el);
	});

	it("dj-transition and dj-transition-group render their content shown", async () => {
		const t = make("dj-transition", { show: true });
		t.append(make("p", {}, "Fades in"));
		await mount(t);
		await t.updateComplete;
		await assertNoViolations(t);

		const g = make("dj-transition-group", { show: true });
		g.append(make("div", {}, "One"), make("div", {}, "Two"));
		await mount(g);
		await g.updateComplete;
		await assertNoViolations(g);
	});
});
