// Pub/sub: subscribe, publish, replay-to-late-subscriber, and getLast. Pure — no
// DOM. Ported from tests/pubsub.test.js (node:test) to Vitest; every case preserved.
import { test, expect } from "vitest";
import { createPubSub } from "../../packages/pubsub/dist/index.js";

test("subscribe receives subsequent publishes", () => {
	const ps = createPubSub();
	const seen = [];
	ps.subscribe("topic", (v) => seen.push(v));
	ps.publish("topic", 1);
	ps.publish("topic", 2);
	expect(seen).toEqual([1, 2]);
});

test("late subscriber replays the last value by default", () => {
	const ps = createPubSub();
	ps.publish("t", "last");
	const seen = [];
	ps.subscribe("t", (v) => seen.push(v));
	expect(seen).toEqual(["last"]); // should replay the retained value immediately
});

test("replay can be disabled", () => {
	const ps = createPubSub();
	ps.publish("t", "x");
	const seen = [];
	ps.subscribe("t", (v) => seen.push(v), { replay: false });
	expect(seen).toEqual([]); // no replay when replay:false
	ps.publish("t", "y");
	expect(seen).toEqual(["y"]);
});

test("every publish notifies, even with an unchanged payload", () => {
	const ps = createPubSub();
	let count = 0;
	ps.subscribe("t", () => count++);
	ps.publish("t", "same");
	ps.publish("t", "same");
	expect(count).toBe(2);
});

test("getLast returns the last payload; unsubscribe stops delivery", () => {
	const ps = createPubSub();
	const seen = [];
	const off = ps.subscribe("t", (v) => seen.push(v));
	ps.publish("t", "a");
	expect(ps.getLast("t")).toBe("a");
	off();
	ps.publish("t", "b");
	expect(seen).toEqual(["a"]); // no delivery after unsubscribe
	expect(ps.getLast("t")).toBe("b"); // store still retains the latest
});
