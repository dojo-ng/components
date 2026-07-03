// dj-board smokes: K2 (lanes/cards/counts/WIP/roles) + K3 (applyCardMove, move menu, events).
// K4 (keyboard, focus-follow, announcer) adds its cases here later.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { html } from "lit";
import { applyCardMove } from "../packages/board/dist/index.js";

const LANES = [
	{ value: "todo", label: "To do" },
	{ value: "doing", label: "In progress", limit: 2 },
	{ value: "done", label: "Done" },
];
const DATA = [
	{ id: "t1", status: "todo", title: "Write spec" },
	{ id: "t2", status: "todo", title: "Review spec" },
	{ id: "d1", status: "doing", title: "Build K1" },
	{ id: "d2", status: "doing", title: "Build K2" },
	{ id: "d3", status: "doing", title: "Build K3" },
	{ id: "z1", status: "done", title: "Design" },
];

async function board(props = {}) {
	return mount("dj-board", { lanes: LANES, data: DATA, label: "Sprint", ...props });
}
const laneEls = (el) => [...el.renderRoot.querySelectorAll(".lane")];
const laneTitles = (el) => [...el.renderRoot.querySelectorAll(".lane-title")].map((t) => t.textContent);
const laneCounts = (el) => [...el.renderRoot.querySelectorAll(".lane-count")].map((t) => t.textContent);
const cardsIn = (laneEl) => [...laneEl.querySelectorAll('[role="listitem"]')];

// --- K2: rendering ---

test("lanes render in `lanes` order with labels and counts (n and n/limit)", async () => {
	const el = await board();
	assert.deepEqual(laneTitles(el), ["To do", "In progress", "Done"]);
	assert.deepEqual(laneCounts(el), ["2", "3/2", "1"]);
	assert.equal(el.renderRoot.querySelector('[part="board"]').getAttribute("aria-label"), "Sprint");
});

test("derived-lane fallback: no `lanes` → distinct group-by values in data order", async () => {
	const el = await board({ lanes: [] });
	assert.deepEqual(laneTitles(el), ["todo", "doing", "done"]);
});

test("cards land in their lanes in data order; default card shows the card-title field", async () => {
	const el = await board();
	const [todo] = laneEls(el);
	const cards = cardsIn(todo);
	assert.equal(cards.length, 2);
	assert.equal(cards[0].getAttribute("data-key"), "t1");
	assert.match(cards[0].textContent, /Write spec/);
	assert.equal(cards[0].getAttribute("aria-label"), "Write spec");
	assert.equal(todo.querySelector(".lane-body").getAttribute("role"), "list");
	assert.match(todo.querySelector(".lane-body").getAttribute("aria-label"), /To do, 2 cards/);
});

test("renderCard content renders inside a shell that keeps role/listitem + data-key", async () => {
	const el = await board({ renderCard: (c) => html`<em class="custom">${c.id}</em>` });
	const card = el.renderRoot.querySelector('[role="listitem"]');
	assert.ok(card.querySelector("em.custom"), "custom content inside the shell");
	assert.equal(card.getAttribute("data-key"), "t1");
	assert.ok(card.querySelector('[part="move-button"]'), "shell still owns the move button");
});

test("cards matching no lane are not rendered and warn once per value", async () => {
	const warnings = [];
	const orig = console.warn;
	console.warn = (msg) => warnings.push(msg);
	try {
		const el = await board({ data: [...DATA, { id: "x1", status: "limbo", title: "Lost" }, { id: "x2", status: "limbo", title: "Also lost" }] });
		await settled(el);
		assert.equal(el.renderRoot.querySelectorAll('[role="listitem"]').length, DATA.length, "limbo cards not rendered");
		assert.equal(warnings.filter((w) => String(w).includes('"limbo"')).length, 1, "one warning per unmatched value");
	} finally {
		console.warn = orig;
	}
});

test("over-limit lane exposes the lane-over part hook", async () => {
	const el = await board();
	const doing = laneEls(el)[1];
	assert.match(doing.getAttribute("part") ?? doing.closest("[part]")?.getAttribute("part") ?? "", /lane-over/);
	const todo = laneEls(el)[0];
	assert.doesNotMatch(todo.getAttribute("part") ?? "", /lane-over/);
});

// --- K3: applyCardMove ---

test("applyCardMove: up, down, cross-lane append, cross-lane at index, edges, purity", () => {
	const gb = "status";
	const move = (data, card, to, toIndex, from = card.status, fromIndex = 0) =>
		applyCardMove(data, { card, key: card.id, from, to, fromIndex, toIndex }, gb);
	// down within a lane: t1 to position 1 of todo
	let out = move(DATA, DATA[0], "todo", 1);
	assert.deepEqual(out.filter((c) => c.status === "todo").map((c) => c.id), ["t2", "t1"]);
	// up within a lane: d3 to position 0 of doing
	out = move(DATA, DATA[4], "doing", 0);
	assert.deepEqual(out.filter((c) => c.status === "doing").map((c) => c.id), ["d3", "d1", "d2"]);
	// cross-lane append: t1 → done at index 1 (past end appends)
	out = move(DATA, DATA[0], "done", 1);
	assert.deepEqual(out.filter((c) => c.status === "done").map((c) => c.id), ["z1", "t1"]);
	// cross-lane at index 0: t1 → doing head
	out = move(DATA, DATA[0], "doing", 0);
	assert.deepEqual(out.filter((c) => c.status === "doing").map((c) => c.id), ["t1", "d1", "d2", "d3"]);
	// into an effectively empty lane value
	out = move(DATA, DATA[0], "review", 0);
	assert.equal(out.find((c) => c.id === "t1").status, "review");
	// purity: inputs untouched, moved card is a copy
	assert.equal(DATA[0].status, "todo");
	assert.equal(DATA.length, 6);
	assert.notEqual(out.find((c) => c.id === "t1"), DATA[0]);
	// unknown card: returns the input array unchanged
	assert.equal(applyCardMove(DATA, { card: { id: "ghost" }, key: "ghost", from: "a", to: "b", fromIndex: 0, toIndex: 0 }, gb), DATA);
});

// --- K3: move menu + events ---

async function openMenu(el, cardIndex = 0) {
	const btn = [...el.renderRoot.querySelectorAll('[part="move-button"]')][cardIndex];
	btn.click();
	await settled(el);
	return el.renderRoot.querySelector("dj-list");
}

test("move menu: ⋮ opens a menu list with Move up/down + every other lane; edges disabled", async () => {
	const el = await board();
	const list = await openMenu(el, 0); // t1: first card of todo
	assert.ok(list, "menu list present");
	const labels = list.options.map((o) => o.label);
	assert.deepEqual(labels, ["Move up", "Move down", "Move to In progress", "Move to Done"]);
	assert.equal(list.options[0].disabled, true, "Move up disabled for the first card");
	assert.equal(list.options[1].disabled, false);
	const btn = el.renderRoot.querySelector('[part="move-button"]');
	assert.equal(btn.getAttribute("aria-expanded"), "true");
	// last card of a lane: Move down disabled
	el.menu = null;
	await settled(el);
	const list2 = await openMenu(el, 1); // t2: last card of todo
	assert.equal(list2.options[1].disabled, true, "Move down disabled for the last card");
});

test('selecting "Move to X" emits dj-card-move with to=X and toIndex = X\'s length; menu closes', async () => {
	const el = await board();
	const moves = [];
	el.addEventListener("dj-card-move", (e) => moves.push(e.detail));
	const list = await openMenu(el, 0);
	list.value = "to:done";
	list.dispatchEvent(new Event("change"));
	await settled(el);
	assert.equal(moves.length, 1);
	assert.deepEqual(
		{ ...moves[0], card: moves[0].card.id },
		{ card: "t1", key: "t1", from: "todo", to: "done", fromIndex: 0, toIndex: 1 },
	);
	assert.equal(el.menu, null, "menu closed after selection");
});

test("Move up / Move down emit the right toIndex within the lane", async () => {
	const el = await board();
	const moves = [];
	el.addEventListener("dj-card-move", (e) => moves.push(e.detail));
	let list = await openMenu(el, 3); // d2: middle card of doing (cards 2,3,4 are doing)
	list.value = "__up";
	list.dispatchEvent(new Event("change"));
	await settled(el);
	list = await openMenu(el, 3);
	list.value = "__down";
	list.dispatchEvent(new Event("change"));
	await settled(el);
	assert.equal(moves.length, 2);
	assert.deepEqual([moves[0].fromIndex, moves[0].toIndex, moves[0].from, moves[0].to], [1, 0, "doing", "doing"]);
	assert.deepEqual([moves[1].fromIndex, moves[1].toIndex], [1, 2]);
});

test("Escape closes the menu without emitting a move", async () => {
	const el = await board();
	const moves = [];
	el.addEventListener("dj-card-move", (e) => moves.push(e.detail));
	await openMenu(el, 0);
	document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
	await settled(el);
	assert.equal(el.menu, null, "menu closed");
	assert.equal(moves.length, 0, "no move emitted");
});

test("clicking a card's content emits dj-card-click with the card and key", async () => {
	const el = await board();
	const clicks = [];
	el.addEventListener("dj-card-click", (e) => clicks.push(e.detail));
	el.renderRoot.querySelector(".card-content").click();
	assert.equal(clicks.length, 1);
	assert.equal(clicks[0].key, "t1");
	assert.equal(clicks[0].card.title, "Write spec");
});
