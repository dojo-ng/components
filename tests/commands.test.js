// @dojo-ng/commands: the shortcut matcher and registry. The key cases are ported from
// NovelMaker's web/tools/shortcuts.test.mjs (Option-Cmd digits, physical key, Cmd-. and Cmd-K);
// scopes, `when`, sequences, conflicts, the reserved list, and typing suppression are new.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { CommandRegistry, formatShortcut } from "../packages/commands/dist/index.js";

const MAC = { platform: "mac" };

function setup(options = {}) {
	const warnings = [];
	let time = 0;
	const registry = new CommandRegistry({ platform: "mac", warn: (m) => warnings.push(m), now: () => time, ...options });
	return { registry, warnings, advance: (ms) => (time += ms) };
}

function press(registry, code, mods = {}, target = document.body, extra = {}) {
	const event = new KeyboardEvent("keydown", { code, bubbles: true, composed: true, cancelable: true, ...mods, ...extra });
	target.dispatchEvent(event);
	return registry.handle(event);
}

function recorder(registry, entries) {
	const ran = [];
	for (const [id, shortcut, more] of entries) registry.register({ id, label: id, shortcut, run: () => ran.push(id), ...more });
	return ran;
}

const MOD_ALT = { metaKey: true, altKey: true };

test("Option-Cmd digits pick a command each (ported from NovelMaker)", () => {
	const { registry } = setup();
	const ran = recorder(registry, Array.from({ length: 8 }, (_, i) => [`d${i + 1}`, `Alt+Mod+${i + 1}`]));
	for (let n = 1; n <= 8; n++) assert.equal(press(registry, `Digit${n}`, MOD_ALT), true);
	assert.deepEqual(ran, ["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"]);
});

test("it reads the physical key: Option changes what the digit types, not which key it is", () => {
	const { registry } = setup();
	const ran = recorder(registry, [["one", "Alt+Mod+Digit1"]]);
	press(registry, "Digit1", MOD_ALT, document.body, { key: "¡" });
	assert.deepEqual(ran, ["one"]);
});

test("Cmd and a digit alone, or Option alone, or an unbound digit, match nothing", () => {
	const { registry } = setup();
	const ran = recorder(registry, [["one", "Alt+Mod+1"]]);
	assert.equal(press(registry, "Digit1", { metaKey: true }), false);
	assert.equal(press(registry, "Digit1", { altKey: true }), false);
	assert.equal(press(registry, "Digit9", MOD_ALT), false);
	assert.deepEqual(ran, []);
});

test("Cmd-. and Cmd-K, and shifted or bare keys match nothing else", () => {
	const { registry } = setup();
	const ran = recorder(registry, [["focus", "Mod+."], ["palette", "Mod+K"]]);
	press(registry, "Period", { metaKey: true });
	press(registry, "KeyK", { metaKey: true });
	press(registry, "KeyK");
	press(registry, "Period");
	press(registry, "KeyK", { metaKey: true, shiftKey: true });
	press(registry, "Period", { ctrlKey: true });
	assert.deepEqual(ran, ["focus", "palette"]);
});

test("Mod is Ctrl away from a Mac", () => {
	const { registry } = setup({ platform: "other" });
	const ran = recorder(registry, [["palette", "Mod+K"]]);
	assert.equal(press(registry, "KeyK", { metaKey: true }), false);
	assert.equal(press(registry, "KeyK", { ctrlKey: true }), true);
	assert.deepEqual(ran, ["palette"]);
});

test("a shortcut is shown in the platform's own spelling", () => {
	assert.equal(formatShortcut("Alt+Mod+4", MAC), "⌥⌘4");
	assert.equal(formatShortcut("Mod+.", MAC), "⌘.");
	assert.equal(formatShortcut("Mod+K", MAC), "⌘K");
	assert.equal(formatShortcut("Mod+K", { platform: "other" }), "Ctrl+K");
	assert.equal(formatShortcut("Alt+Mod+4", { platform: "other" }), "Ctrl+Alt+4");
	assert.equal(formatShortcut("Escape", MAC), "Esc");
	assert.equal(formatShortcut("G I", MAC), "G I");
	assert.equal(formatShortcut("Shift+/", MAC), "⇧/");
});

test("an unknown key or modifier throws when registered", () => {
	const { registry } = setup();
	assert.throws(() => registry.register({ id: "x", label: "x", shortcut: "Mod+Foo", run() {} }), /Unknown key "Foo"/);
	assert.throws(() => registry.register({ id: "x", label: "x", shortcut: "Hyper+K", run() {} }), /Unknown modifier "Hyper"/);
});

test("when() hides a command and its shortcut does nothing", () => {
	const { registry } = setup();
	let on = false;
	const ran = recorder(registry, [["c", "Mod+J", { when: () => on }]]);
	assert.equal(registry.active().length, 0);
	assert.equal(press(registry, "KeyJ", { metaKey: true }), false);
	on = true;
	assert.deepEqual(registry.active().map((c) => c.id), ["c"]);
	assert.equal(press(registry, "KeyJ", { metaKey: true }), true);
	assert.deepEqual(ran, ["c"]);
	on = false;
	assert.equal(registry.execute("c"), false);
});

test("a scoped shortcut fires only when focus is inside the scope", () => {
	const { registry } = setup();
	const grid = document.createElement("div");
	const cell = document.createElement("button");
	const other = document.createElement("button");
	grid.append(cell);
	document.body.append(grid, other);
	const ran = [];
	registry.scope(grid).register({ id: "del", label: "Delete rows", shortcut: "Delete", run: () => ran.push("del") });
	assert.equal(press(registry, "Delete", {}, other), false);
	assert.equal(press(registry, "Delete", {}, cell), true);
	assert.deepEqual(ran, ["del"]);
	assert.deepEqual(registry.active(other).map((c) => c.id), []);
	assert.deepEqual(registry.active(cell).map((c) => c.id), ["del"]);
	grid.remove();
	other.remove();
});

test("the innermost scope wins, then the global command", () => {
	const { registry } = setup();
	const page = document.createElement("section");
	const editor = document.createElement("div");
	const field = document.createElement("button");
	editor.append(field);
	page.append(editor);
	document.body.append(page);
	const ran = [];
	registry.register({ id: "global", label: "g", shortcut: "Delete", run: () => ran.push("global") });
	registry.scope(page).register({ id: "page", label: "p", shortcut: "Delete", run: () => ran.push("page") });
	registry.scope(editor).register({ id: "editor", label: "e", shortcut: "Delete", run: () => ran.push("editor") });
	press(registry, "Delete", {}, field);
	press(registry, "Delete", {}, page);
	press(registry, "Delete", {}, document.body);
	assert.deepEqual(ran, ["editor", "page", "global"]);
	page.remove();
});

test("a scope finds focus through a shadow root", () => {
	const { registry } = setup();
	const host = document.createElement("div");
	const root = host.attachShadow({ mode: "open" });
	const inner = document.createElement("button");
	root.append(inner);
	document.body.append(host);
	const ran = recorder(registry, []);
	registry.scope(host).register({ id: "h", label: "h", shortcut: "Mod+B", run: () => ran.push("h") });
	assert.equal(press(registry, "KeyB", { metaKey: true }, inner), true);
	assert.deepEqual(registry.active(inner).map((c) => c.id), ["h"]);
	host.remove();
});

test("scope.dispose removes only that scope's commands", () => {
	const { registry } = setup();
	const el = document.createElement("div");
	registry.register({ id: "keep", label: "k", run() {} });
	const scope = registry.scope(el);
	scope.register({ id: "a", label: "a", run() {} });
	scope.register({ id: "b", label: "b", run() {} });
	scope.dispose();
	assert.equal(registry.get("a"), undefined);
	assert.ok(registry.get("keep"));
});

test("a sequence needs both keys inside the 1 s gap", () => {
	const { registry, advance } = setup();
	const ran = recorder(registry, [["inbox", "G I"]]);
	assert.equal(press(registry, "KeyG"), false);
	advance(400);
	assert.equal(press(registry, "KeyI"), true);
	assert.deepEqual(ran, ["inbox"]);
	press(registry, "KeyG");
	advance(1500);
	assert.equal(press(registry, "KeyI"), false);
	assert.deepEqual(ran, ["inbox"]);
});

test("a wrong second key restarts the sequence from that key", () => {
	const { registry } = setup();
	const ran = recorder(registry, [["inbox", "G I"]]);
	press(registry, "KeyG");
	press(registry, "KeyG");
	press(registry, "KeyI");
	assert.deepEqual(ran, ["inbox"]);
});

test("two commands on one shortcut in the same scope warn once, naming both; the first wins", () => {
	const { registry, warnings } = setup();
	const ran = recorder(registry, [["a", "Mod+J"], ["b", "Mod+J"]]);
	assert.equal(warnings.length, 1);
	assert.match(warnings[0], /"a" and "b"/);
	registry.register({ id: "b", label: "b again", shortcut: "Mod+J", run: () => ran.push("b") });
	assert.equal(warnings.length, 1, "the same pair is reported once");
	press(registry, "KeyJ", { metaKey: true });
	assert.deepEqual(ran, ["a"]);
});

test("the same shortcut in different scopes is not a conflict; a sequence that is another's prefix is", () => {
	const { registry, warnings } = setup();
	const el = document.createElement("div");
	registry.register({ id: "a", label: "a", shortcut: "Delete", run() {} });
	registry.scope(el).register({ id: "b", label: "b", shortcut: "Delete", run() {} });
	assert.equal(warnings.length, 0);
	registry.register({ id: "g", label: "g", shortcut: "G", run() {} });
	registry.register({ id: "gi", label: "gi", shortcut: "G I", run() {} });
	assert.equal(warnings.length, 1);
});

test("browser-reserved combinations are refused: the command stays, the key is not bound", () => {
	const { registry, warnings } = setup();
	const ran = recorder(registry, [["w", "Mod+W"], ["t", "Mod+T"], ["n", "Mod+N"], ["q", "Mod+Q"]]);
	assert.equal(warnings.length, 4);
	for (const code of ["KeyW", "KeyT", "KeyN", "KeyQ"]) assert.equal(press(registry, code, { metaKey: true }), false);
	assert.deepEqual(ran, []);
	assert.ok(registry.get("w"));
});

test("shortcuts do not fire while typing in a field unless the command allows it", () => {
	const { registry } = setup();
	const input = document.createElement("input");
	document.body.append(input);
	const ran = recorder(registry, [["plain", "Mod+J"], ["palette", "Mod+K", { allowInText: true }]]);
	assert.equal(press(registry, "KeyJ", { metaKey: true }, input), false);
	assert.equal(press(registry, "KeyK", { metaKey: true }, input), true);
	assert.deepEqual(ran, ["palette"]);
	assert.equal(press(registry, "KeyJ", { metaKey: true }), true);
	input.remove();
});

test("a key the page already handled is left alone", () => {
	const { registry } = setup();
	const ran = recorder(registry, [["c", "Mod+J"]]);
	const event = new KeyboardEvent("keydown", { code: "KeyJ", metaKey: true, cancelable: true });
	event.preventDefault();
	assert.equal(registry.handle(event), false);
	assert.deepEqual(ran, []);
});

test("attach listens on a target; the returned function stops it", () => {
	const { registry } = setup();
	const ran = recorder(registry, [["c", "Mod+J"]]);
	const off = registry.attach(document);
	document.body.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyJ", metaKey: true, bubbles: true }));
	off();
	document.body.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyJ", metaKey: true, bubbles: true }));
	assert.deepEqual(ran, ["c"]);
});

test("onChange and onRun report registration and runs; registering an id again replaces it", () => {
	const { registry } = setup();
	let changes = 0;
	const seen = [];
	registry.onChange(() => changes++);
	registry.onRun((c) => seen.push(c.id));
	const off = registry.register({ id: "x", label: "one", run() {} });
	registry.register({ id: "x", label: "two", run() {} });
	assert.equal(registry.get("x").label, "two");
	off();
	assert.ok(registry.get("x"), "a stale disposer does not remove the replacement");
	registry.execute("x");
	registry.unregister("x");
	assert.equal(changes, 3);
	assert.deepEqual(seen, ["x"]);
});
