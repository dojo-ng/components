// dj-card navigation (C3): `path` makes the body a real link, a plain click becomes dj-navigate,
// `track` marks the current page. Uses a real installHistory on a fake window (see
// fake-history-window.js). A card with no `path` must render as it always did. Real keyboard
// reachability and the link role are in tests/browser/card.test.js.
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/card/dist/index.js";
import { installFakeHistory } from "./fake-history-window.js";

const tick = async (n = 2) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };

async function card(props = {}, { text = "Body" } = {}) {
	const el = document.createElement("dj-card");
	Object.assign(el, props);
	el.textContent = text;
	document.body.appendChild(el);
	await settled(el);
	return el;
}
const body = (el) => el.renderRoot.querySelector('[part="body"]');
function withHistory(t, options) {
	const env = installFakeHistory(options);
	t.after(() => env.stop());
	return env;
}
function listen(t, type) {
	const seen = [];
	const fn = (e) => seen.push(e);
	document.addEventListener(type, fn);
	t.after(() => document.removeEventListener(type, fn));
	return seen;
}
const click = (el, init = {}) => {
	const event = new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, button: 0, ...init });
	body(el).dispatchEvent(event);
	return event;
};

test("a card without path renders exactly as before: a div body, no link, no new attributes", async () => {
	const plain = await card({ title: "T" });
	assert.equal(body(plain).tagName, "DIV");
	assert.equal(body(plain).getAttribute("role"), null);
	assert.equal(body(plain).getAttribute("tabindex"), null);
	assert.equal(body(plain).className.trim(), "body");
	assert.equal(plain.renderRoot.querySelector("a"), null);
	assert.equal(plain.path, undefined);
	assert.equal(plain.track, false);
	const clickable = await card({ clickable: true });
	assert.equal(body(clickable).tagName, "DIV");
	assert.equal(body(clickable).getAttribute("role"), "button");
	assert.equal(body(clickable).getAttribute("tabindex"), "0");
	plain.remove();
	clickable.remove();
});

test("path renders the body as a link with href, keeping the part and the slots", async () => {
	const el = await card({ path: "/orders/7", title: "Order 7" });
	const a = body(el);
	assert.equal(a.tagName, "A");
	assert.equal(a.getAttribute("href"), "/orders/7");
	assert.equal(a.getAttribute("part"), "body");
	assert.equal(a.getAttribute("role"), null);
	assert.ok(a.querySelector("slot:not([name])"), "the default slot is inside the link");
	assert.equal(a.querySelector(".title").textContent, "Order 7");
	assert.equal(el.renderRoot.querySelector('slot[name="actions"]').closest("a"), null, "actions sit outside the link");
	el.remove();
});

test("path wins over clickable: a link, not a button", async () => {
	const el = await card({ path: "/x", clickable: true });
	assert.equal(body(el).tagName, "A");
	assert.equal(body(el).getAttribute("role"), null);
	assert.equal(body(el).getAttribute("tabindex"), null);
	el.remove();
});

test("the href includes the history base", async (t) => {
	withHistory(t, { base: "/acme", window: { url: "http://example.test/acme/" } });
	const el = await card({ path: "/orders/7" });
	assert.equal(body(el).getAttribute("href"), "/acme/orders/7");
	el.remove();
});

test("a plain click dispatches dj-navigate with the path and title, and does not follow the link", async (t) => {
	const { h } = withHistory(t);
	const navigates = listen(t, "dj-navigate");
	const el = await card({ path: "/orders/7", title: "Order 7" });
	const event = click(el);
	assert.equal(event.defaultPrevented, true);
	assert.equal(navigates.length, 1);
	assert.deepEqual(navigates[0].detail, { path: "/orders/7", label: "Order 7" });
	assert.equal(h.current.path, "/orders/7", "and history navigated");
	el.remove();
});

test("modified and non-primary clicks are left to the browser: no dj-navigate, not prevented", async (t) => {
	withHistory(t);
	const navigates = listen(t, "dj-navigate");
	const el = await card({ path: "/orders/7" });
	for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
		const event = click(el, init);
		assert.equal(event.defaultPrevented, false, JSON.stringify(init));
	}
	assert.equal(navigates.length, 0);
	el.remove();
});

test("a click that is already prevented is not handled", async (t) => {
	withHistory(t);
	const navigates = listen(t, "dj-navigate");
	const el = await card({ path: "/orders/7" });
	body(el).addEventListener("click", (e) => e.preventDefault(), { capture: true });
	click(el);
	assert.equal(navigates.length, 0);
	el.remove();
});

test("with no history installed, a plain click is not intercepted", async (t) => {
	const navigates = listen(t, "dj-navigate");
	const el = await card({ path: "/orders/7" });
	const event = click(el);
	assert.equal(event.defaultPrevented, false);
	assert.equal(navigates.length, 0);
	el.remove();
});

test("track: aria-current follows the location", async (t) => {
	const { h } = withHistory(t);
	const el = await card({ path: "/a", track: true });
	assert.equal(body(el).getAttribute("aria-current"), null);
	h.go("/a");
	await settled(el);
	assert.equal(body(el).getAttribute("aria-current"), "page");
	h.go("/b");
	await settled(el);
	assert.equal(body(el).getAttribute("aria-current"), null);
	h.back();
	await settled(el);
	assert.equal(body(el).getAttribute("aria-current"), "page");
	el.remove();
});

test("track: a card whose path is the landing location is current from the start", async (t) => {
	withHistory(t, { window: { url: "http://example.test/a" } });
	const el = await card({ path: "/a", track: true });
	assert.equal(body(el).getAttribute("aria-current"), "page");
	el.remove();
});

test("without track, aria-current is never set", async (t) => {
	const { h } = withHistory(t);
	const el = await card({ path: "/a" });
	h.go("/a");
	await settled(el);
	assert.equal(body(el).getAttribute("aria-current"), null);
	el.remove();
});

test("track: history installed after the card connects starts the tracking, and the href gains the base", async (t) => {
	const el = await card({ path: "/a", track: true });
	assert.equal(body(el).getAttribute("href"), "/a");
	withHistory(t, { base: "/acme", window: { url: "http://example.test/acme/a" } });
	await tick();
	await settled(el);
	assert.equal(body(el).getAttribute("aria-current"), "page");
	assert.equal(body(el).getAttribute("href"), "/acme/a");
	el.remove();
});

test("track: toggling it off stops following; removing the card stops following", async (t) => {
	const { h } = withHistory(t);
	const el = await card({ path: "/a", track: true });
	h.go("/a");
	await settled(el);
	assert.equal(body(el).getAttribute("aria-current"), "page");
	el.track = false;
	await settled(el);
	assert.equal(body(el).getAttribute("aria-current"), null);
	h.go("/b");
	h.go("/a");
	await settled(el);
	assert.equal(body(el).getAttribute("aria-current"), null, "no longer following");
	el.track = true;
	await settled(el);
	assert.equal(body(el).getAttribute("aria-current"), "page", "following again, and the current location is replayed");

	el.remove();
	const updates = t.mock.method(el, "requestUpdate");
	h.go("/c");
	await tick();
	assert.equal(updates.mock.callCount(), 0, "a removed card is not updated");
});
