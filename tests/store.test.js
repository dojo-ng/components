// Store smokes: the vanilla external store the components build on. Pure — no DOM.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../packages/store/dist/index.js";

test("createStore exposes getState and reflects setState", () => {
	const store = createStore(() => ({ count: 0 }));
	assert.equal(store.getState().count, 0);
	store.setState({ count: 5 });
	assert.equal(store.getState().count, 5);
});

test("subscribe fires with new and previous state, and unsubscribes", () => {
	const store = createStore(() => ({ n: 0 }));
	const seen = [];
	const unsub = store.subscribe((state, previous) => {
		seen.push([state.n, previous.n]);
	});
	store.setState({ n: 1 });
	store.setState({ n: 2 });
	assert.deepEqual(seen, [
		[1, 0],
		[2, 1],
	]);
	unsub();
	store.setState({ n: 3 });
	assert.equal(seen.length, 2, "listener should not fire after unsubscribe");
});
