// @dojo-ng/toast under happy-dom: the queue, timing rules, update-by-id, dismiss, the toast()
// auto-create path, and toast.promise. Time runs on a fake clock swapped in through the
// toaster's `clock` seam, so nothing here waits on real seconds.
//
// happy-dom has no CSS animation engine, so dj-transition's enter and leave phases finish
// within a few ticks and a dismissed toast leaves the DOM on its own.
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { toast, getToaster, DjToaster } from "../packages/toast/dist/index.js";
import { effectiveDuration, upsert, shownIds } from "../packages/toast/dist/queue.js";
import { Countdown } from "../packages/toast/dist/countdown.js";

const tick = async (n = 6) => {
	for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0));
};

function fakeClock() {
	let now = 0;
	let next = 0;
	const queue = [];
	return {
		now: () => now,
		setTimeout(callback, ms) {
			const id = ++next;
			queue.push({ id, at: now + ms, callback });
			return id;
		},
		clearTimeout(id) {
			const i = queue.findIndex((t) => t.id === id);
			if (i !== -1) queue.splice(i, 1);
		},
		advance(ms) {
			const end = now + ms;
			for (;;) {
				queue.sort((a, b) => a.at - b.at);
				const due = queue[0];
				if (!due || due.at > end) break;
				queue.shift();
				now = due.at;
				due.callback();
			}
			now = end;
		},
		pending: () => queue.length,
	};
}

/** A toaster on a fake clock. */
async function makeToaster(props = {}) {
	document.body.innerHTML = "";
	const el = document.createElement("dj-toaster");
	el.clock = fakeClock();
	Object.assign(el, props);
	document.body.append(el);
	await settled(el);
	return el;
}

/** The ids rendered, in DOM order. */
const shown = (el) => [...el.shadowRoot.querySelectorAll("dj-transition[data-id]")].map((t) => t.dataset.id);
const messageOf = (el, id) =>
	[...el.shadowRoot.querySelectorAll("dj-transition[data-id]")].find((t) => t.dataset.id === id)?.querySelector(".text")?.textContent;

test("registers <dj-toaster>", () => {
	assert.equal(customElements.get("dj-toaster"), DjToaster);
});

// Pure rules.
test("effectiveDuration: 5 s default, error and loading stay, action gets at least 8 s", () => {
	assert.equal(effectiveDuration({ type: "info" }), 5000);
	assert.equal(effectiveDuration({ type: "success", duration: 2000 }), 2000);
	assert.equal(effectiveDuration({ type: "error" }), Infinity);
	assert.equal(effectiveDuration({ type: "loading" }), Infinity);
	assert.equal(effectiveDuration({ type: "error", duration: 3000 }), 3000);
	assert.equal(effectiveDuration({ type: "info", action: { label: "Undo" } }), 8000);
	assert.equal(effectiveDuration({ type: "info", duration: 2000, action: { label: "Undo" } }), 8000);
	assert.equal(effectiveDuration({ type: "info", duration: 12000, action: { label: "Undo" } }), 12000);
	assert.equal(effectiveDuration({ type: "info", duration: 0 }), Infinity);
	assert.equal(effectiveDuration({ type: "info", duration: Infinity, action: { label: "Undo" } }), Infinity);
});

test("upsert updates in place and keeps the queue position", () => {
	let { entries } = upsert([], "a", { id: "a" });
	({ entries } = upsert(entries, "b", { id: "b" }));
	const r = upsert(entries, "a2", { id: "a", type: "success" });
	assert.equal(r.added, false);
	assert.deepEqual(r.entries.map((e) => [e.id, e.message, e.type]), [["a", "a2", "success"], ["b", "b", "info"]]);
});

test("shownIds: first max non-leaving entries, plus leaving ones", () => {
	const e = (id, leaving = false) => ({ id, leaving });
	assert.deepEqual([...shownIds([e("a"), e("b"), e("c"), e("d")], 2)], ["a", "b"]);
	assert.deepEqual([...shownIds([e("a", true), e("b"), e("c"), e("d")], 2)], ["a", "b", "c"]);
});

test("Countdown pauses and resumes with the time left", () => {
	const clock = fakeClock();
	let done = 0;
	const c = new Countdown(clock, 1000, () => done++);
	c.resume();
	clock.advance(600);
	c.pause();
	clock.advance(5000);
	assert.equal(done, 0);
	c.resume();
	clock.advance(399);
	assert.equal(done, 0);
	clock.advance(1);
	assert.equal(done, 1);
});

// The element.
test("queue: arrival order, max-visible, waiting toasts come in as shown ones close", async () => {
	const el = await makeToaster({ maxVisible: 2 });
	el.show("one", { id: "a" });
	el.show("two", { id: "b" });
	el.show("three", { id: "c" });
	await settled(el);
	assert.deepEqual(shown(el), ["a", "b"]);
	assert.equal(el.toasts.length, 3);
	el.dismiss("a");
	await settled(el);
	await tick();
	await settled(el);
	assert.deepEqual(shown(el), ["b", "c"]);
	assert.deepEqual(el.toasts.map((t) => t.id), ["b", "c"]);
});

test("top placement puts the newest toast first", async () => {
	const el = await makeToaster({ placement: "top-end" });
	el.show("one", { id: "a" });
	el.show("two", { id: "b" });
	await settled(el);
	assert.deepEqual(shown(el), ["b", "a"]);
});

test("a waiting toast's clock does not run until it is shown", async () => {
	const el = await makeToaster({ maxVisible: 1 });
	el.show("one", { id: "a" });
	el.show("two", { id: "b", duration: 1000 });
	await settled(el);
	el.clock.advance(4999);
	await settled(el);
	assert.deepEqual(el.toasts.map((t) => t.id), ["a", "b"]);
	el.clock.advance(1);
	await settled(el);
	await tick();
	await settled(el);
	assert.deepEqual(shown(el), ["b"]);
	el.clock.advance(999);
	await settled(el);
	assert.equal(el.toasts.find((t) => t.id === "b").leaving, false);
	el.clock.advance(1);
	assert.equal(el.toasts.find((t) => t.id === "b").leaving, true);
});

test("update by id changes the toast in place instead of adding one", async () => {
	const el = await makeToaster();
	el.show("Saving", { id: "k" });
	await settled(el);
	const handle = el.show("Saved", { id: "k", type: "success" });
	await settled(el);
	assert.equal(el.toasts.length, 1);
	assert.equal(messageOf(el, "k"), "Saved");
	handle.update({ message: "Saved again" });
	await settled(el);
	assert.equal(messageOf(el, "k"), "Saved again");
	assert.equal(el.shadowRoot.querySelector("dj-snackbar").getAttribute("type"), "success");
});

test("dismiss closes the toast and reports why", async () => {
	const el = await makeToaster();
	const reasons = [];
	el.addEventListener("dj-toast-close", (e) => reasons.push([e.detail.id, e.detail.reason]));
	const handle = el.show("Hello");
	await settled(el);
	handle.dismiss();
	await settled(el);
	await tick();
	await settled(el);
	assert.deepEqual(reasons, [[handle.id, "api"]]);
	assert.equal(el.toasts.length, 0);
	assert.deepEqual(shown(el), []);
	assert.equal(el.shadowRoot.querySelector(".list").hidden, true, "an empty list is hidden");
});

test("timeout closes a toast after 5 s; an error stays", async () => {
	const el = await makeToaster();
	const reasons = [];
	el.addEventListener("dj-toast-close", (e) => reasons.push(e.detail.reason));
	el.show("Saved", { id: "s" });
	el.show("Failed", { id: "e", type: "error" });
	await settled(el);
	el.clock.advance(5000);
	assert.deepEqual(reasons, ["timeout"]);
	el.clock.advance(60000);
	assert.deepEqual(reasons, ["timeout"]);
	assert.equal(el.toasts.find((t) => t.id === "e").leaving, false);
});

test("the action button runs onClick with the handle, then closes the toast", async () => {
	const el = await makeToaster();
	let got;
	el.show("Deleted", { id: "d", action: { label: "Undo", onClick: (h) => (got = h.id) } });
	await settled(el);
	const reasons = [];
	el.addEventListener("dj-toast-close", (e) => reasons.push(e.detail.reason));
	el.shadowRoot.querySelector("button.action").click();
	assert.equal(got, "d");
	assert.deepEqual(reasons, ["action"]);
});

test("not dismissible: no close button", async () => {
	const el = await makeToaster();
	el.show("Busy", { dismissible: false });
	await settled(el);
	assert.equal(el.shadowRoot.querySelector("button.close"), null);
});

test("errors go to the assertive region, others to the polite one, in order", async () => {
	const el = await makeToaster();
	el.show("first", { id: "1" });
	el.show("broken", { id: "2", type: "error" });
	el.show("second", { id: "3", action: { label: "Undo" } });
	await settled(el);
	el.clock.advance(50);
	const polite = [...el.shadowRoot.querySelector(".sr-status").children].map((n) => n.textContent);
	const assertive = [...el.shadowRoot.querySelector(".sr-alert").children].map((n) => n.textContent);
	assert.deepEqual(polite, ["first", "second. Undo: Alt+T"]);
	assert.deepEqual(assertive, ["broken"]);
	for (const sb of el.shadowRoot.querySelectorAll("dj-snackbar")) {
		assert.equal(sb.quiet, true, "each snackbar is quiet");
		assert.equal(sb.shadowRoot.querySelector('[role="status"]'), null, "and renders no live region of its own");
	}
	el.clock.advance(7000);
	assert.equal(el.shadowRoot.querySelector(".sr-status").childElementCount, 0, "announcements are removed after a while");
});

test("an update that changes the message is announced again", async () => {
	const el = await makeToaster();
	el.show("Saving", { id: "k", type: "loading" });
	await settled(el);
	el.clock.advance(50);
	el.show("Saved", { id: "k", type: "success" });
	await settled(el);
	el.clock.advance(50);
	const polite = [...el.shadowRoot.querySelector(".sr-status").children].map((n) => n.textContent);
	assert.deepEqual(polite, ["Saving", "Saved"]);
});

// toast() and toast.promise().
test("toast() creates a toaster on first use, and two calls before it renders both land", async () => {
	document.body.innerHTML = "";
	const a = toast("one");
	const toaster = getToaster();
	toaster.clock = fakeClock();
	const b = toast("two");
	assert.equal(document.querySelectorAll("dj-toaster").length, 1);
	assert.equal(toaster.parentNode, document.body);
	assert.notEqual(a.id, b.id);
	await settled(toaster);
	assert.deepEqual(shown(toaster), [a.id, b.id]);
	toast.dismiss();
	await settled(toaster);
	await tick();
	assert.equal(toaster.toasts.length, 0);
});

test("toast() uses a toaster already on the page", async () => {
	const el = await makeToaster({ placement: "top-start" });
	toast("hi");
	assert.equal(document.querySelectorAll("dj-toaster").length, 1);
	await settled(el);
	assert.equal(el.toasts.length, 1);
});

test("toast.promise: loading, then success; the timer starts when the promise settles", async () => {
	const el = await makeToaster();
	let resolve;
	const p = new Promise((r) => (resolve = r));
	const returned = toast.promise(p, { loading: "Sending", success: (v) => `Sent ${v}`, error: "Failed" });
	assert.equal(returned, p);
	await settled(el);
	const [entry] = el.toasts;
	assert.equal(entry.type, "loading");
	assert.ok(el.shadowRoot.querySelector(".spinner"), "a loading toast shows a spinner");
	el.clock.advance(60000);
	assert.equal(el.toasts[0].leaving, false, "loading never times out");
	resolve(3);
	await p;
	await tick(1);
	await settled(el);
	assert.equal(el.toasts[0].type, "success");
	assert.equal(messageOf(el, entry.id), "Sent 3");
	el.clock.advance(4999);
	assert.equal(el.toasts[0].leaving, false);
	el.clock.advance(1);
	assert.equal(el.toasts[0].leaving, true);
});

test("toast.promise: rejection turns it into an error that stays", async () => {
	const el = await makeToaster();
	const p = Promise.reject(new Error("nope"));
	toast.promise(p, { loading: "Sending", success: "Sent", error: (e) => `Failed: ${e.message}` }).catch(() => {});
	await tick(2);
	await settled(el);
	assert.equal(el.toasts[0].type, "error");
	assert.equal(el.toasts[0].message, "Failed: nope");
	el.clock.advance(60000);
	assert.equal(el.toasts[0].leaving, false);
});

test("the toaster's shortcut is a registered command that follows the shortcut property", async () => {
	const { commands } = await import("../packages/commands/dist/index.js");
	const toaster = new DjToaster();
	document.body.append(toaster);
	await toaster.updateComplete;
	assert.ok(commands.get("dj-toaster.focus"), "registered on connect");
	assert.equal(commands.get("dj-toaster.focus").shortcut, "Alt+T");
	assert.equal(commands.active().length, 0, "not active while no toast shows");
	toaster.shortcut = "Alt+Y";
	await toaster.updateComplete;
	assert.equal(commands.get("dj-toaster.focus").shortcut, "Alt+Y");
	toaster.shortcut = "";
	await toaster.updateComplete;
	assert.equal(commands.get("dj-toaster.focus"), undefined, "an empty shortcut removes it");
	toaster.shortcut = "Alt+T";
	await toaster.updateComplete;
	toaster.remove();
	assert.equal(commands.get("dj-toaster.focus"), undefined, "removed on disconnect");
});
