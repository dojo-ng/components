// @dojo-ng/dnd — pointer-core drag primitive.
//
// Pure geometry/move math is asserted directly. The controller + keyboardGrabMode are exercised
// with real DOM under happy-dom, stubbing getBoundingClientRect (happy-dom does no layout) so the
// full pointer sequence resolves to an onMove. What happy-dom genuinely can't do — real pointer
// hit-testing, actual scrolling, ghost/indicator rendering, reduced-motion — is the K11 browser check.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
	insertionIndex,
	centerOf,
	resolveMove,
	DragZoneController,
	keyboardGrabMode,
} from "../packages/dnd/dist/index.js";

// ---- helpers ---------------------------------------------------------------
function rect({ top = 0, bottom = 0, left = 0, right = 0 }) {
	return { top, bottom, left, right, width: right - left, height: bottom - top, x: left, y: top };
}
function stub(el, r) { el.getBoundingClientRect = () => rect(r); return el; }
function item(key, r) {
	const el = document.createElement("div");
	el.dataset.key = key;
	el.tabIndex = 0;
	if (r) stub(el, r);
	return el;
}
function fakeHost() { return { addController() {}, requestUpdate() {}, updateComplete: Promise.resolve(true) }; }
function pointer(type, x, y) { return new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 1 }); }

// ============================================================ pure core
test("insertionIndex: empty, before, middle, append", () => {
	assert.equal(insertionIndex([], 5), 0);
	assert.equal(insertionIndex([30, 50], 10), 0); // before first
	assert.equal(insertionIndex([30, 50], 45), 1); // between
	assert.equal(insertionIndex([30, 50], 99), 2); // append at end
});

test("centerOf on each axis", () => {
	const r = rect({ top: 0, bottom: 20, left: 100, right: 140 });
	assert.equal(centerOf(r, "y"), 10);
	assert.equal(centerOf(r, "x"), 120);
});

test("resolveMove nulls a same-spot drop and keeps real moves", () => {
	assert.equal(resolveMove({ key: "a", from: "L", to: "L", fromIndex: 2, toIndex: 2 }), null);
	assert.deepEqual(resolveMove({ key: "a", from: "L", to: "L", fromIndex: 0, toIndex: 1 }), { key: "a", from: "L", to: "L", fromIndex: 0, toIndex: 1 });
	assert.deepEqual(resolveMove({ key: "a", from: "A", to: "B", fromIndex: 0, toIndex: 0 }), { key: "a", from: "A", to: "B", fromIndex: 0, toIndex: 0 });
});

// ============================================================ controller
let boardSeq = 0;
function buildBoard() {
	// Each board instance gets its own group (per the spec: group = one board), so independent
	// boards never share the module-level zone registry.
	const group = `board-${boardSeq++}`;
	// Lane A at x[0..100], Lane B at x[200..300]; both y[0..100]. Items stacked 20px tall.
	const laneA = stub(document.createElement("div"), { left: 0, right: 100, top: 0, bottom: 100 });
	const laneB = stub(document.createElement("div"), { left: 200, right: 300, top: 0, bottom: 100 });
	document.body.append(laneA, laneB);
	const a = [item("A-1", { left: 0, right: 100, top: 0, bottom: 20 }), item("A-2", { left: 0, right: 100, top: 20, bottom: 40 }), item("A-3", { left: 0, right: 100, top: 40, bottom: 60 })];
	const b = [item("B-1", { left: 200, right: 300, top: 0, bottom: 20 }), item("B-2", { left: 200, right: 300, top: 20, bottom: 40 })];
	a.forEach((el) => laneA.append(el));
	b.forEach((el) => laneB.append(el));
	const moves = [];
	const cfgA = { container: () => laneA, items: () => a, group, zoneId: "A", axis: "y", onMove: (m) => moves.push(m) };
	const cfgB = { container: () => laneB, items: () => b, group, zoneId: "B", axis: "y", onMove: (m) => moves.push(m) };
	const ctrlA = new DragZoneController(fakeHost(), cfgA);
	const ctrlB = new DragZoneController(fakeHost(), cfgB);
	ctrlA.hostConnected();
	ctrlB.hostConnected();
	return { laneA, laneB, a, b, moves, ctrlA, ctrlB };
}

test("pointer drag reorders within a lane → one onMove with correct indices", () => {
	const { a, moves } = buildBoard();
	a[0].dispatchEvent(pointer("pointerdown", 50, 5)); // grab A-1
	window.dispatchEvent(pointer("pointermove", 50, 45)); // over A, past A-2's center (30), before A-3's (50)
	window.dispatchEvent(pointer("pointerup", 50, 45));
	assert.equal(moves.length, 1);
	assert.deepEqual(moves[0], { key: "A-1", from: "A", to: "A", fromIndex: 0, toIndex: 1 });
});

test("pointer drag transfers across grouped lanes → onMove on the target zone", () => {
	const { a, moves } = buildBoard();
	a[1].dispatchEvent(pointer("pointerdown", 50, 25)); // grab A-2
	window.dispatchEvent(pointer("pointermove", 250, 15)); // over lane B, before B-2's center (30)
	window.dispatchEvent(pointer("pointerup", 250, 15));
	assert.equal(moves.length, 1);
	assert.deepEqual(moves[0], { key: "A-2", from: "A", to: "B", fromIndex: 1, toIndex: 1 });
});

test("dropping outside any lane fires no onMove", () => {
	const { a, moves } = buildBoard();
	a[0].dispatchEvent(pointer("pointerdown", 50, 5));
	window.dispatchEvent(pointer("pointermove", 500, 500)); // nowhere
	window.dispatchEvent(pointer("pointerup", 500, 500));
	assert.equal(moves.length, 0);
});

test("hostDisconnected unbinds the zone: no drag starts afterward", () => {
	const { a, moves, ctrlA, ctrlB } = buildBoard();
	ctrlA.hostDisconnected();
	ctrlB.hostDisconnected();
	a[0].dispatchEvent(pointer("pointerdown", 50, 5));
	window.dispatchEvent(pointer("pointermove", 50, 45));
	window.dispatchEvent(pointer("pointerup", 50, 45));
	assert.equal(moves.length, 0, "no move after both zones disconnected");
});

// ---- click vs. drag: the real bug report this shape produced ---------------
//
// draggable and a card's own click handler have to coexist: a plain click
// (pointerdown, no meaningful movement, pointerup) must reach the browser's
// native click event exactly as it would with no drag zone installed, and
// only real movement past DRAG_THRESHOLD may commit to a drag at all. Found
// live in NovelMaker (Track D/W7): every pointerdown called preventDefault()
// unconditionally, which suppresses click-event synthesis regardless of
// whether the pointer ever moved, so a card's own dj-card-click could never
// fire while draggable was set.

test("a plain click — no movement at all — fires no onMove and never calls preventDefault", () => {
	const { a, moves } = buildBoard();
	const down = pointer("pointerdown", 50, 5);
	a[0].dispatchEvent(down);
	window.dispatchEvent(pointer("pointerup", 50, 5));
	assert.equal(moves.length, 0);
	assert.equal(down.defaultPrevented, false, "a plain click must reach native click synthesis");
});

test("movement under DRAG_THRESHOLD stays a click: no onMove, no preventDefault anywhere", () => {
	const { a, moves } = buildBoard();
	const down = pointer("pointerdown", 50, 5);
	a[0].dispatchEvent(down);
	const move = pointer("pointermove", 52, 6); // ~2.2px — a real hand is not perfectly still
	window.dispatchEvent(move);
	window.dispatchEvent(pointer("pointerup", 52, 6));
	assert.equal(moves.length, 0);
	assert.equal(down.defaultPrevented, false);
	assert.equal(move.defaultPrevented, false, "sub-threshold movement is still a click, not a drag");
});

test("movement at/over DRAG_THRESHOLD commits to a real drag: onMove fires, the move IS prevented", () => {
	const { a, moves } = buildBoard();
	const down = pointer("pointerdown", 50, 5);
	a[0].dispatchEvent(down);
	const move = pointer("pointermove", 50, 45); // same real drag the earlier reorder test uses
	window.dispatchEvent(move);
	window.dispatchEvent(pointer("pointerup", 50, 45));
	assert.equal(moves.length, 1);
	assert.equal(down.defaultPrevented, false, "still not on pointerdown itself — see PendingDrag's own comment");
	assert.equal(move.defaultPrevented, true, "a committed drag suppresses the native scroll/selection default");
});

// ============================================================ keyboard grab mode
function buildList() {
	const lane = stub(document.createElement("div"), { left: 0, right: 100, top: 0, bottom: 100 });
	document.body.append(lane);
	const items = [item("L-1"), item("L-2"), item("L-3")];
	items.forEach((el) => lane.append(el));
	const moves = [];
	const announced = [];
	const cfg = { container: () => lane, items: () => items, zoneId: "L", axis: "y", onMove: (m) => moves.push(m) };
	const handler = keyboardGrabMode({ zones: () => [cfg], announce: (msg) => announced.push(msg) });
	return { lane, items, moves, announced, handler };
}
function keydown(handler, key) { handler(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })); }

test("grab → arrow → drop calls onMove once and announces each step", () => {
	const { items, moves, announced, handler } = buildList();
	items[0].focus();
	keydown(handler, " "); // grab L-1
	keydown(handler, "ArrowDown"); // move to index 1
	keydown(handler, " "); // drop
	assert.equal(moves.length, 1);
	assert.deepEqual(moves[0], { key: "L-1", from: "L", to: "L", fromIndex: 0, toIndex: 1 });
	assert.ok(announced.length >= 3, "grab, move, and drop are announced");
	assert.match(announced[0], /Grabbed/);
	assert.match(announced.at(-1), /Dropped/);
});

test("Escape cancels a grab without an onMove", () => {
	const { items, moves, announced, handler } = buildList();
	items[0].focus();
	keydown(handler, " "); // grab
	keydown(handler, "ArrowDown"); // move
	keydown(handler, "Escape"); // cancel
	assert.equal(moves.length, 0, "cancel emits no move");
	assert.match(announced.at(-1), /Cancelled/);
});
