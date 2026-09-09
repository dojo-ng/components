// dj-nav, in a real browser: the container-query threshold (the whole point — happy-dom evaluates
// no container queries, so nav.test.js can't touch any of this), the permanent-hamburger pin, a
// per-instance threshold override, the container-scoped win over a viewport-scoped alternative,
// refresh() for a runtime pin with no resize, real focus movement on open/close/Escape, the
// drawer/overlay Tab trap vs. the dropdown's non-modal escape hatch, a collapse flip while open,
// and an axe pass over both arrangements and both DOM shapes (drawer composes dj-slide-pane;
// dropdown and overlay share the same plain-div shape, so one of the two stands in for both).
import { sendKeys } from "@web/test-runner-commands";
import { deepActiveElement, collectFocusables } from "../../packages/dojo-element/dist/index.js";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/nav/dist/index.js";

/**
 * Press Tab with `from` focused and report whether any keydown handler swallowed it
 * (`preventDefault`) and where focus ended up. The window listener runs last in the bubble
 * phase, after dj-nav's own handler and dj-slide-pane's document-level one, so `prevented`
 * is exactly "a trap intervened". That is the engine-independent half of a "Tab moves
 * normally" check; where focus lands is the browser's business (see `tabReachesLinks`).
 */
async function tabFrom(from, shift = false) {
	from.focus();
	let prevented = null;
	const seen = (e) => {
		if (e.key === "Tab") prevented = e.defaultPrevented;
	};
	window.addEventListener("keydown", seen);
	try {
		await sendKeys({ press: shift ? "Shift+Tab" : "Tab" });
	} finally {
		window.removeEventListener("keydown", seen);
	}
	return { prevented, active: deepActiveElement() };
}

/**
 * WebKit/Safari do not put links in the Tab sequence unless the "Press Tab to highlight
 * each item" preference is on (same family as the button.test.js note), so a native Tab
 * from or to an `<a>` lands somewhere engine-specific there. Probe it once with two plain
 * links: if Tab from the first does not reach the second, assertions about WHERE a native
 * Tab lands are skipped with a warning, and only "no trap swallowed it" is asserted. The
 * trap's own forced moves (wrap, recapture) are asserted on every engine regardless.
 */
let tabReachesLinks;
async function probeTabReachesLinks() {
	if (tabReachesLinks !== undefined) return tabReachesLinks;
	const a = make("a", { href: "#probe-1" }, "probe 1");
	const b = make("a", { href: "#probe-2" }, "probe 2");
	document.body.append(a, b);
	const { active } = await tabFrom(a);
	a.remove();
	b.remove();
	tabReachesLinks = active === b;
	if (!tabReachesLinks) {
		console.warn("dj-nav: this engine does not route native Tab across links; native-Tab destination assertions are skipped (trap wrap/recapture still asserted)");
	}
	return tabReachesLinks;
}

/** A dj-nav with `count` slotted links, unmounted. */
function buildNav(count = 3) {
	const el = document.createElement("dj-nav");
	for (let i = 0; i < count; i++) {
		el.append(make("a", { href: `/link-${i + 1}` }, `Link ${i + 1}`));
	}
	return el;
}

describe("dj-nav", () => {
	afterEach(cleanup);

	it("a wide host renders the inline arrangement, with no trigger", async () => {
		const el = buildNav();
		el.style.width = "800px"; // wider than the 45rem (720px) default threshold
		await mount(el);
		await settleFrames();
		assertEqual(el.collapsed, false, "a wide host should stay expanded");
		assert(!el.shadowRoot.querySelector(".trigger"), "no trigger when expanded");
		assert(el.shadowRoot.querySelector("nav"), "the plain <nav> renders");
	});

	it("narrowing a wide host below the threshold collapses it and emits one dj-nav-collapse", async () => {
		const el = buildNav();
		el.style.width = "800px";
		await mount(el);
		await settleFrames();
		assertEqual(el.collapsed, false);

		const collapses = [];
		el.addEventListener("dj-nav-collapse", (e) => collapses.push(e.detail));
		el.style.width = "300px";
		await settleFrames();
		await el.updateComplete;

		assertEqual(el.collapsed, true, "narrowing past 45rem should collapse");
		assert(el.shadowRoot.querySelector(".trigger"), "the trigger should render once collapsed");
		assertEqual(collapses.length, 1, "exactly one dj-nav-collapse");
		assertEqual(collapses[0].collapsed, true);
	});

	it("pinning --dj-nav-collapsed: 1 collapses a wide host (permanent hamburger, no JS)", async () => {
		const el = buildNav();
		el.style.width = "800px";
		el.style.setProperty("--dj-nav-collapsed", "1");
		await mount(el);
		await settleFrames();
		assertEqual(el.collapsed, true, "the pin should win over the wide-host default");
		assert(el.shadowRoot.querySelector(".trigger"));
	});

	it("overriding the @container threshold on a single instance moves the flip point", async () => {
		const style = make("style", {}, `
			#custom-threshold-wrap { container-type: inline-size; }
			@container (min-width: 20rem) {
				#custom-threshold-nav { --dj-nav-collapsed: 0; }
			}
		`);
		document.head.append(style);
		try {
			const wrap = make("div", { id: "custom-threshold-wrap" });
			wrap.style.width = "25rem"; // below the component's own 45rem default, above this override's 20rem
			const el = buildNav();
			el.id = "custom-threshold-nav";
			wrap.append(el);
			document.body.append(wrap);
			await el.updateComplete;
			await settleFrames();

			assertEqual(
				el.collapsed,
				false,
				"a per-instance override at a lower threshold should win over the component's own 45rem default",
			);
		} finally {
			style.remove();
		}
	});

	it("a nav inside a narrow sidebar column collapses even though the viewport itself is wide", async () => {
		const sidebar = make("div");
		sidebar.style.width = "200px"; // narrower than the 45rem threshold
		const el = buildNav();
		sidebar.append(el);
		document.body.append(sidebar);
		await el.updateComplete;
		await settleFrames();
		assertEqual(
			el.collapsed,
			true,
			"a narrow container should collapse the nav regardless of the wide viewport — the case a viewport-scoped alternative gets wrong",
		);
	});

	it("refresh() picks up a runtime pin that came with no resize", async () => {
		const el = buildNav();
		el.style.width = "800px";
		await mount(el);
		await settleFrames();
		assertEqual(el.collapsed, false);

		// Pin the token directly — no resize occurs, so ResizeObserver alone would never see this.
		el.style.setProperty("--dj-nav-collapsed", "1");
		el.refresh();
		await el.updateComplete;
		assertEqual(el.collapsed, true, "refresh() should pick up a token change with no resize");
	});

	it("open moves focus into the panel; Escape closes it and returns focus to the trigger", async () => {
		const el = buildNav();
		el.style.setProperty("--dj-nav-collapsed", "1");
		el.panel = "overlay";
		await mount(el);
		await settleFrames();

		await el.show();
		await el.updateComplete;
		const firstLink = el.querySelector("a");
		assertEqual(deepActiveElement(), firstLink, "opening should move focus to the first link");

		await sendKeys({ press: "Escape" });
		await el.updateComplete;
		assertEqual(el.open, false, "Escape should close the panel");
		const trigger = el.shadowRoot.querySelector(".trigger");
		assertEqual(deepActiveElement(), trigger, "Escape should return focus to the trigger");
	});

	for (const panelType of ["dropdown", "overlay"]) {
		it(`Escape closes the ${panelType} panel even when focus has already left the component (Bill's real-Safari report: reproduces some way native Tab/click-focus resolution in a real engine leaves focus outside the component's tree — https://bugs.webkit.org/ style click-doesn't-focus quirks are the leading suspect; not reproducible in Playwright's WebKit build, so this guards the fix rather than the exact mechanism)`, async () => {
			const el = buildNav();
			el.style.setProperty("--dj-nav-collapsed", "1");
			el.panel = panelType;
			const outside = make("button", {}, "Outside");
			document.body.append(el, outside);
			await el.updateComplete;
			await settleFrames();

			await el.show();
			await el.updateComplete;
			assertEqual(el.open, true, `${panelType}: should be open`);

			// Move focus OUTSIDE the component entirely — not via hide(), just a plain .focus()
			// call, simulating focus ending up elsewhere by any means. The OLD shadow-tree-scoped
			// keydown listener could never see an Escape dispatched from here: the event's bubble
			// path from `outside` never passes through dj-nav at all.
			outside.focus();
			assertEqual(deepActiveElement(), outside, "sanity: focus really left the component");

			await sendKeys({ press: "Escape" });
			await el.updateComplete;
			assertEqual(el.open, false, `${panelType}: Escape should still close the panel via the document-level listener`);
		});
	}

	for (const panelType of ["drawer", "overlay"]) {
		it(`Tab wraps within the ${panelType} panel's trap`, async () => {
			const el = buildNav();
			el.style.setProperty("--dj-nav-collapsed", "1");
			el.panel = panelType;
			await mount(el);
			await settleFrames();
			await el.show();
			await el.updateComplete;
			await settleFrames();

			// Overlay: dj-nav's own trap, over its shadow root + host. Drawer: dj-slide-pane's
			// trap — collectFocusables walks slots in composed order, so the pane reaches the
			// real links through dj-nav's <nav><slot></slot></nav>, and its own close button
			// is the first stop.
			const owner = panelType === "drawer" ? el.shadowRoot.querySelector("dj-slide-pane") : el;
			const focusables = collectFocusables(owner.shadowRoot, owner);
			assert(focusables.length > 1, `${panelType}: expected more than one focusable in the trap`);
			const links = [...el.querySelectorAll("a")];
			for (const link of links) {
				assert(focusables.includes(link), `${panelType}: the slotted links must be inside the trap`);
			}
			const first = focusables[0];
			const last = focusables[focusables.length - 1];

			last.focus();
			await sendKeys({ press: "Tab" });
			assertEqual(deepActiveElement(), first, `${panelType}: Tab from the last focusable should wrap to the first`);

			first.focus();
			await sendKeys({ press: "Shift+Tab" });
			assertEqual(deepActiveElement(), last, `${panelType}: Shift+Tab from the first focusable should wrap to the last`);

			// Mid-list Tab is the browser's, not the trap's: no second trap may recapture it.
			// (Two traps over the drawer used to: dj-nav's wrapped, then slide-pane's
			// recaptured onto its close button — which shows up as preventDefault here.)
			const mid = await tabFrom(links[0]);
			assertEqual(mid.prevented, false, `${panelType}: a Tab between links must not be swallowed by any trap`);
			if (await probeTabReachesLinks()) {
				assertEqual(mid.active, links[1], `${panelType}: Tab between links must move to the next link`);
			}
		});
	}

	it("Tab is NOT trapped in the dropdown panel (non-modal disclosure)", async () => {
		const el = buildNav();
		el.style.setProperty("--dj-nav-collapsed", "1");
		el.panel = "dropdown";
		const after = make("button", {}, "After");
		document.body.append(el, after);
		await el.updateComplete;
		await settleFrames();
		await el.show();
		await el.updateComplete;
		await settleFrames();

		const links = [...el.querySelectorAll("a")];
		const out = await tabFrom(links[links.length - 1]);
		assertEqual(out.prevented, false, "Tab from the last link must not be swallowed: the dropdown has no trap");
		if (await probeTabReachesLinks()) {
			assertEqual(
				out.active,
				after,
				"Tab from the last link should leave the dropdown for the next page focusable, not wrap back",
			);
		}
	});

	it("a collapse flip while open closes the panel and relocates focus without stranding it", async () => {
		const el = buildNav();
		el.style.width = "300px"; // starts narrow: collapsed
		el.panel = "overlay";
		await mount(el);
		await settleFrames();
		assertEqual(el.collapsed, true);

		await el.show();
		await el.updateComplete;
		await settleFrames();
		assertEqual(el.open, true);

		const collapses = [];
		el.addEventListener("dj-nav-collapse", (e) => collapses.push(e.detail));
		el.style.width = "800px"; // widen past the threshold while open
		await settleFrames();
		await el.updateComplete;

		assertEqual(el.collapsed, false, "widening past the threshold should expand");
		assertEqual(el.open, false, "the flip should close the panel");
		assertEqual(collapses.length, 1, "exactly one dj-nav-collapse");
		assertEqual(collapses[0].collapsed, false);
		assert(!el.shadowRoot.querySelector(".trigger"), "no stranded trigger after expanding");
		const firstLink = el.querySelector("a");
		assertEqual(
			deepActiveElement(),
			firstLink,
			"focus should relocate to the first link in the new expanded arrangement",
		);
	});

	it("has no serious or critical accessibility violations (expanded)", async () => {
		const el = buildNav();
		el.style.width = "800px";
		await mount(el);
		await settleFrames();
		await assertNoViolations(el);
	});

	it("has no serious or critical accessibility violations (collapsed, closed)", async () => {
		const el = buildNav();
		el.style.setProperty("--dj-nav-collapsed", "1");
		await mount(el);
		await settleFrames();
		await assertNoViolations(el);
	});

	for (const panelType of ["drawer", "overlay"]) {
		it(`has no serious or critical accessibility violations (collapsed, open, ${panelType})`, async () => {
			const el = buildNav();
			el.style.setProperty("--dj-nav-collapsed", "1");
			el.panel = panelType;
			await mount(el);
			await settleFrames();
			await el.show();
			await el.updateComplete;
			await settleFrames();
			await assertNoViolations(el);
		});
	}
});
