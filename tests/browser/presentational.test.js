// The presentational components, in a real browser: they render their shadow content and pass
// axe. These are mostly static, so a render check plus an accessibility check is the whole job.
// (Full enter/leave animation timing and reduced-motion behavior are CSS-media-driven and are a
// manual/dev-tools check per docs/qa-requirements.md.)
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
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
import "../../packages/alert/dist/index.js";
import "../../packages/badge/dist/index.js";
import "../../packages/skeleton/dist/index.js";
import "../../packages/header-card/dist/index.js";
import "../../packages/toolbar/dist/index.js";
import "../../packages/action-button/dist/index.js";
import "../../packages/floating-action-button/dist/index.js";
import "../../packages/button/dist/index.js";

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
	// component-a11y-coverage-spec.md A3: real rendered state, not an empty shell.
	{ tag: "dj-alert", props: { variant: "warning", closable: true }, text: "Your session is about to expire." },
	{ tag: "dj-badge", props: { variant: "danger" }, text: "4" },
	{ tag: "dj-skeleton", props: { effect: "sheen" } },
	{ tag: "dj-header-card", props: { title: "Quarterly report", subtitle: "Q3 2026" }, text: "Revenue grew 12% year over year." },
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

	it("dj-toolbar renders a labelled toolbar with slotted actions and an overflow menu", async () => {
		const el = make("dj-toolbar", {
			label: "Document actions",
			overflow: [{ value: "duplicate", label: "Duplicate" }, { value: "delete", label: "Delete" }],
		});
		el.append(make("span", { slot: "leading" }, "Doc"), make("dj-button", { slot: "actions", kind: "text" }, "Share"));
		await mount(el);
		await el.updateComplete;
		assert(el.shadowRoot.querySelector('[role="toolbar"]'), "renders a toolbar landmark");
		await assertNoViolations(el);
	});

	it("dj-action-button forwards its aria-label to the native button", async () => {
		const el = await mount(make("dj-action-button", { ariaLabel: "Save draft" }, "Save"));
		await el.updateComplete;
		assertEqual(
			el.shadowRoot.querySelector('[part="base"]').getAttribute("aria-label"),
			"Save draft",
			"the native button carries the forwarded accessible name",
		);
		await assertNoViolations(el);
	});

	it("dj-floating-action-button is icon-only and still gets a real accessible name", async () => {
		// The exact shape CB9 (rich-text-value-button-name-spec.md Track A) fixed: an aria-hidden
		// icon with no visible text, relying on dj-button forwarding the host aria-label.
		const el = make("dj-floating-action-button", { ariaLabel: "Add item" });
		el.innerHTML = '<svg slot="icon" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path d="M5 12h14M12 5v14" stroke="currentColor" stroke-width="2" fill="none"/></svg>';
		await mount(el);
		await el.updateComplete;
		assertEqual(
			el.shadowRoot.querySelector('[part="base"]').getAttribute("aria-label"),
			"Add item",
			"the icon-only FAB's native button carries the forwarded accessible name",
		);
		await assertNoViolations(el);
	});
});
