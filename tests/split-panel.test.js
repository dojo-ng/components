// Behavior tests for dj-split-panel. happy-dom does no layout, so real drag geometry is the SP3
// browser check. Here the pointer path is driven by stubbing the host rect and dispatching pointer
// events on the divider; the keyboard path (arrows/Shift/Home/End, RTL flip, vertical) runs whole.
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/split-panel/dist/index.js";

const tick = async (n = 2) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };

/** Build a dj-split-panel with `start`/`end` panes and the given props, then settle. */
async function build(props = {}) {
	const el = document.createElement("dj-split-panel");
	for (const [k, v] of Object.entries(props)) {
		if (k === "dir") el.setAttribute("dir", v);
		else el[k] = v;
	}
	const a = document.createElement("div"); a.slot = "start"; a.textContent = "A";
	const b = document.createElement("div"); b.slot = "end"; b.textContent = "B";
	el.append(a, b);
	document.body.appendChild(el);
	if (el.updateComplete) await el.updateComplete;
	await tick();
	if (el.updateComplete) await el.updateComplete;
	return el;
}
const divider = (el) => el.renderRoot.querySelector('[part="divider"]');
const grid = (el) => el.renderRoot.querySelector(".grid");
/** Stub the host rect so the pointer math has geometry (happy-dom returns zeros). */
function stubRect(el, rect) {
	el.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: rect.width, bottom: rect.height, ...rect });
}
const pointer = (type, coords) => new PointerEvent(type, { pointerId: 1, bubbles: true, composed: true, ...coords });
const keydown = (opts) => new KeyboardEvent("keydown", { bubbles: true, composed: true, ...opts });

test("registers <dj-split-panel>", () => {
	assert.equal(typeof customElements.get("dj-split-panel"), "function");
});

test("defaults: horizontal, position 50, reflected", async () => {
	const el = await build();
	assert.equal(el.orientation, "horizontal");
	assert.equal(el.position, 50);
	assert.equal(el.getAttribute("orientation"), "horizontal");
	assert.equal(el.getAttribute("position"), "50");
	// Grid columns carry the position as fr tracks.
	assert.match(grid(el).getAttribute("style"), /grid-template-columns:\s*minmax\(var\(--dj-split-panel-min-start, 0\), 50fr\)/);
});

test("divider ARIA for a horizontal split", async () => {
	const el = await build({ position: 40 });
	const d = divider(el);
	assert.equal(d.getAttribute("role"), "separator");
	// The separator's orientation is the divider's visual axis: vertical for a horizontal split.
	assert.equal(d.getAttribute("aria-orientation"), "vertical");
	assert.equal(d.getAttribute("aria-valuenow"), "40");
	assert.equal(d.getAttribute("aria-valuemin"), "0");
	assert.equal(d.getAttribute("aria-valuemax"), "100");
	assert.equal(d.getAttribute("aria-label"), "Resize");
	assert.equal(d.getAttribute("tabindex"), "0");
});

test("vertical orientation flips the divider axis and template", async () => {
	const el = await build({ orientation: "vertical" });
	assert.equal(divider(el).getAttribute("aria-orientation"), "horizontal");
	assert.match(grid(el).getAttribute("style"), /grid-template-rows:\s*minmax\(var\(--dj-split-panel-min-start, 0\), 50fr\)/);
});

test("keyboard: arrows move position and fire dj-reposition per keypress (LTR horizontal)", async () => {
	const el = await build({ position: 50 });
	const d = divider(el);
	const seen = [];
	el.addEventListener("dj-reposition", (e) => seen.push(e.detail.position));

	d.dispatchEvent(keydown({ key: "ArrowRight" }));
	assert.equal(el.position, 51);
	d.dispatchEvent(keydown({ key: "ArrowLeft" }));
	assert.equal(el.position, 50);
	d.dispatchEvent(keydown({ key: "ArrowRight", shiftKey: true }));
	assert.equal(el.position, 60);
	d.dispatchEvent(keydown({ key: "Home" }));
	assert.equal(el.position, 0);
	d.dispatchEvent(keydown({ key: "End" }));
	assert.equal(el.position, 100);
	assert.deepEqual(seen, [51, 50, 60, 0, 100]);
	await settled(el);
	assert.equal(divider(el).getAttribute("aria-valuenow"), "100");
});

test("keyboard clamps at the ends", async () => {
	const el = await build({ position: 1 });
	const d = divider(el);
	d.dispatchEvent(keydown({ key: "ArrowLeft", shiftKey: true })); // 1 - 10 -> clamp 0
	assert.equal(el.position, 0);
	el.position = 99; await settled(el);
	d.dispatchEvent(keydown({ key: "ArrowRight", shiftKey: true })); // 99 + 10 -> clamp 100
	assert.equal(el.position, 100);
});

test("keyboard RTL flips Left/Right for a horizontal split", async () => {
	const el = await build({ position: 50, dir: "rtl" });
	const d = divider(el);
	d.dispatchEvent(keydown({ key: "ArrowRight" })); // RTL: Right decreases start share
	assert.equal(el.position, 49);
	d.dispatchEvent(keydown({ key: "ArrowLeft" })); // RTL: Left increases
	assert.equal(el.position, 50);
});

test("keyboard vertical uses Up/Down, ignores Left/Right", async () => {
	const el = await build({ orientation: "vertical", position: 50 });
	const d = divider(el);
	d.dispatchEvent(keydown({ key: "ArrowDown" }));
	assert.equal(el.position, 51);
	d.dispatchEvent(keydown({ key: "ArrowUp" }));
	assert.equal(el.position, 50);
	d.dispatchEvent(keydown({ key: "ArrowRight" })); // no horizontal handling when vertical
	assert.equal(el.position, 50);
});

test("drag: pointer sequence updates position, one settle event on pointerup", async () => {
	const el = await build({ position: 50 });
	stubRect(el, { width: 200, height: 100 });
	const d = divider(el);
	const seen = [];
	el.addEventListener("dj-reposition", (e) => seen.push(e.detail.position));

	d.dispatchEvent(pointer("pointerdown", { clientX: 100, clientY: 50 })); // 100/200 -> 50%
	assert.equal(el.position, 50);
	d.dispatchEvent(pointer("pointermove", { clientX: 150, clientY: 50 })); // 150/200 -> 75%
	assert.equal(el.position, 75);
	d.dispatchEvent(pointer("pointermove", { clientX: 30, clientY: 50 })); // 30/200 -> 15%
	assert.equal(el.position, 15);
	assert.equal(seen.length, 0, "no event mid-drag");
	d.dispatchEvent(pointer("pointerup", { clientX: 30, clientY: 50 }));
	assert.deepEqual(seen, [15], "one settle event at pointerup");
});

test("drag RTL mirrors the horizontal axis", async () => {
	const el = await build({ position: 50, dir: "rtl" });
	stubRect(el, { width: 200, height: 100 });
	const d = divider(el);
	d.dispatchEvent(pointer("pointerdown", { clientX: 50, clientY: 50 })); // visual 25% -> RTL 75%
	assert.equal(el.position, 75);
});

test("drag vertical reads the Y axis", async () => {
	const el = await build({ orientation: "vertical", position: 50 });
	stubRect(el, { width: 100, height: 200 });
	const d = divider(el);
	d.dispatchEvent(pointer("pointerdown", { clientX: 50, clientY: 150 })); // 150/200 -> 75%
	assert.equal(el.position, 75);
});

test("disabled: not a tab stop, keyboard and pointer inert, no events", async () => {
	const el = await build({ disabled: true, position: 50 });
	stubRect(el, { width: 200, height: 100 });
	const d = divider(el);
	assert.equal(d.getAttribute("tabindex"), "-1");
	assert.equal(d.getAttribute("aria-disabled"), "true");
	const seen = [];
	el.addEventListener("dj-reposition", () => seen.push(1));
	d.dispatchEvent(keydown({ key: "ArrowRight" }));
	d.dispatchEvent(pointer("pointerdown", { clientX: 150, clientY: 50 }));
	d.dispatchEvent(pointer("pointerup", { clientX: 150, clientY: 50 }));
	assert.equal(el.position, 50);
	assert.equal(seen.length, 0);
});
