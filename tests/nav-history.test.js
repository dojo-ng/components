// @dojo-ng/nav-history: HistoryController (C1) and dj-back-button (C2), against a real
// installHistory from @dojo-ng/history given a fake window (see fake-history-window.js). happy-dom
// does no layout and has no tooltips on hover, so the real-browser behavior (keyboard activation,
// accessible name, axe) is in tests/browser/nav-history.test.js.
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { html } from "lit";
import DojoElement from "../packages/dojo-element/dist/index.js";
import { whenHistory } from "@dojo-ng/history/handle";
import { HistoryController } from "../packages/nav-history/dist/index.js";
import { installFakeHistory } from "./fake-history-window.js";

const tick = async (n = 2) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };

// --- HistoryController (C1) -----------------------------------------------------------------

class NavHost extends DojoElement {
	renders = 0;
	nav = new HistoryController(this);
	render() {
		this.renders++;
		return html`<span id="path">${this.nav.location?.path ?? "none"}</span>`;
	}
}
customElements.define("x-nav-host", NavHost);

async function host() {
	const el = document.createElement("x-nav-host");
	document.body.appendChild(el);
	await settled(el);
	return el;
}
const shownPath = (el) => el.renderRoot.querySelector("#path").textContent;

/** Install history for the length of one test. */
function withHistory(t, options) {
	const env = installFakeHistory(options);
	t.after(() => env.stop());
	return env;
}

test("HistoryController: with nothing installed, location and history are undefined and nothing throws", async () => {
	const el = await host();
	assert.equal(el.nav.location, undefined);
	assert.equal(el.nav.history, undefined);
	assert.equal(shownPath(el), "none");
	el.remove();
});

test("HistoryController: history installed before connect: location is the landing path at once", async (t) => {
	const { h } = withHistory(t, { window: { url: "http://example.test/start" } });
	const el = await host();
	assert.equal(el.nav.history, h);
	assert.equal(el.nav.location.path, "/start");
	assert.equal(shownPath(el), "/start");
	el.remove();
});

test("HistoryController: installing after connect starts updates", async (t) => {
	const el = await host();
	const before = el.renders;
	const { h } = withHistory(t, { window: { url: "http://example.test/late" } });
	await tick(); // whenHistory() resolves on a microtask
	await settled(el);
	assert.equal(el.nav.history, h);
	assert.equal(shownPath(el), "/late");
	assert.ok(el.renders > before, "the host re-rendered");
	el.remove();
});

test("HistoryController: a go re-renders the host", async (t) => {
	const { h } = withHistory(t);
	const el = await host();
	h.go("/orders/7");
	await settled(el);
	assert.equal(shownPath(el), "/orders/7");
	h.back();
	await settled(el);
	assert.equal(shownPath(el), "/");
	el.remove();
});

test("HistoryController: after disconnect, a go does not update the host", async (t) => {
	const { h } = withHistory(t);
	const el = await host();
	el.remove();
	const renders = el.renders;
	h.go("/after");
	await tick();
	assert.equal(el.renders, renders);
	assert.equal(el.nav.location, undefined);
	assert.equal(el.nav.history, undefined);
});

test("HistoryController: an install that finishes after the host disconnected does not subscribe it", async (t) => {
	const el = await host();
	el.remove();
	const renders = el.renders;
	const { h } = withHistory(t);
	await tick();
	h.go("/x");
	await tick();
	assert.equal(el.renders, renders);
	assert.equal(el.nav.history, undefined);
});

test("HistoryController: reconnecting starts following again", async (t) => {
	const { h } = withHistory(t);
	const el = await host();
	el.remove();
	document.body.appendChild(el);
	await settled(el);
	h.go("/again");
	await settled(el);
	assert.equal(shownPath(el), "/again");
	el.remove();
});

test("whenHistory resolves with the installed instance", async (t) => {
	const waiting = whenHistory();
	const { h } = withHistory(t);
	assert.equal(await waiting, h);
});

// --- dj-back-button (C2) --------------------------------------------------------------------

await import("../packages/nav-history/dist/index.js");

const ORDERS_TRAIL = [{ path: "/orders", label: "Orders" }, { path: "/orders/7", label: "Order 7" }];

async function back(props = {}) {
	const el = document.createElement("dj-back-button");
	Object.assign(el, props);
	document.body.appendChild(el);
	await settled(el);
	await tick();
	await settled(el);
	return el;
}
const inner = (el) => el.renderRoot.querySelector("dj-button");
const text = (el) => inner(el).textContent.trim();
const click = async (el) => { inner(el).dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true })); await tick(); await settled(el); };

/** Collect events of a type that reach the document. */
function listen(t, type) {
	const seen = [];
	const fn = (e) => seen.push(e);
	document.addEventListener(type, fn);
	t.after(() => document.removeEventListener(type, fn));
	return seen;
}

test("registers <dj-back-button> and renders a dj-button", async () => {
	assert.equal(typeof customElements.get("dj-back-button"), "function");
	const el = await back();
	assert.ok(inner(el), "a dj-button renders");
	assert.equal(inner(el).getAttribute("kind"), "text");
	el.remove();
});

test("history mode: disabled when there is nothing to go back to, enabled after a go; a click goes Back", async (t) => {
	const { h, win } = withHistory(t);
	const el = await back();
	assert.equal(text(el), "Back");
	assert.equal(inner(el).hasAttribute("disabled"), true);
	h.go("/a");
	await settled(el);
	assert.equal(inner(el).hasAttribute("disabled"), false);
	await click(el);
	assert.equal(h.current.path, "/");
	assert.equal(h.current.source, "pop");
	assert.equal(win.history.length, 2, "Back adds no entry");
	await settled(el);
	assert.equal(inner(el).hasAttribute("disabled"), true);
	el.remove();
});

test("history mode with no history installed: never disabled, and a click calls window.history.back()", async (t) => {
	const back_ = t.mock.method(window.history, "back", () => {});
	const el = await back();
	assert.equal(inner(el).hasAttribute("disabled"), false);
	await click(el);
	assert.equal(back_.mock.callCount(), 1);
	el.remove();
});

test("up mode with a trail: the target is the second-to-last entry and the label names it", async (t) => {
	const { h } = withHistory(t);
	const el = await back({ mode: "up" });
	const navigates = listen(t, "dj-navigate");
	const backs = listen(t, "dj-back");
	h.go("/orders/7", undefined, { trail: ORDERS_TRAIL });
	await settled(el);
	assert.equal(text(el), "Back to Orders");
	assert.equal(inner(el).hasAttribute("disabled"), false);
	await click(el);
	assert.deepEqual(backs[0].detail, { mode: "up", target: "/orders" });
	assert.equal(navigates.length, 1);
	assert.deepEqual(navigates[0].detail, { path: "/orders", label: "Orders", trail: [{ path: "/orders", label: "Orders" }] });
	assert.equal(h.current.path, "/orders", "dj-navigate went through history");
	assert.deepEqual(h.current.trail, [{ path: "/orders", label: "Orders" }]);
	el.remove();
});

test("up mode without a trail: strips the last segment, and resolveTitle supplies the title", async (t) => {
	const { h } = withHistory(t);
	const titles = { "/orders/7": "Order 7" };
	const el = await back({ mode: "up", resolveTitle: (path) => titles[path] });
	h.go("/orders/7/lines");
	await settled(el);
	assert.equal(text(el), "Back to Order 7");
	await click(el);
	assert.equal(h.current.path, "/orders/7");
	await settled(el);
	assert.equal(text(el), "Back", "no title for /orders, so the plain label");
	el.remove();
});

test("up mode without resolveTitle: plain Back, still going up", async (t) => {
	const { h } = withHistory(t);
	const el = await back({ mode: "up" });
	h.go("/a/b");
	await settled(el);
	assert.equal(text(el), "Back");
	await click(el);
	assert.equal(h.current.path, "/a");
	el.remove();
});

test("up mode at the top level behaves exactly like history mode", async (t) => {
	const { h, win } = withHistory(t);
	const el = await back({ mode: "up" });
	const backs = listen(t, "dj-back");
	const navigates = listen(t, "dj-navigate");
	h.go("/orders");
	await settled(el);
	assert.equal(text(el), "Back");
	assert.equal(inner(el).hasAttribute("disabled"), false, "history can go back");
	await click(el);
	assert.deepEqual(backs[0].detail, { mode: "history", target: undefined });
	assert.equal(navigates.length, 0);
	assert.equal(h.current.source, "pop");
	assert.equal(win.history.length, 2);
	await settled(el);
	assert.equal(inner(el).hasAttribute("disabled"), true, "and at the landing entry it is disabled, as in history mode");
	el.remove();
});

test("up mode with a one-entry trail is the top level", async (t) => {
	const { h } = withHistory(t);
	const el = await back({ mode: "up" });
	h.go("/orders", undefined, { trail: [{ path: "/orders", label: "Orders" }] });
	await settled(el);
	assert.equal(text(el), "Back");
	el.remove();
});

test("dj-back is cancelable: preventDefault stops the navigation, in both modes", async (t) => {
	const { h, win } = withHistory(t);
	const el = await back({ mode: "up" });
	const navigates = listen(t, "dj-navigate");
	h.go("/a/b");
	await settled(el);
	const stop = (e) => e.preventDefault();
	el.addEventListener("dj-back", stop);
	await click(el);
	assert.equal(navigates.length, 0);
	assert.equal(h.current.path, "/a/b");
	el.mode = "history";
	await settled(el);
	await click(el);
	assert.equal(h.current.path, "/a/b");
	assert.equal(h.current.source, "go");
	el.removeEventListener("dj-back", stop);
	await click(el);
	assert.equal(h.current.path, "/", "without the listener, Back happens");
	assert.equal(win.history.length, 2);
	el.remove();
});

test("the label updates when a trail arrives late (an annotate re-publish), with no delay", async (t) => {
	const { h } = withHistory(t, { window: { url: "http://example.test/orders/7" } });
	const el = await back({ mode: "up" });
	assert.equal(text(el), "Back", "no trail and no resolveTitle yet");
	h.annotate({ trail: ORDERS_TRAIL });
	await settled(el);
	assert.equal(text(el), "Back to Orders");
	el.remove();
});

test("label overrides the computed text", async (t) => {
	const { h } = withHistory(t);
	const el = await back({ mode: "up", label: "Go up" });
	h.go("/a/b", undefined, { trail: [{ path: "/a", label: "A" }, { path: "/a/b", label: "B" }] });
	await settled(el);
	assert.equal(text(el), "Go up");
	el.remove();
});

test("the label is localized through the dj message namespace", async (t) => {
	const { messages } = await import("../packages/i18n/dist/index.js");
	messages.register("dj", "de", { back: "Zurück", backTo: "Zurück zu {title}" });
	const { h } = withHistory(t);
	const el = document.createElement("dj-back-button");
	el.setAttribute("lang", "de");
	el.mode = "up";
	document.body.appendChild(el);
	await settled(el);
	assert.equal(text(el), "Zurück");
	h.go("/a/b", undefined, { trail: [{ path: "/a", label: "A" }, { path: "/a/b", label: "B" }] });
	await settled(el);
	assert.equal(text(el), "Zurück zu A");
	el.remove();
});

test("the accessible name is the visible label: text in the button, or aria-label with icon-only", async (t) => {
	const { h } = withHistory(t);
	const el = await back({ mode: "up" });
	h.go("/a/b", undefined, { trail: [{ path: "/a", label: "A" }, { path: "/a/b", label: "B" }] });
	await settled(el);
	assert.equal(text(el), "Back to A");
	assert.equal(el.renderRoot.querySelector("dj-tooltip"), null, "no tooltip when the label is visible");
	assert.equal(inner(el).getAttribute("aria-label"), null);

	el.iconOnly = true;
	await settled(el);
	assert.equal(inner(el).getAttribute("aria-label"), "Back to A");
	assert.equal(text(el), "", "only the arrow shows");
	const tip = el.renderRoot.querySelector("dj-tooltip");
	assert.ok(tip, "icon-only gets a tooltip");
	assert.equal(tip.querySelector('[slot="content"]').textContent.trim(), "Back to A");
	el.remove();
});

test("the accessible name is never empty, even before history is installed", async () => {
	const el = await back();
	assert.notEqual(text(el), "");
	el.iconOnly = true;
	await settled(el);
	assert.ok(inner(el).getAttribute("aria-label"));
	el.remove();
});

// --- dj-forward-button (C6) -----------------------------------------------------------------

async function forward(props = {}) {
	const el = document.createElement("dj-forward-button");
	Object.assign(el, props);
	document.body.appendChild(el);
	await settled(el);
	await tick();
	await settled(el);
	return el;
}

test("registers <dj-forward-button> and renders a dj-button labeled Forward", async () => {
	assert.equal(typeof customElements.get("dj-forward-button"), "function");
	const el = await forward();
	assert.equal(inner(el).getAttribute("kind"), "text");
	assert.equal(text(el), "Forward");
	el.remove();
});

test("forward: disabled until a Back, enabled after it, and disabled again after a new push", async (t) => {
	const { h } = withHistory(t);
	const el = await forward();
	h.go("/a");
	h.go("/b");
	await settled(el);
	assert.equal(inner(el).hasAttribute("disabled"), true, "nothing ahead yet");
	h.back();
	await settled(el);
	assert.equal(inner(el).hasAttribute("disabled"), false, "Back made Forward possible");
	h.go("/c");
	await settled(el);
	assert.equal(inner(el).hasAttribute("disabled"), true, "a push clears Forward");
	el.remove();
});

test("forward: a click goes Forward, publishing a pop, and adds no entry", async (t) => {
	const { h, win } = withHistory(t);
	const el = await forward();
	h.go("/a");
	h.back();
	await settled(el);
	const length = win.history.length;
	await click(el);
	assert.equal(h.current.path, "/a");
	assert.equal(h.current.source, "pop");
	assert.equal(win.history.length, length);
	await settled(el);
	assert.equal(inner(el).hasAttribute("disabled"), true, "back at the end of the stack");
	el.remove();
});

test("forward: dj-forward is cancelable and has an empty detail; preventDefault stops the move", async (t) => {
	const { h } = withHistory(t);
	const el = await forward();
	h.go("/a");
	h.back();
	await settled(el);
	const seen = listen(t, "dj-forward");
	el.addEventListener("dj-forward", (e) => e.preventDefault());
	await click(el);
	assert.equal(seen.length, 1);
	assert.equal(seen[0].cancelable, true);
	assert.deepEqual(seen[0].detail ?? {}, {});
	assert.equal(h.current.path, "/", "still where Back left it");
	el.remove();
});

test("forward: label replaces the text; icon-only keeps it as the accessible name in a tooltip", async () => {
	const el = await forward({ label: "Next page" });
	assert.equal(text(el), "Next page");
	el.remove();

	const iconOnly = await forward({ iconOnly: true });
	assert.equal(inner(iconOnly).getAttribute("aria-label"), "Forward");
	assert.equal(iconOnly.renderRoot.querySelector("dj-tooltip [slot=content]").textContent.trim(), "Forward");
	iconOnly.remove();
});

test("forward with no history installed: never disabled, and a click calls window.history.forward()", async (t) => {
	const forward_ = t.mock.method(window.history, "forward", () => {});
	const el = await forward();
	assert.equal(inner(el).hasAttribute("disabled"), false);
	await click(el);
	assert.equal(forward_.mock.callCount(), 1);
	el.remove();
});

// --- confirmLeave (C9) ----------------------------------------------------------------------

const { confirmLeave } = await import("../packages/nav-history/dist/index.js");

const confirmDialog = () => document.querySelector("dj-dialog[data-confirm-leave]");
const choose = async (which) => {
	const dialog = confirmDialog();
	const button = [...dialog.querySelectorAll("dj-button")].find((b) => b.textContent.trim() === which);
	button.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
	await tick(3);
};
const target = { path: "/x" };
const from = { path: "/", state: undefined, index: 0, committed: true, source: "load" };

test("confirmLeave: a modal alertdialog opens with the message, a title, and Stay then Leave", async () => {
	const answer = confirmLeave("You have unsaved changes.")(target, from);
	await tick();
	const dialog = confirmDialog();
	assert.ok(dialog, "a dialog is open");
	assert.equal(dialog.open, true);
	assert.equal(dialog.role, "alertdialog");
	assert.equal(dialog.querySelector("p").textContent, "You have unsaved changes.");
	assert.equal(dialog.querySelector('[slot="title"]').textContent, "Leave this page?");
	assert.deepEqual([...dialog.querySelectorAll("dj-button")].map((b) => b.textContent.trim()), ["Stay", "Leave"]);
	await choose("Stay");
	assert.equal(await answer, false);
});

test("confirmLeave: Leave resolves true, and the dialog is removed", async () => {
	const answer = confirmLeave("Sure?")(target, from);
	await tick();
	await choose("Leave");
	assert.equal(await answer, true);
	assert.equal(confirmDialog(), null);
});

test("confirmLeave: Stay resolves false", async () => {
	const answer = confirmLeave("Sure?")(target, from);
	await tick();
	await choose("Stay");
	assert.equal(await answer, false);
	assert.equal(confirmDialog(), null);
});

test("confirmLeave: Escape resolves false", async () => {
	const answer = confirmLeave("Sure?")(target, from);
	await tick();
	document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
	await tick(3);
	assert.equal(await answer, false);
	assert.equal(confirmDialog(), null);
});

test("confirmLeave: the close button resolves false", async () => {
	const answer = confirmLeave("Sure?")(target, from);
	await tick();
	confirmDialog().renderRoot.querySelector("[part=close]").click();
	await tick(3);
	assert.equal(await answer, false);
});

test("confirmLeave: focus returns to where it was", async () => {
	const opener = document.createElement("button");
	document.body.append(opener);
	opener.focus();
	const answer = confirmLeave("Sure?")(target, from);
	await tick();
	await choose("Stay");
	await answer;
	assert.equal(document.activeElement, opener);
	opener.remove();
});

test("confirmLeave: texts can be replaced", async () => {
	const answer = confirmLeave("Sure?", { title: "Wait", leaveText: "Discard", stayText: "Keep editing" })(target, from);
	await tick();
	const dialog = confirmDialog();
	assert.equal(dialog.querySelector('[slot="title"]').textContent, "Wait");
	assert.deepEqual([...dialog.querySelectorAll("dj-button")].map((b) => b.textContent.trim()), ["Keep editing", "Discard"]);
	await choose("Discard");
	assert.equal(await answer, true);
});

test("confirmLeave: asked again while open, the same dialog answers both", async () => {
	const blocker = confirmLeave("Sure?");
	const first = blocker(target, from);
	const second = blocker(target, from);
	await tick();
	assert.equal(document.querySelectorAll("dj-dialog[data-confirm-leave]").length, 1);
	await choose("Leave");
	assert.deepEqual([await first, await second], [true, true]);
});

test("confirmLeave with history.block: Stay keeps the location, Leave goes Back", async (t) => {
	const { h, win } = withHistory(t);
	h.go("/a");
	h.go("/b");
	const unblock = h.block(confirmLeave("Unsaved changes."));

	h.back();
	await tick();
	assert.ok(confirmDialog(), "the dialog opened over a Back");
	await choose("Stay");
	assert.equal(h.current.path, "/b");
	assert.equal(win.location.pathname, "/b");

	h.back();
	await tick();
	await choose("Leave");
	await tick();
	assert.equal(h.current.path, "/a");
	assert.equal(h.current.source, "pop");

	unblock();
	h.back();
	assert.equal(confirmDialog(), null, "unblocked: no dialog");
});

test("confirmLeave with history.block: a go asks first too", async (t) => {
	const { h } = withHistory(t);
	h.block(confirmLeave("Unsaved changes."));
	h.go("/next");
	await tick();
	assert.ok(confirmDialog());
	await choose("Leave");
	await tick();
	assert.equal(h.current.path, "/next");
});
