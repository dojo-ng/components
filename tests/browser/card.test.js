// dj-card as a link, in a real browser: with `path` the body is a real <a href> that Tab reaches and
// a screen reader announces as a link, and a plain click navigates through history while a
// modified click is left to the browser. Plus axe.
import { sendKeys } from "@web/test-runner-commands";
import { createPubSub } from "@dojo-ng/pubsub";
import { installHistory } from "@dojo-ng/history";
import { deepActiveElement } from "../../packages/dojo-element/dist/index.js";
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/card/dist/index.js";

/** Does native Tab reach a plain link on this engine? WebKit's default is no. */
async function tabReachesLinks() {
	const first = make("a", { href: "#probe-1" }, "probe 1");
	const second = make("a", { href: "#probe-2" }, "probe 2");
	document.body.append(first, second);
	first.focus();
	await sendKeys({ press: "Tab" });
	const reached = document.activeElement === second;
	first.remove();
	second.remove();
	return reached;
}

describe("dj-card with path", () => {
	let h;
	afterEach(() => {
		h?.destroy();
		h = undefined;
		cleanup();
	});

	const body = (el) => el.shadowRoot.querySelector('[part="body"]');

	it("the body is a link that Tab reaches, and Enter follows it through history", async () => {
		h = installHistory(createPubSub(), { dwellMs: 0 });
		const before = make("button", {}, "before");
		const el = make("dj-card", { path: "/card-test/a", title: "Card A", track: true });
		await mount(before);
		await mount(el);
		before.focus();
		await sendKeys({ press: "Tab" });
		if (deepActiveElement() !== body(el) && !(await tabReachesLinks())) {
			// WebKit/Safari leave links out of the Tab sequence unless "Press Tab to highlight each
			// item" is on (see nav.test.js), so the destination of a native Tab is not the card's
			// fault there. Focus the link directly and still check Enter.
			console.warn("dj-card: this engine does not route native Tab to links; focusing the link directly");
			body(el).focus();
		}
		const active = deepActiveElement();
		assert(active === body(el), "Tab lands on the card's link");
		assertEqual(active.tagName, "A", "it is an anchor");
		assert(active.matches("a[href]"), "with an href, so it is a link role and not a button");

		const arrived = new Promise((resolve) => {
			let replayed = false;
			let stop;
			stop = h.subscribe((l) => { if (replayed && l.path === "/card-test/a") { stop?.(); resolve(l); } });
			replayed = true;
		});
		await sendKeys({ press: "Enter" });
		await arrived;
		await el.updateComplete;
		assertEqual(location.pathname, "/card-test/a", "history navigated, with no page load");
		assertEqual(body(el).getAttribute("aria-current"), "page", "and the tracked card is the current page");
	});

	it("a card with a base-prefixed href, and a ctrl-click left to the browser", async () => {
		h = installHistory(createPubSub(), { dwellMs: 0, base: "/card-base" });
		const el = await mount(make("dj-card", { path: "/x", title: "X" }));
		await el.updateComplete;
		assertEqual(body(el).getAttribute("href"), "/card-base/x", "href includes the base");
		let navigated = false;
		document.addEventListener("dj-navigate", () => { navigated = true; }, { once: true });
		// Keep a real ctrl-click from opening a tab or leaving the test page.
		body(el).addEventListener("click", (e) => e.preventDefault(), { once: true });
		body(el).dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, ctrlKey: true }));
		assert(!navigated, "no dj-navigate for a modified click");
	});

	it("has no serious or critical accessibility violations, as a link and as the current page", async () => {
		h = installHistory(createPubSub(), { dwellMs: 0 });
		const el = await mount(make("dj-card", { path: "/card-test/b", title: "Card B", subtitle: "Sub", track: true }));
		el.textContent = "Some content";
		await el.updateComplete;
		await assertNoViolations(el);
		h.go("/card-test/b");
		await el.updateComplete;
		await assertNoViolations(el);
	});
	it("with focus on, activating a card link moves focus to the new view's heading, which has a name", async () => {
		const heading = make("h1", { id: "card-focus-heading" }, "Card A");
		await mount(heading);
		h = installHistory(createPubSub(), { dwellMs: 0, focus: "#card-focus-heading" });
		const el = await mount(make("dj-card", { path: "/card-test/focus", title: "Card A", track: true }));
		const arrived = new Promise((resolve) => {
			let replayed = false;
			let stop;
			stop = h.subscribe((l) => { if (replayed && l.path === "/card-test/focus") { stop?.(); resolve(l); } });
			replayed = true;
		});
		body(el).click();
		await arrived;
		for (let i = 0; i < 50 && document.activeElement !== heading; i++) await new Promise((resolve) => setTimeout(resolve, 20));
		assert(document.activeElement === heading, "the heading has focus after the navigation");
		assertEqual(heading.getAttribute("tabindex"), "-1", "made focusable for the move");
		assertEqual(heading.textContent.trim(), "Card A", "and its name is the page title a screen reader announces");
		await assertNoViolations(heading);
	});
});
