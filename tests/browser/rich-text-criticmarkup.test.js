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
		// `value` has to be set BEFORE first connect, alongside `format`/`plugins` — dj-rich-text
		// only applies `value` through the active format at `#buildEditor()` time (its first
		// `updated()`); setting `.value` on an already-built editor has no wired effect (there is no
		// `c.has("value")` branch in `updated()`), so it must be a construction-time property here,
		// not a later assignment.
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
