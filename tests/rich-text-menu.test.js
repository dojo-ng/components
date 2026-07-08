// Tests for the shared caret-anchored menu machinery. Popup geometry and the interactive feel are
// browser checks (MN4); here we verify the pure matcher, that the trigger watch calls onQueryChange
// with the query, and that the Escape key command is registered while open and disposed on close.
// The update listener CAN read a collapsed selection headlessly (verified), so the primary path works.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
	createEditor,
	$getRoot,
	$createParagraphNode,
	$createTextNode,
	$insertNodes,
	KEY_ESCAPE_COMMAND,
	KEY_ARROW_DOWN_COMMAND,
	KEY_ARROW_UP_COMMAND,
	KEY_ENTER_COMMAND,
} from "lexical";
import { createEditorMenu, computeMatch } from "../packages/rich-text-menu/dist/index.js";

// Mention-style trigger: "@" at start-of-text or after whitespace, up to 30 word/./-/underscore chars.
const MATCH = (text) => {
	const m = /(^|\s)@([\w.-]{0,30})$/.exec(text);
	return m ? { start: m.index + m[1].length, query: m[2] } : null;
};

const fakeCtx = (editor, host) => ({
	editor,
	host,
	command: (type, payload) => editor.dispatchCommand(type, payload),
	onSelectionChange: () => () => {},
	activeFormats: () => new Set(),
});

const mountEditor = () => {
	const editor = createEditor({ onError: (e) => { throw e; } });
	const host = document.createElement("div");
	const editable = document.createElement("div");
	editable.className = "dj-rt-editable";
	host.appendChild(editable);
	document.body.appendChild(host);
	editor.setRootElement(editable);
	return { editor, host };
};

const typeWithCaret = (editor, text) => {
	editor.update(
		() => {
			const p = $createParagraphNode();
			const t = $createTextNode(text);
			p.append(t);
			$getRoot().clear();
			$getRoot().append(p);
			t.select(text.length, text.length);
		},
		{ discrete: true },
	);
};

test("computeMatch runs the matcher over the text before the caret", () => {
	assert.deepEqual(computeMatch("hi @jo", MATCH), { start: 3, query: "jo" });
	assert.deepEqual(computeMatch("@", MATCH), { start: 0, query: "" });
	assert.equal(computeMatch("email@host", MATCH), null);
});

test("onQueryChange fires with the query when the trigger matches behind the caret", () => {
	const { editor, host } = mountEditor();
	const queries = [];
	const menu = createEditorMenu(fakeCtx(editor, host), {
		match: MATCH,
		onQueryChange: (q) => queries.push(q),
		onPick: () => {},
	});
	typeWithCaret(editor, "hello @jo");
	assert.deepEqual(queries, ["jo"]);
	assert.equal(menu.open, true);
	menu.dispose();
});

test("the Escape key command is registered while open and disposed on close", () => {
	const { editor, host } = mountEditor();
	const menu = createEditorMenu(fakeCtx(editor, host), {
		match: MATCH,
		onQueryChange: () => {},
		onPick: () => {},
	});
	typeWithCaret(editor, "x @a");
	assert.equal(menu.open, true);
	// While open, Escape is consumed (and closes the menu).
	assert.equal(editor.dispatchCommand(KEY_ESCAPE_COMMAND, null), true);
	assert.equal(menu.open, false);
	// Closed: the Escape command is no longer handled by the menu.
	assert.equal(editor.dispatchCommand(KEY_ESCAPE_COMMAND, null), false);
	menu.dispose();
});

// Regression (MN4): the nav keys must call preventDefault, not just return true. Returning true only
// stops Lexical's own command chain; without preventDefault the browser still moves the caret (ArrowUp
// then leaves the trigger and closes the menu) or inserts a newline on Enter.
test("Arrow/Enter handlers preventDefault while the menu has an active option", () => {
	const { editor, host } = mountEditor();
	const picked = [];
	const menu = createEditorMenu(fakeCtx(editor, host), {
		match: MATCH,
		onQueryChange: () => {},
		onPick: (o) => picked.push(o.value),
	});
	typeWithCaret(editor, "x @a");
	assert.equal(menu.open, true);
	menu.setOptions([{ value: "u1", label: "Al" }, { value: "u2", label: "Ax" }]);

	const fakeEvent = () => ({ prevented: 0, preventDefault() { this.prevented++; } });

	const down = fakeEvent();
	assert.equal(editor.dispatchCommand(KEY_ARROW_DOWN_COMMAND, down), true);
	assert.equal(down.prevented, 1);

	const up = fakeEvent();
	assert.equal(editor.dispatchCommand(KEY_ARROW_UP_COMMAND, up), true);
	assert.equal(up.prevented, 1);

	// Enter with an active option is consumed AND preventDefaulted (the browser must not also insert a
	// newline). onPick firing is a browser check (MN4): the collapsed selection drops headlessly, so
	// pick's re-match bails — that's fine here; we only guard key consumption.
	const enter = fakeEvent();
	assert.equal(editor.dispatchCommand(KEY_ENTER_COMMAND, enter), true);
	assert.equal(enter.prevented, 1);
	menu.dispose();
});

// Regression: picking must remove the trigger text AND let onPick insert, in ONE update. A separate
// insertion update drops the collapsed selection (the emptied trigger node is reconciled away), so the
// inserted node would not land and the caret would just "overwrite" the trigger text.
test("picking removes the trigger text and onPick inserts in the same update", async () => {
	const { editor, host } = mountEditor();
	const menu = createEditorMenu(fakeCtx(editor, host), {
		match: MATCH,
		onQueryChange: () => {},
		pickInUpdate: true,
		onPick: (o) => {
			editor.update(() => {
				const pill = $createTextNode(`[${o.value}]`);
				const space = $createTextNode(" ");
				$insertNodes([pill, space]);
				space.selectEnd();
			});
		},
	});
	typeWithCaret(editor, "x @a");
	menu.setOptions([{ value: "u1", label: "Al" }]);
	// Enter (with an active option) routes through chooseActive -> change -> pick.
	editor.dispatchCommand(KEY_ENTER_COMMAND, { preventDefault() {} });
	await new Promise((r) => setTimeout(r, 0)); // let the (nested) update commit
	let text = "";
	editor.getEditorState().read(() => { text = $getRoot().getTextContent(); });
	assert.equal(text, "x [u1] "); // trigger "@a" gone, pill + space inserted
	menu.dispose();
});

// The popup stays hidden while the option list is empty and not loading (so the slash menu never opens
// when no plugin contributes), and shows once options arrive.
test("popup hides on an empty non-loading list and shows when options arrive", () => {
	const { editor, host } = mountEditor();
	const menu = createEditorMenu(fakeCtx(editor, host), {
		match: MATCH,
		onQueryChange: () => {},
		onPick: () => {},
	});
	typeWithCaret(editor, "x @a");
	assert.equal(menu.open, true); // trigger matched: the menu is logically open
	const popup = [...document.body.querySelectorAll("dj-popup")].at(-1);
	menu.setOptions([], false); // empty + not loading
	assert.equal(popup.open, false); // ...but nothing to show, so the popup is hidden
	menu.setOptions([{ value: "u1", label: "Al" }], false);
	assert.equal(popup.open, true); // options arrived -> shown
	menu.setOptions([], true); // loading spinner
	assert.equal(popup.open, true); // loading -> shown
	menu.dispose();
});

// With no active option (menu never given options), Enter falls through so a normal newline still works.
test("Enter falls through (no preventDefault) when no option is active", () => {
	const { editor, host } = mountEditor();
	const menu = createEditorMenu(fakeCtx(editor, host), {
		match: MATCH,
		onQueryChange: () => {},
		onPick: () => {},
	});
	typeWithCaret(editor, "x @a");
	assert.equal(menu.open, true);
	const enter = { prevented: 0, preventDefault() { this.prevented++; } };
	assert.equal(editor.dispatchCommand(KEY_ENTER_COMMAND, enter), false);
	assert.equal(enter.prevented, 0);
	menu.dispose();
});

test("no trigger match leaves the menu closed", () => {
	const { editor, host } = mountEditor();
	let calls = 0;
	const menu = createEditorMenu(fakeCtx(editor, host), {
		match: MATCH,
		onQueryChange: () => calls++,
		onPick: () => {},
	});
	typeWithCaret(editor, "just some text");
	assert.equal(menu.open, false);
	assert.equal(calls, 0);
	menu.dispose();
});
