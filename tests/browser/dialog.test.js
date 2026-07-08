// dj-dialog, in a real browser: the focus trap cycles and wraps with real Tab
// (native focus movement, which happy-dom can't do), focus returns to the opener on
// close, and an axe pass. Uses the exported focus helpers to compute the expected
// trap order rather than hard-coding it.
import { sendKeys } from "@web/test-runner-commands";
import { collectFocusables, deepActiveElement } from "../../packages/dojo-element/dist/index.js";
import { cleanup, make, assert } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/dialog/dist/index.js";

function buildDialog() {
	const opener = make("button", {}, "Open");
	const dialog = make("dj-dialog");
	const a = make("button", { id: "a" }, "A");
	const b = make("button", { id: "b" }, "B");
	dialog.append(a, b);
	document.body.append(opener, dialog);
	return { opener, dialog, a, b };
}

describe("dj-dialog", () => {
	afterEach(cleanup);

	it("moves focus into the dialog on open and wraps with Tab / Shift+Tab", async () => {
		const { opener, dialog, a, b } = buildDialog();
		opener.focus();
		dialog.open = true;
		await dialog.updateComplete;

		// Focus moves to the first slotted focusable.
		assert(deepActiveElement() === a, "focus should move to the first focusable content on open");

		// Trap order = shadow focusables (the close button) then slotted content.
		const focusables = collectFocusables(dialog.shadowRoot, dialog);
		const first = focusables[0];
		const last = focusables[focusables.length - 1];
		assert(last === b, "the last focusable should be the last slotted button");

		// Tab from the last focusable wraps to the first.
		last.focus();
		await sendKeys({ press: "Tab" });
		assert(deepActiveElement() === first, "Tab from the last focusable should wrap to the first");

		// Shift+Tab from the first focusable wraps to the last.
		first.focus();
		await sendKeys({ press: "Shift+Tab" });
		assert(deepActiveElement() === last, "Shift+Tab from the first focusable should wrap to the last");
	});

	it("returns focus to the opener on close", async () => {
		const { opener, dialog } = buildDialog();
		opener.focus();
		dialog.open = true;
		await dialog.updateComplete;
		assert(deepActiveElement() !== opener, "focus should have left the opener while open");

		dialog.close();
		await dialog.updateComplete;
		assert(deepActiveElement() === opener, "closing should restore focus to the opener");
	});

	it("has no serious or critical accessibility violations", async () => {
		const { dialog } = buildDialog();
		dialog.append(make("span", { slot: "title" }, "Confirm"));
		dialog.open = true;
		await dialog.updateComplete;
		await assertNoViolations(dialog);
	});
});
