// dj-rich-text, in a real browser: real contenteditable typing through Lexical (which needs a
// live selection — unreliable under happy-dom), toolbar actions that change the active format
// and the serialized DOM, the paste sanitizer's allowlist round-trip, form participation, and a
// caret-anchored mentions menu. Plus an axe pass. The editor renders in LIGHT DOM.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import { sanitizeHtml } from "../../packages/rich-text/dist/index.js";
import { createMentionsPlugin } from "../../packages/rich-text-mentions/dist/index.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

describe("dj-rich-text", () => {
	afterEach(cleanup);

	it("real typing updates the value and emits dj-change", async () => {
		const el = await mount(make("dj-rich-text", { label: "Body" }));
		await el.updateComplete;
		await settleFrames();
		let changes = 0;
		el.addEventListener("dj-change", () => changes++);

		el.focus();
		await sendKeys({ type: "Hello" });
		await el.updateComplete;
		await settleFrames();

		assert(el.value.includes("Hello"), `typed text should reach the value (got ${JSON.stringify(el.value)})`);
		assert(changes >= 1, "typing should emit dj-change");
	});

	it("the Bold toolbar button toggles the active format", async () => {
		const el = await mount(make("dj-rich-text", { label: "Body" }));
		await el.updateComplete;
		await settleFrames();
		// Establish a live caret first — toggling a format needs a selection to act on.
		el.focus();
		await sendKeys({ type: "x" });
		await el.updateComplete;
		await settleFrames();

		const bold = el.querySelector('[aria-label="Bold"]');
		assert(bold, "the default toolbar has a Bold control");
		bold.click();
		await el.updateComplete;
		await settleFrames();
		assertEqual(el.querySelector('[aria-label="Bold"]').getAttribute("aria-pressed"), "true", "Bold reads active after enabling it");
		el.querySelector('[aria-label="Bold"]').click();
		await el.updateComplete;
		await settleFrames();
		assertEqual(el.querySelector('[aria-label="Bold"]').getAttribute("aria-pressed"), "false", "Bold reads inactive after toggling it off");
	});

	it("typing with Bold enabled produces bold markup in the value", async () => {
		const el = await mount(make("dj-rich-text", { label: "Body" }));
		await el.updateComplete;
		await settleFrames();
		el.focus();

		el.querySelector('[aria-label="Bold"]').click();
		await el.updateComplete;
		await sendKeys({ type: "loud" });
		await el.updateComplete;
		await settleFrames();
		assert(/<(strong|b)\b/i.test(el.value), `bold text should serialize to a bold element (got ${JSON.stringify(el.value)})`);
		assert(el.value.includes("loud"), "the typed text is present");
	});

	it("the paste sanitizer drops scripts and handlers but keeps allowed markup", () => {
		const dirty = '<p onclick="steal()">keep <b>me</b><script>evil()</script></p>';
		const clean = sanitizeHtml(dirty);
		assert(!/script/i.test(clean), "a <script> is removed");
		assert(!/onclick/i.test(clean), "an inline event handler is stripped");
		assert(clean.includes("keep") && /<b>me<\/b>/i.test(clean), "allowed text and tags are preserved");
	});

	it("participates in a form under its name", async () => {
		const form = make("form");
		const el = make("dj-rich-text", { name: "body", label: "Body" });
		form.append(el);
		await mount(form);
		await el.updateComplete;
		await settleFrames();

		el.focus();
		await sendKeys({ type: "Ship it" });
		await el.updateComplete;
		await settleFrames();
		assert(new FormData(form).get("body").includes("Ship it"), "FormData carries the editor's HTML value");
	});

	it("a mentions plugin opens a caret-anchored menu after the trigger", async () => {
		const source = (q) =>
			Promise.resolve([{ id: "u1", label: "Alice" }, { id: "u2", label: "Amir" }].filter((u) => u.label.toLowerCase().includes(q.toLowerCase())));
		const el = make("dj-rich-text", { label: "Body" });
		el.plugins = [createMentionsPlugin({ source })];
		await mount(el);
		await el.updateComplete;
		await settleFrames();

		el.focus();
		await sendKeys({ type: "@a" });
		await wait(350); // debounce (150ms) + the async source resolve
		await settleFrames();

		const popup = [...document.body.querySelectorAll("dj-popup")].find((p) => p.open);
		assert(popup, "typing the @ trigger opens the caret-anchored menu");
		// dj-list renders its items in shadow DOM; read the resolved options, not light-DOM text.
		const labels = (popup.querySelector("dj-list")?.options ?? []).map((o) => o.label ?? o.value);
		assert(labels.some((l) => /Alice/.test(l)), `the menu lists the matching mention (got ${JSON.stringify(labels)})`);
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-rich-text", { label: "Body", name: "body" }));
		await el.updateComplete;
		await settleFrames();
		await assertNoViolations(el);
	});

	it("a value set after the editor is built replaces the document", async () => {
		const el = await mount(make("dj-rich-text", { label: "Body" }));
		await el.updateComplete;
		await settleFrames();

		el.value = "<p>Seeded after build</p>";
		await el.updateComplete;
		await settleFrames();

		const editable = el.querySelector(".dj-rt-editable");
		assert(
			editable.textContent.includes("Seeded after build"),
			`the assigned value should reach the editable region (got ${JSON.stringify(editable.textContent)})`,
		);
		assert(el.value.includes("Seeded after build"), "and should round-trip back out through the serializer");
	});

	it("a value set after build replaces the existing content rather than appending to it", async () => {
		const el = await mount(make("dj-rich-text", { label: "Body" }));
		await el.updateComplete;
		await settleFrames();
		el.focus();
		await sendKeys({ type: "typed" });
		await el.updateComplete;
		await settleFrames();

		el.value = "<p>replacement</p>";
		await el.updateComplete;
		await settleFrames();

		const text = el.querySelector(".dj-rt-editable").textContent;
		assert(text.includes("replacement"), "the new value is in the document");
		assert(!text.includes("typed"), "the old content is replaced, not appended to");
	});

	it("typing is not disturbed by the editor writing its own value back", async () => {
		const el = await mount(make("dj-rich-text", { label: "Body" }));
		await el.updateComplete;
		await settleFrames();
		el.focus();
		await sendKeys({ type: "Hello" });
		await el.updateComplete;
		await settleFrames();
		await sendKeys({ type: " world" });
		await el.updateComplete;
		await settleFrames();

		const text = el.querySelector(".dj-rt-editable").textContent;
		assertEqual(
			text.trim(),
			"Hello world",
			"each keystroke lands after the last; re-applying value on every change would reset the caret",
		);
	});
});
