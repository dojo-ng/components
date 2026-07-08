// Store: the vanilla external store the components build on. Pure — no DOM.
// Ported from tests/store.test.js (node:test) to Vitest; every case preserved.
import { test, expect } from "vitest";
import { createStore } from "../../packages/store/dist/index.js";

test("createStore exposes getState and reflects setState", () => {
	const store = createStore(() => ({ count: 0 }));
	expect(store.getState().count).toBe(0);
	store.setState({ count: 5 });
	expect(store.getState().count).toBe(5);
});

test("subscribe fires with new and previous state, and unsubscribes", () => {
	const store = createStore(() => ({ n: 0 }));
	const seen = [];
	const unsub = store.subscribe((state, previous) => {
		seen.push([state.n, previous.n]);
	});
	store.setState({ n: 1 });
	store.setState({ n: 2 });
	expect(seen).toEqual([
		[1, 0],
		[2, 1],
	]);
	unsub();
	store.setState({ n: 3 });
	expect(seen.length).toBe(2); // listener should not fire after unsubscribe
});
