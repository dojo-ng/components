// rich-text-criticmarkup, in a real browser: the comment decorator's keyboard flow (Track T4) —
// Tab reaches it, Enter opens the popup with focus in the text area, Escape closes without saving
// and returns focus to the button — and an axe pass with the popup open.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import { criticMarkupPlugin } from "../../packages/rich-text-criticmarkup/dist/index.js";

describe("rich-text-criticmarkup: the comment popup, keyboard and axe", () => {
	afterEach(cleanup);

	async function mountWithComment() {
		// Seeding at construction, alongside `format`/`plugins`, is one of two supported ways to load
		// content (the other being a later `.value =` assignment, wired since
		// rich-text-value-button-name-spec.md Track V, 2026-09-10). Construction-time is used here
		// because `format`/`plugins` also need to be set before the editor builds.
		const el = make("dj-rich-text", {
			label: "Body",
			format: "criticmarkup",
			plugins: [criticMarkupPlugin],
			value: "before {>>a note<<} after",
		});
		await mount(el);
		await el.updateComplete;
		await settleFrames();
		return el;
	}

	it("the comment button is a real, focusable button reachable from the keyboard", async () => {
		const el = await mountWithComment();
		const button = el.querySelector(".dj-cm-comment-button");
		assert(button, "the comment decorator's button should be in the light DOM");
		assertEqual(button.tagName, "BUTTON", "it must be a real <button>, not a styled span");
		button.focus();
		assertEqual(document.activeElement, button, "the button should be focusable and reachable");
	});

	it("Enter opens the popup with focus moved into the text area", async () => {
		const el = await mountWithComment();
		const button = el.querySelector(".dj-cm-comment-button");
		button.focus();
		await sendKeys({ press: "Enter" });
		await settleFrames();
		const popup = [...document.querySelectorAll("dj-popup.dj-cm-comment-popup")].find((p) => p.open);
		assert(popup, "Enter on the comment button should open the popup");
		const textArea = popup.querySelector("dj-text-area");
		assert(textArea, "the popup should hold a dj-text-area");
		assertEqual(textArea.value, "a note", "seeded with the current note text");
		const innerInput = textArea.shadowRoot?.querySelector("textarea");
		assert(
			document.activeElement === textArea || (textArea.shadowRoot && textArea.shadowRoot.activeElement === innerInput),
			"focus should land in the text area",
		);
	});

	it("Escape closes the popup without saving and returns focus to the button", async () => {
		const el = await mountWithComment();
		const button = el.querySelector(".dj-cm-comment-button");
		button.focus();
		await sendKeys({ press: "Enter" });
		await settleFrames();
		const popup = [...document.querySelectorAll("dj-popup.dj-cm-comment-popup")].find((p) => p.open);
		const textArea = popup.querySelector("dj-text-area");
		const innerInput = textArea.shadowRoot?.querySelector("textarea");
		innerInput?.focus();
		await sendKeys({ type: " — edited" });
		await sendKeys({ press: "Escape" });
		await settleFrames();
		assertEqual(popup.open, false, "Escape should close the popup");
		assertEqual(document.activeElement, button, "focus should return to the comment button");
		assert(el.value.includes("a note") && !el.value.includes("edited"), "Escape must not save the edit");
	});

	it("Save persists an edit and returns focus to the button", async () => {
		const el = await mountWithComment();
		const button = el.querySelector(".dj-cm-comment-button");
		button.focus();
		await sendKeys({ press: "Enter" });
		await settleFrames();
		const popup = [...document.querySelectorAll("dj-popup.dj-cm-comment-popup")].find((p) => p.open);
		const textArea = popup.querySelector("dj-text-area");
		textArea.value = "changed note";
		textArea.dispatchEvent(new Event("input", { bubbles: true }));
		const saveButton = [...popup.querySelectorAll("dj-button")].find((b) => /save/i.test(b.textContent || ""));
		assert(saveButton, "the popup should have a Save control");
		saveButton.click();
		await el.updateComplete;
		await settleFrames();
		assertEqual(popup.open, false, "Save should close the popup");
		assert(el.value.includes("changed note"), `the edit should be saved into value (got ${JSON.stringify(el.value)})`);
	});

	// Q1.7 of NovelMaker's search-and-edits-spec.md (2026-09-27): the six toolbar items went from
	// icon+aria-label to visible text after THIS test file's own axe run found the icon shape
	// unnamed; a real consumer then found visible text overflows a normal-width toolbar. This
	// checks the icon-plus-hidden-text replacement actually clears the same bar the visible-text
	// swap was for, rather than assuming the reasoning in the code comment is enough.
	it("the toolbar's icon buttons each still have a real accessible name, and the toolbar itself is axe-clean", async () => {
		const el = await mountWithComment();
		const buttons = [...el.querySelectorAll(".dj-rt-toolbar dj-button")];
		assert(buttons.length >= 6, `expected the six criticmarkup toolbar buttons, found ${buttons.length}`);
		await assertNoViolations(el);
	});

	// NovelMaker's Q1.7 pass (2026-09-27) reported clicking "Suggest edits" and seeing no visible
	// change — traced to `isSuggestionMode` living in a WeakMap entirely outside Lexical's own
	// editor state, so neither of the core's two built-in re-render triggers (an editor update, a
	// selection change) ever fires from this click; a manual pass that clicked the button and then
	// did something else right after read the SECOND action's own incidental re-render as proof the
	// first one worked — exactly the shape this test is written to rule out, by checking the DOM
	// immediately after the click and NOTHING else.
	it("the suggest-edits button's own aria-pressed and kind flip on the SAME click that toggles the mode, with no other action in between", async () => {
		const el = await mountWithComment();
		const button = [...el.querySelectorAll(".dj-rt-toolbar dj-button")].find(
			(b) => b.getAttribute("title") === "Suggest edits",
		);
		assert(button, "expected a Suggest edits toolbar button");
		assertEqual(button.getAttribute("aria-pressed"), "false", "starts inactive");
		assertEqual(button.getAttribute("kind"), "text", "starts as a plain text button");

		button.shadowRoot.querySelector("button").click();
		await settleFrames();

		assertEqual(button.getAttribute("aria-pressed"), "true", "the click's own render should flip this");
		assertEqual(button.getAttribute("kind"), "outlined", "and this — no second action should be needed");
	});

	it("has no serious or critical accessibility violations with the comment popup open", async () => {
		const el = await mountWithComment();
		const button = el.querySelector(".dj-cm-comment-button");
		button.click();
		await el.updateComplete;
		await settleFrames();
		const popup = [...document.querySelectorAll("dj-popup.dj-cm-comment-popup")].find((p) => p.open);
		assert(popup, "the popup should be open for this check");
		await assertNoViolations(document.body);
	});
});
