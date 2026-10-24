// dj-breadcrumb-group with track (C7), against a real installHistory from @dojo-ng/history given a
// fake window (see fake-history-window.js). Real-browser behavior (the tree driving the crumbs,
// the landmark name, axe) is in tests/browser/breadcrumb-group.test.js.
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/breadcrumb-group/dist/index.js";
import { installFakeHistory } from "./fake-history-window.js";

const tick = async (n = 2) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };

function withHistory(t, options) {
	const env = installFakeHistory(options);
	t.after(() => env.stop());
	return env;
}

async function group(props = {}) {
	const el = document.createElement("dj-breadcrumb-group");
	Object.assign(el, props);
	document.body.appendChild(el);
	await settled(el);
	await tick();
	await settled(el);
	return el;
}

const items = (el) => [...el.renderRoot.querySelectorAll("li")].map((li) => {
	const link = li.querySelector("a");
	const current = li.querySelector("[aria-current]");
	return { label: (link ?? current).textContent.trim(), href: link?.getAttribute("href") ?? null, current: current?.getAttribute("aria-current") ?? null };
});
const click = async (el, index, init = {}) => {
	const link = el.renderRoot.querySelectorAll("li a")[index];
	const event = new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, button: 0, ...init });
	link.dispatchEvent(event);
	await tick();
	await settled(el);
	return event;
};

const TRAIL = [{ path: "/orders", label: "Orders" }, { path: "/orders/7", label: "Order 7" }, { path: "/orders/7/items", label: "Items" }];

test("without track, items render as before and the landmark is named Breadcrumb", async () => {
	const el = await group({ items: [{ label: "Home", href: "/" }, { label: "Docs", href: "/docs" }, { label: "Here", current: true }] });
	assert.deepEqual(items(el), [
		{ label: "Home", href: "/", current: null },
		{ label: "Docs", href: "/docs", current: null },
		{ label: "Here", href: null, current: "page" },
	]);
	assert.equal(el.renderRoot.querySelector("nav").getAttribute("aria-label"), "Breadcrumb");
	el.remove();
});

test("track with a trail: one crumb per entry, hrefs from history, the last current", async (t) => {
	const { h } = withHistory(t, { base: "/app" });
	const el = await group({ track: true });
	h.go("/orders/7/items", undefined, { trail: TRAIL });
	await settled(el);
	assert.deepEqual(items(el), [
		{ label: "Orders", href: "/app/orders", current: null },
		{ label: "Order 7", href: "/app/orders/7", current: null },
		{ label: "Items", href: null, current: "page" },
	]);
	el.remove();
});

test("track without a trail: segments of the path, named by resolveTitle or decoded", async (t) => {
	const { h } = withHistory(t);
	const el = await group({ track: true, resolveTitle: (path) => (path === "/orders" ? "Orders" : undefined) });
	h.go("/orders/caf%C3%A9?x=1#top");
	await settled(el);
	assert.deepEqual(items(el), [
		{ label: "Orders", href: "/orders", current: null },
		{ label: "café", href: null, current: "page" },
	]);
	el.remove();
});

test("track ignores items while history is installed", async (t) => {
	const { h } = withHistory(t);
	const el = await group({ track: true, items: [{ label: "Mine", href: "/mine" }] });
	h.go("/a/b");
	await settled(el);
	assert.deepEqual(items(el).map((c) => c.label), ["a", "b"]);
	el.remove();
});

test("a plain click on a crumb navigates there with the trail up to it", async (t) => {
	const { h, win } = withHistory(t);
	const el = await group({ track: true });
	h.go("/orders/7/items", undefined, { trail: TRAIL });
	await settled(el);
	const event = await click(el, 1);
	assert.equal(event.defaultPrevented, true);
	assert.equal(h.current.path, "/orders/7");
	assert.equal(h.current.source, "go");
	assert.deepEqual(h.current.trail, TRAIL.slice(0, 2));
	assert.equal(win.paths.at(-1), "/orders/7");
	assert.deepEqual(items(el).map((c) => c.current), [null, "page"]);
	el.remove();
});

test("a plain click without a trail passes the segment trail", async (t) => {
	const { h } = withHistory(t);
	const el = await group({ track: true });
	h.go("/a/b/c");
	await settled(el);
	await click(el, 0);
	assert.equal(h.current.path, "/a");
	assert.deepEqual(h.current.trail, [{ path: "/a", label: "a" }]);
	el.remove();
});

test("dj-navigate carries path, label and trail", async (t) => {
	const { h } = withHistory(t);
	const el = await group({ track: true });
	const seen = [];
	document.addEventListener("dj-navigate", (e) => seen.push(e.detail), { once: true });
	h.go("/orders/7", undefined, { trail: TRAIL.slice(0, 2) });
	await settled(el);
	await click(el, 0);
	assert.deepEqual(seen[0], { path: "/orders", label: "Orders", trail: [{ path: "/orders", label: "Orders" }] });
	el.remove();
});

test("a modified click or middle-click is left to the browser", async (t) => {
	const { h, win } = withHistory(t);
	const el = await group({ track: true });
	h.go("/a/b");
	await settled(el);
	const entries = win.history.length;
	for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
		const event = await click(el, 0, init);
		assert.equal(event.defaultPrevented, false, JSON.stringify(init));
	}
	assert.equal(win.history.length, entries);
	assert.equal(h.current.path, "/a/b");
	el.remove();
});

test("an annotate that adds a trail re-publishes and the crumbs follow", async (t) => {
	const { h } = withHistory(t);
	const el = await group({ track: true });
	h.go("/orders/7");
	await settled(el);
	assert.deepEqual(items(el).map((c) => c.label), ["orders", "7"]);
	h.annotate({ trail: [{ path: "/orders", label: "Orders" }, { path: "/orders/7", label: "Order 7" }] });
	await settled(el);
	assert.deepEqual(items(el).map((c) => c.label), ["Orders", "Order 7"]);
	el.remove();
});

test("track with nothing installed is inert: items show as plain links and a click is not intercepted", async () => {
	const el = await group({ track: true, items: [{ label: "Home", href: "/" }, { label: "Here", current: true }] });
	assert.deepEqual(items(el).map((c) => c.label), ["Home", "Here"]);
	const event = await click(el, 0);
	assert.equal(event.defaultPrevented, false);
	el.remove();
});

test("track installed after the element connects starts following", async (t) => {
	const el = await group({ track: true });
	const { h } = withHistory(t, { window: { url: "http://example.test/x/y" } });
	await tick();
	await settled(el);
	assert.deepEqual(items(el).map((c) => c.label), ["x", "y"]);
	h.go("/z");
	await settled(el);
	assert.deepEqual(items(el).map((c) => c.label), ["z"]);
	el.remove();
});

test("turning track off goes back to items", async (t) => {
	const { h } = withHistory(t);
	const el = await group({ track: true, items: [{ label: "Mine", href: "/mine" }] });
	h.go("/a/b");
	await settled(el);
	el.track = false;
	await settled(el);
	assert.deepEqual(items(el).map((c) => c.label), ["Mine"]);
	el.remove();
});
