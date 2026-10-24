// Behavior tests for dj-nav. happy-dom does no layout and evaluates no container queries — that
// is the N7 browser check — so these cover the JS-observable behavior that does not depend on the
// computed `--dj-nav-collapsed` value: registration, ARIA on the expanded arrangement, i18n label
// overrides, the show/hide/toggle state machine and its event, and plain property reflection. Do
// not test collapse behavior here (see nav-collapse-spec.md task N6).
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/nav/dist/index.js";

/** Build a dj-nav with `count` slotted <a> links and the given props, then settle. */
async function build(props = {}, count = 2) {
	const el = document.createElement("dj-nav");
	for (const [k, v] of Object.entries(props)) el[k] = v;
	for (let i = 0; i < count; i++) {
		const a = document.createElement("a");
		a.href = `/link-${i + 1}`;
		a.textContent = `Link ${i + 1}`;
		el.appendChild(a);
	}
	document.body.appendChild(el);
	await settled(el);
	return el;
}

test("registers <dj-nav>", () => {
	assert.equal(typeof customElements.get("dj-nav"), "function");
});

test("expanded arrangement: slotted anchors land inside a <nav> with the default aria-label", async () => {
	const el = await build();
	// happy-dom evaluates no container query, so an unforced instance stays expanded — this is
	// the state the rest of this file relies on, not itself a claim about collapse behavior.
	assert.equal(el.collapsed, false);
	const nav = el.renderRoot.querySelector("nav");
	assert.ok(nav, "a <nav> renders");
	assert.equal(nav.getAttribute("aria-label"), "Navigation");
	const slot = nav.querySelector("slot");
	const assigned = slot.assignedElements({ flatten: true });
	assert.equal(assigned.length, 2);
	assert.equal(assigned[0].tagName, "A");
});

test("label overrides the i18n default on the <nav>", async () => {
	const el = await build({ label: "Site" });
	const nav = el.renderRoot.querySelector("nav");
	assert.equal(nav.getAttribute("aria-label"), "Site");
});

test("triggerLabel overrides the i18n default on the trigger", async () => {
	// Forces the collapsed arrangement directly by pinning the token, purely to reach the
	// trigger markup for this label check — not a claim about resize/threshold behavior.
	const el = document.createElement("dj-nav");
	el.style.setProperty("--dj-nav-collapsed", "1");
	el.triggerLabel = "Open menu";
	document.body.appendChild(el);
	await settled(el);
	const trigger = el.renderRoot.querySelector(".trigger");
	assert.ok(trigger, "the trigger renders once collapsed");
	assert.equal(trigger.getAttribute("aria-label"), "Open menu");
});

test("show()/hide()/toggle() flip open and each emits exactly one dj-nav-toggle with the right detail", async () => {
	const el = await build();
	const events = [];
	el.addEventListener("dj-nav-toggle", (e) => events.push(e.detail));

	await el.show();
	assert.equal(el.open, true);
	assert.deepEqual(events, [{ open: true }]);

	await el.show(); // already open: no-op, no re-emit
	assert.deepEqual(events, [{ open: true }]);

	el.hide();
	await settled(el);
	assert.equal(el.open, false);
	assert.deepEqual(events, [{ open: true }, { open: false }]);

	el.hide(); // already closed: no-op
	await settled(el);
	assert.deepEqual(events, [{ open: true }, { open: false }]);

	el.toggle();
	await settled(el);
	assert.equal(el.open, true);
	assert.deepEqual(events, [{ open: true }, { open: false }, { open: true }]);

	el.toggle();
	await settled(el);
	assert.equal(el.open, false);
	assert.deepEqual(events, [{ open: true }, { open: false }, { open: true }, { open: false }]);
});

test("panel reflects to the attribute", async () => {
	const el = await build();
	assert.equal(el.getAttribute("panel"), "drawer", "default");
	el.panel = "overlay";
	await settled(el);
	assert.equal(el.getAttribute("panel"), "overlay");
	el.panel = "dropdown";
	await settled(el);
	assert.equal(el.getAttribute("panel"), "dropdown");
});

// --- track (C8): clicks become navigations, the current link is marked ----------------------------
// The fake window double stands in for the browser's History API; the real-browser run (collapsed
// drawer, axe) is in tests/browser/nav.test.js.
import { installFakeHistory } from "./fake-history-window.js";

const tickNav = async (n = 2) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };

function withHistory(t, options) {
	const env = installFakeHistory(options);
	t.after(() => env.stop());
	return env;
}

async function tracked(props = {}, links) {
	const el = document.createElement("dj-nav");
	el.track = true;
	Object.assign(el, props);
	for (const [href, attrs] of links ?? [["/link-1", {}], ["/link-2", {}]]) {
		const a = document.createElement("a");
		a.setAttribute("href", href);
		for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
		a.textContent = `Link ${href}`;
		el.appendChild(a);
	}
	document.body.appendChild(el);
	await settled(el);
	await tickNav();
	await settled(el);
	return el;
}
const linkAt = (el, i) => el.querySelectorAll("a")[i];
const clickLink = async (el, i, init = {}) => {
	const event = new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, button: 0, ...init });
	linkAt(el, i).dispatchEvent(event);
	await tickNav();
	await settled(el);
	return event;
};
const currentOf = (el) => [...el.querySelectorAll("a")].map((a) => a.getAttribute("aria-current"));

test("track: a plain click on a link navigates through history and is not followed by the browser", async (t) => {
	const { h } = withHistory(t);
	const el = await tracked();
	const seen = [];
	document.addEventListener("dj-navigate", (e) => seen.push(e.detail), { once: true });
	const event = await clickLink(el, 1);
	assert.equal(event.defaultPrevented, true);
	assert.deepEqual(seen[0], { path: "/link-2", label: "Link /link-2" });
	assert.equal(h.current.path, "/link-2");
	assert.equal(h.current.source, "go");
	el.remove();
});

test("track: modified clicks, other buttons, target, download and other origins pass through", async (t) => {
	const { h } = withHistory(t);
	const el = await tracked({}, [
		["/plain", {}],
		["/blank", { target: "_blank" }],
		["/file", { download: "" }],
		["https://other.example/page", {}],
	]);
	for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
		assert.equal((await clickLink(el, 0, init)).defaultPrevented, false, JSON.stringify(init));
	}
	for (const i of [1, 2, 3]) assert.equal((await clickLink(el, i)).defaultPrevented, false, `link ${i}`);
	assert.equal(h.current.path, "/", "nothing navigated");
	el.remove();
});

test("track: _self is treated as a plain link", async (t) => {
	const { h } = withHistory(t);
	const el = await tracked({}, [["/self", { target: "_self" }]]);
	assert.equal((await clickLink(el, 0)).defaultPrevented, true);
	assert.equal(h.current.path, "/self");
	el.remove();
});

test("track: aria-current follows go, Back and Forward, and only on an exact match", async (t) => {
	const { h } = withHistory(t);
	const el = await tracked({}, [["/orders", {}], ["/orders/7", {}]]);
	assert.deepEqual(currentOf(el), [null, null]);
	h.go("/orders/7");
	await settled(el);
	assert.deepEqual(currentOf(el), [null, "page"], "/orders is not current at /orders/7");
	h.go("/orders");
	await settled(el);
	assert.deepEqual(currentOf(el), ["page", null]);
	h.back();
	await settled(el);
	assert.deepEqual(currentOf(el), [null, "page"]);
	h.forward();
	await settled(el);
	assert.deepEqual(currentOf(el), ["page", null]);
	el.remove();
});

test("track: links added later are marked, through slotchange", async (t) => {
	const { h } = withHistory(t, { window: { url: "http://example.test/late" } });
	const el = await tracked({}, [["/other", {}]]);
	const a = document.createElement("a");
	a.setAttribute("href", "/late");
	a.textContent = "Late";
	el.appendChild(a);
	await tickNav();
	await settled(el);
	assert.equal(a.getAttribute("aria-current"), "page");
	assert.equal(h.current.path, "/late");
	el.remove();
});

test("track with a base: hrefs under it map to app paths, others are left alone", async (t) => {
	const { h } = withHistory(t, { base: "/app" });
	const el = await tracked({}, [["/app/orders", {}], ["/elsewhere", {}]]);
	assert.equal((await clickLink(el, 1)).defaultPrevented, false, "outside the base");
	assert.equal((await clickLink(el, 0)).defaultPrevented, true);
	assert.equal(h.current.path, "/orders");
	assert.deepEqual(currentOf(el), ["page", null]);
	el.remove();
});

test("track in hash mode: #/ links are app paths", async (t) => {
	const { h } = withHistory(t, { mode: "hash" });
	const el = await tracked({}, [["#/orders", {}], ["#section", {}]]);
	assert.equal((await clickLink(el, 1)).defaultPrevented, false, "an in-page anchor is not a route");
	assert.equal((await clickLink(el, 0)).defaultPrevented, true);
	assert.equal(h.current.path, "/orders");
	el.remove();
});

test("track off: clicks pass through and aria-current is cleared", async (t) => {
	const { h } = withHistory(t);
	const el = await tracked();
	h.go("/link-1");
	await settled(el);
	assert.deepEqual(currentOf(el), ["page", null]);
	el.track = false;
	await settled(el);
	assert.deepEqual(currentOf(el), [null, null], "the marks this component set are removed");
	assert.equal((await clickLink(el, 1)).defaultPrevented, false);
	el.remove();
});

test("track leaves an aria-current the app set itself alone", async (t) => {
	const { h } = withHistory(t);
	const el = await tracked({}, [["/mine", { "aria-current": "location" }], ["/link-2", {}]]);
	el.track = false;
	await settled(el);
	assert.equal(linkAt(el, 0).getAttribute("aria-current"), "location");
	el.remove();
	void h;
});

test("track with no history installed is inert", async () => {
	const el = await tracked();
	assert.equal((await clickLink(el, 0)).defaultPrevented, false);
	assert.deepEqual(currentOf(el), [null, null]);
	el.remove();
});

test("track: installing history after the element connects starts following", async (t) => {
	const el = await tracked();
	const { h } = withHistory(t, { window: { url: "http://example.test/link-2" } });
	await tickNav();
	await settled(el);
	assert.deepEqual(currentOf(el), [null, "page"]);
	h.go("/link-1");
	await settled(el);
	assert.deepEqual(currentOf(el), ["page", null]);
	el.remove();
});
