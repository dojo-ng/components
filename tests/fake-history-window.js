// A window double for installHistory from @dojo-ng/history, for the tests of components that follow
// or drive navigation (nav-history, card, tree). It is the same idea as the FakeWindow in
// framework/packages/history/test/fixtures/fake-window.mjs, trimmed to what these tests need: an
// in-memory history stack with pushState, replaceState, back, forward, state and length; a location;
// popstate dispatch; and sessionStorage.
//
// The difference from the framework copy: `document` is the real happy-dom document, so a
// `dj-navigate` event dispatched by a real component reaches the listener installHistory adds, and
// the whole path (component -> event -> nav:go -> nav:location -> component) runs for real.
// Traversal is synchronous here; real browsers fire popstate a task later (the browser tests cover that).
import { createPubSub } from "@dojo-ng/pubsub";
import { installHistory } from "@dojo-ng/history";

export class FakeHistoryWindow {
	constructor({ url = "http://example.test/", state = null } = {}) {
		this._stack = [{ state: structuredClone(state), url: new URL(url) }];
		this._cursor = 0;
		this._popstate = new Set();
		this._storage = new Map();
		this.calls = [];
		this.document = document;
		const self = this;
		// Bound functions report "[native code]", which installHistory's coexistence check looks for.
		this.history = {
			pushState: function pushState(state, _title, url) {
				self.calls.push({ type: "push", url });
				self._stack.splice(self._cursor + 1);
				self._stack.push({ state: structuredClone(state), url: self._resolve(url) });
				self._cursor++;
			}.bind(null),
			replaceState: function replaceState(state, _title, url) {
				self.calls.push({ type: "replace", url });
				self._stack[self._cursor] = { state: structuredClone(state), url: url == null ? self._stack[self._cursor].url : self._resolve(url) };
			}.bind(null),
			back: function back() { self._traverse(-1); }.bind(null),
			forward: function forward() { self._traverse(1); }.bind(null),
		};
		Object.defineProperty(this.history, "state", { get: () => this._stack[this._cursor].state });
		Object.defineProperty(this.history, "length", { get: () => this._stack.length });
		this.sessionStorage = {
			getItem: (k) => (this._storage.has(k) ? this._storage.get(k) : null),
			setItem: (k, v) => { this._storage.set(k, String(v)); },
		};
	}
	_resolve(url) {
		return url == null ? this._stack[this._cursor].url : new URL(url, this._stack[this._cursor].url);
	}
	_traverse(delta) {
		const next = this._cursor + delta;
		if (next < 0 || next >= this._stack.length) return;
		this._cursor = next;
		for (const fn of [...this._popstate]) fn({ type: "popstate", state: this.history.state });
	}
	get location() {
		const url = this._stack[this._cursor].url;
		return { pathname: url.pathname, search: url.search, hash: url.hash, href: url.href };
	}
	get paths() {
		return this._stack.map((e) => e.url.pathname + e.url.search + e.url.hash);
	}
	addEventListener(type, fn) { if (type === "popstate") this._popstate.add(fn); }
	removeEventListener(type, fn) { if (type === "popstate") this._popstate.delete(fn); }
}

/**
 * Install history on a fresh bus and fake window. Returns `{ win, bus, h, stop }`; call `stop()`
 * (or pass the result to `t.after`) so the registration does not leak into the next test.
 */
export function installFakeHistory(options = {}) {
	const { window: windowInit, ...rest } = options;
	const win = new FakeHistoryWindow(windowInit);
	const bus = createPubSub();
	const h = installHistory(bus, { window: win, dwellMs: 0, ...rest });
	return { win, bus, h, stop: () => h.destroy() };
}
