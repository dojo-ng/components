// Behavior tests for dj-carousel. happy-dom has no layout or real scrolling/snap — that is the
// C5 browser check — so these cover the JS-observable behavior: slotted-item ARIA, the optimistic
// index/event path, dots, buttons, per-view basis, and keyboard. Do not fake rects here.
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/carousel/dist/index.js";

const tick = async (n = 3) => {
	for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0));
};

/** Build a dj-carousel with `count` slotted <div> items and the given props, then settle. */
async function build(props = {}, count = 3) {
	const el = document.createElement("dj-carousel");
	for (const [k, v] of Object.entries(props)) el[k] = v;
	for (let i = 0; i < count; i++) {
		const d = document.createElement("div");
		d.textContent = `Item ${i + 1}`;
		el.appendChild(d);
	}
	document.body.appendChild(el);
	if (el.updateComplete) await el.updateComplete;
	await tick();
	if (el.updateComplete) await el.updateComplete;
	return el;
}
const itemsOf = (el) => [...el.children];
const dotsOf = (el) => [...el.renderRoot.querySelectorAll('[part="dot"]')];
const navBtn = (el, part) => el.renderRoot.querySelector(`[part="${part}"]`);

test("registers <dj-carousel>", () => {
	assert.equal(typeof customElements.get("dj-carousel"), "function");
});

test("slotted items get slide ARIA with correct {n} of {total}", async () => {
	const el = await build({ label: "Photos" }, 3);
	const items = itemsOf(el);
	assert.equal(items.length, 3);
	for (const it of items) {
		assert.equal(it.getAttribute("role"), "group");
		assert.equal(it.getAttribute("aria-roledescription"), "slide");
	}
	assert.equal(items[0].getAttribute("aria-label"), "1 of 3");
	assert.equal(items[2].getAttribute("aria-label"), "3 of 3");
	// The region carries the carousel roledescription and the label.
	const region = el.renderRoot.querySelector('[role="region"]');
	assert.equal(region.getAttribute("aria-roledescription"), "carousel");
	assert.equal(region.getAttribute("aria-label"), "Photos");
});

test("slotchange re-labels after appending a fourth item", async () => {
	const el = await build({}, 3);
	const d = document.createElement("div");
	el.appendChild(d);
	await tick();
	await settled(el);
	const items = itemsOf(el);
	assert.equal(items.length, 4);
	assert.equal(items[0].getAttribute("aria-label"), "1 of 4");
	assert.equal(items[3].getAttribute("aria-label"), "4 of 4");
});

test("per-view sets the item flex-basis custom property (division by a literal)", async () => {
	const one = await build({ perView: 1 }, 3);
	assert.equal(one.style.getPropertyValue("--dj-carousel-basis"), "100%");
	const two = await build({ perView: 2 }, 3);
	assert.equal(
		two.style.getPropertyValue("--dj-carousel-basis"),
		"calc((100% - 1 * var(--dj-carousel-gap, 1rem)) / 2)",
	);
});

test("goTo(1) sets index, emits one dj-slide-change, updates dots and the prev button", async () => {
	const el = await build({ dots: true }, 3);
	const events = [];
	el.addEventListener("dj-slide-change", (e) => events.push(e.detail.index));
	assert.equal(el.index, 0);
	assert.equal(navBtn(el, "prev").disabled, true, "prev disabled at start");
	el.goTo(1);
	await settled(el);
	assert.equal(el.index, 1);
	assert.deepEqual(events, [1], "exactly one event with index 1");
	const dots = dotsOf(el);
	assert.equal(dots[1].getAttribute("aria-current"), "true");
	assert.equal(dots[0].hasAttribute("aria-current"), false);
	assert.equal(navBtn(el, "prev").disabled, false, "prev enabled after moving off start");
});

test("goTo clamps and does not emit when the index is unchanged", async () => {
	const el = await build({}, 3);
	const events = [];
	el.addEventListener("dj-slide-change", (e) => events.push(e.detail.index));
	el.goTo(99);
	await settled(el);
	assert.equal(el.index, 2, "clamped to last");
	assert.deepEqual(events, [2]);
	el.goTo(99); // already at last → no change, no event
	await settled(el);
	assert.deepEqual(events, [2], "no re-emit for the same index");
});

test("next()/previous() step by one and respect the ends", async () => {
	const el = await build({}, 3);
	const events = [];
	el.addEventListener("dj-slide-change", (e) => events.push(e.detail.index));
	el.previous(); // at 0 → no move
	await settled(el);
	assert.deepEqual(events, []);
	el.next();
	el.next();
	await settled(el);
	assert.deepEqual(events, [1, 2]);
	el.next(); // at last → no move past the end
	await settled(el);
	assert.deepEqual(events, [1, 2]);
	assert.equal(navBtn(el, "next").disabled, true, "next disabled at the end");
});

test("dots render one per item and clicking a dot navigates", async () => {
	const el = await build({ dots: true }, 4);
	const events = [];
	el.addEventListener("dj-slide-change", (e) => events.push(e.detail.index));
	const dots = dotsOf(el);
	assert.equal(dots.length, 4);
	dots[2].click();
	await settled(el);
	assert.equal(el.index, 2);
	assert.deepEqual(events, [2]);
});

test("per-view > 1: dots and end-detection use reachable pages, not item count", async () => {
	// 5 items shown 3 at a time → 3 reachable leading positions (5 - 3 + 1), so 3 dots.
	const el = await build({ dots: true, perView: 3 }, 5);
	assert.equal(dotsOf(el).length, 3, "one dot per reachable page");
	const events = [];
	el.addEventListener("dj-slide-change", (e) => events.push(e.detail.index));
	el.goTo(4); // beyond the last page → clamps to the last leading index (2)
	await settled(el);
	assert.equal(el.index, 2, "goTo clamps to total - per-view");
	assert.deepEqual(events, [2]);
	assert.equal(navBtn(el, "next").disabled, true, "next disabled at the last page");
});

test("raising per-view pulls a stale index back into range", async () => {
	const el = await build({ perView: 1 }, 5);
	el.goTo(4);
	await settled(el);
	assert.equal(el.index, 4);
	el.perView = 3; // max index now 2
	await settled(el);
	assert.equal(el.index, 2, "current clamped down silently on per-view change");
});

test("ArrowRight on the viewport advances (LTR)", async () => {
	const el = await build({}, 3);
	const events = [];
	el.addEventListener("dj-slide-change", (e) => events.push(e.detail.index));
	const vp = el.renderRoot.querySelector('[part="viewport"]');
	vp.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }));
	await settled(el);
	assert.equal(el.index, 1);
	assert.deepEqual(events, [1]);
});
