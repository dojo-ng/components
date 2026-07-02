// Behavior smoke for dj-transition and dj-transition-group.
//
// happy-dom has no CSS animation engine, so every computed duration is 0 and each
// phase resolves through awaitMotion's `total <= 0` fast path. That is what makes
// the state machine testable here: phases complete on their own within a few
// microtasks. The one case that needs a phase held open (mid-flight interruption)
// replaces the instance's `motionWait` seam with manually resolved promises.
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/transition/dist/index.js";
import "../packages/transition-group/dist/index.js";
import { maxList } from "../packages/transition/dist/motion.js";

// Drain microtasks + macrotasks so an async phase (updateComplete → motionWait →
// state + event) fully settles. A phase spans a couple of hops, so tick a few times.
const tick = async (n = 5) => {
	for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0));
};

function make(attrs = {}) {
	const el = document.createElement("dj-transition");
	for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
	document.body.appendChild(el);
	return el;
}

// 1. maxList / duration parsing.
test("maxList parses CSS time lists to the max in milliseconds", () => {
	assert.equal(maxList("0s"), 0);
	assert.equal(maxList("200ms"), 200);
	assert.equal(maxList("0.2s, 1s"), 1000);
	assert.equal(maxList(""), 0);
	assert.equal(maxList(undefined), 0);
});

// 2. Initial states.
test("initial: no show settles to state=left", async () => {
	const el = make();
	await settled(el);
	await tick();
	assert.equal(el.getAttribute("state"), "left");
});

test("initial: show without appear snaps to entered and fires no event", async () => {
	const el = make({ show: "" });
	let entered = 0;
	el.addEventListener("dj-after-enter", () => entered++);
	await settled(el);
	await tick();
	assert.equal(el.getAttribute("state"), "entered");
	assert.equal(entered, 0);
});

test("initial: show + appear runs the enter effect and fires dj-after-enter", async () => {
	const el = make({ show: "", appear: "" });
	let entered = 0;
	el.addEventListener("dj-after-enter", () => entered++);
	await settled(el);
	await tick();
	assert.equal(entered, 1);
	assert.equal(el.getAttribute("state"), "entered");
});

// 3. Leave.
test("leave: show=false fires dj-after-leave, ends left, sets aria-hidden", async () => {
	const el = make({ show: "" });
	await settled(el);
	await tick();
	let left = 0;
	el.addEventListener("dj-after-leave", () => left++);
	el.show = false;
	await settled(el);
	await tick();
	assert.equal(left, 1);
	assert.equal(el.getAttribute("state"), "left");
	assert.equal(el.getAttribute("aria-hidden"), "true");
});

// 4. Enter.
test("enter: show=true fires dj-after-enter, ends entered, removes aria-hidden", async () => {
	const el = make();
	await settled(el);
	await tick(); // now left
	let entered = 0;
	el.addEventListener("dj-after-enter", () => entered++);
	el.show = true;
	await settled(el);
	await tick();
	assert.equal(entered, 1);
	assert.equal(el.getAttribute("state"), "entered");
	assert.equal(el.hasAttribute("aria-hidden"), false);
});

// 5. Coalescing no-op: a same-tick round trip changes nothing and fires nothing.
test("coalescing: same-tick show=false then show=true is a no-op", async () => {
	const el = make({ show: "" });
	await settled(el);
	await tick(); // entered
	let entered = 0;
	let left = 0;
	el.addEventListener("dj-after-enter", () => entered++);
	el.addEventListener("dj-after-leave", () => left++);
	el.show = false;
	el.show = true;
	await settled(el);
	await tick();
	assert.equal(el.getAttribute("state"), "entered");
	assert.equal(entered, 0);
	assert.equal(left, 0);
});

// 6. Mid-flight interruption via the motionWait seam.
test("interruption: a held leave interrupted by an enter fires only dj-after-enter", async () => {
	const el = make({ show: "" });
	await settled(el);
	await tick(); // entered

	// Hold each phase open on a manually resolved promise.
	const gates = [];
	el.motionWait = () => new Promise((resolve) => gates.push(resolve));

	let entered = 0;
	let left = 0;
	el.addEventListener("dj-after-enter", () => entered++);
	el.addEventListener("dj-after-leave", () => left++);

	// Start the leave; it parks on gates[0].
	el.show = false;
	await settled(el);
	assert.equal(el.getAttribute("state"), "leaving");

	// Interrupt with an enter; it parks on gates[1] and bumps the token.
	el.show = true;
	await settled(el);
	assert.equal(el.getAttribute("state"), "entering");

	// Resolve the stale leave: it must see the changed token and do nothing.
	gates[0]();
	await tick();
	assert.equal(left, 0, "the interrupted leave fires no event");
	assert.notEqual(el.getAttribute("state"), "left");

	// Resolve the enter: it owns the element and completes.
	gates[1]();
	await tick();
	assert.equal(entered, 1);
	assert.equal(el.getAttribute("state"), "entered");
});

// 7. Group.
function makeGroup(childCount, attrs = {}) {
	const group = document.createElement("dj-transition-group");
	for (const [k, v] of Object.entries(attrs)) group.setAttribute(k, v);
	const children = [];
	for (let i = 0; i < childCount; i++) {
		const child = document.createElement("dj-transition");
		group.appendChild(child);
		children.push(child);
	}
	document.body.appendChild(group);
	return { group, children };
}

test("group: stagger=0 enters all children and fires one dj-after-enter", async () => {
	const { group, children } = makeGroup(2, { stagger: "0" });
	await settled(group);
	await tick();
	let groupEnter = 0;
	group.addEventListener("dj-after-enter", (e) => { if (e.target === group) groupEnter++; });
	group.show = true;
	await settled(group);
	await tick(8);
	assert.equal(children[0].getAttribute("state"), "entered");
	assert.equal(children[1].getAttribute("state"), "entered");
	assert.equal(groupEnter, 1);
});

test("group: leaving all children fires one dj-after-leave", async () => {
	const { group, children } = makeGroup(2, { stagger: "0" });
	await settled(group);
	await tick();
	group.show = true;
	await settled(group);
	await tick(8);
	let groupLeave = 0;
	group.addEventListener("dj-after-leave", (e) => { if (e.target === group) groupLeave++; });
	group.show = false;
	await settled(group);
	await tick(8);
	assert.equal(children[0].getAttribute("state"), "left");
	assert.equal(groupLeave, 1);
});

test("group: a same-tick show round-trip fires no group events", async () => {
	const { group } = makeGroup(2, { stagger: "0" });
	await settled(group);
	await tick();
	let groupEnter = 0;
	let groupLeave = 0;
	group.addEventListener("dj-after-enter", (e) => { if (e.target === group) groupEnter++; });
	group.addEventListener("dj-after-leave", (e) => { if (e.target === group) groupLeave++; });
	group.show = true;
	group.show = false;
	await settled(group);
	await tick(10);
	assert.equal(groupEnter, 0);
	assert.equal(groupLeave, 0);
});
