// <dj-command-palette> in a real browser: open from its key, search, run, close and give focus
// back, recent commands, the shortcut help view following focus between two scopes, and an axe
// pass with the palette open. Registry and matcher logic: tests/commands.test.js and
// tests/command-palette.test.js under happy-dom.
import { sendKeys } from "@web/test-runner-commands";
import { cleanup, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import { CommandRegistry } from "../../packages/commands/dist/index.js";
import "../../packages/command-palette/dist/index.js";

let detach;

afterEach(() => {
	detach?.();
	detach = undefined;
	cleanup();
});

async function setup(commands, props = {}) {
	// Ctrl is the Mod key here, so the same keystroke works in every engine on every host.
	const registry = new CommandRegistry({ platform: "other", warn: () => {} });
	detach = registry.attach(document);
	const ran = [];
	for (const c of commands) registry.register({ run: () => ran.push(c.id), ...c });
	const opener = document.createElement("button");
	opener.textContent = "Page";
	const palette = document.createElement("dj-command-palette");
	palette.registry = registry;
	Object.assign(palette, props);
	document.body.append(opener, palette);
	await palette.updateComplete;
	return { registry, palette, opener, ran };
}

const list = (palette) => palette.shadowRoot.querySelector("dj-list");
const rows = (palette) => [...list(palette).shadowRoot.querySelectorAll("li[part=item] .label")].map((e) => e.textContent.trim());
const headings = (palette) => [...list(palette).shadowRoot.querySelectorAll(".heading")].map((e) => e.textContent.trim());
const hints = (palette) => [...list(palette).shadowRoot.querySelectorAll(".hint")].map((e) => e.textContent.trim());
const input = (palette) => palette.shadowRoot.querySelector("input");
const status = (palette) => palette.shadowRoot.querySelector("[role=status]").textContent.trim();
const settle = async (palette) => {
	await palette.updateComplete;
	await list(palette).updateComplete;
	await settleFrames();
};
const focusedInPalette = (palette) => palette.shadowRoot.activeElement === input(palette);

const COMMANDS = [
	{ id: "save", label: "Save document", group: "File", shortcut: "Mod+S" },
	{ id: "close", label: "Close document", group: "File" },
	{ id: "theme", label: "Switch theme", group: "View", keywords: "dark light" },
	{ id: "inbox", label: "Go to inbox", group: "Go to", shortcut: "G I" },
];

describe("dj-command-palette", () => {
	it("opens from its key, focuses the input, and lists commands under group headings with shortcuts", async () => {
		const { palette, opener } = await setup(COMMANDS);
		opener.focus();
		await sendKeys({ press: "Control+KeyK" });
		await settle(palette);
		assertEqual(palette.open, true, "open");
		assert(focusedInPalette(palette), "the input has focus");
		assertEqual(rows(palette).join("|"), "Save document|Close document|Switch theme|Go to inbox");
		assertEqual(headings(palette).join("|"), "File|View|Go to");
		assertEqual(hints(palette).join("|"), "Ctrl+S|G I");
		assert(!rows(palette).some((r) => /Open command palette/.test(r)), "the palette does not list itself");
	});

	it("narrows as you type and runs the highlighted command on Enter, then gives focus back", async () => {
		const { palette, opener, ran } = await setup(COMMANDS);
		let event;
		palette.addEventListener("dj-command-run", (e) => (event = e));
		opener.focus();
		await sendKeys({ press: "Control+KeyK" });
		await settle(palette);
		await sendKeys({ type: "dark" });
		await settle(palette);
		assertEqual(rows(palette).join("|"), "View · Switch theme");
		await sendKeys({ press: "Enter" });
		await palette.updateComplete;
		await settleFrames();
		assertEqual(palette.open, false, "closed");
		assertEqual(ran.join(), "theme");
		assertEqual(event?.detail.id, "theme");
		assert(document.activeElement === opener, "focus is back on the opener");
	});

	it("moves the highlight with the arrow keys and announces it", async () => {
		const { palette, ran } = await setup(COMMANDS);
		await sendKeys({ press: "Control+KeyK" });
		await settle(palette);
		assertEqual(status(palette), "Save document, 1 of 4");
		await sendKeys({ press: "ArrowDown" });
		await sendKeys({ press: "ArrowDown" });
		await settle(palette);
		assertEqual(status(palette), "Switch theme, 3 of 4");
		await sendKeys({ press: "ArrowUp" });
		await settle(palette);
		assertEqual(status(palette), "Close document, 2 of 4");
		await sendKeys({ press: "Enter" });
		await settle(palette);
		assertEqual(ran.join(), "close");
	});

	it("closes on Escape and on the key again, restoring focus", async () => {
		const { palette, opener, ran } = await setup(COMMANDS);
		opener.focus();
		await sendKeys({ press: "Control+KeyK" });
		await settle(palette);
		await sendKeys({ press: "Escape" });
		await palette.updateComplete;
		await settleFrames();
		assertEqual(palette.open, false, "Escape closes");
		assert(document.activeElement === opener, "focus returns after Escape");
		await sendKeys({ press: "Control+KeyK" });
		await settle(palette);
		assertEqual(palette.open, true);
		await sendKeys({ press: "Control+KeyK" });
		await palette.updateComplete;
		assertEqual(palette.open, false, "the opening key closes it from inside the input");
		assertEqual(ran.length, 0);
	});

	it("says so when nothing matches, and Enter then does nothing", async () => {
		const { palette, ran } = await setup(COMMANDS);
		await sendKeys({ press: "Control+KeyK" });
		await settle(palette);
		await sendKeys({ type: "zzz" });
		await settle(palette);
		assertEqual(rows(palette).length, 0);
		assertEqual(status(palette), "No matching commands");
		await sendKeys({ press: "Enter" });
		await settle(palette);
		assertEqual(palette.open, true);
		assertEqual(ran.length, 0);
	});

	it("puts recently run commands first when the query is empty", async () => {
		const { palette } = await setup(COMMANDS);
		await sendKeys({ press: "Control+KeyK" });
		await settle(palette);
		await sendKeys({ type: "inbox" });
		await settle(palette);
		await sendKeys({ press: "Enter" });
		await palette.updateComplete;
		await settleFrames();
		await sendKeys({ press: "Control+KeyK" });
		await settle(palette);
		assertEqual(headings(palette)[0], "Recent");
		assertEqual(rows(palette)[0], "Go to inbox");
		assertEqual(rows(palette).filter((r) => r === "Go to inbox").length, 1, "not listed twice");
	});

	it("hides a command whose when() is false", async () => {
		let on = false;
		const { palette } = await setup([...COMMANDS, { id: "admin", label: "Admin tools", when: () => on }]);
		await sendKeys({ press: "Control+KeyK" });
		await settle(palette);
		assert(!rows(palette).includes("Admin tools"), "hidden while when() is false");
		await sendKeys({ press: "Escape" });
		await palette.updateComplete;
		on = true;
		await sendKeys({ press: "Control+KeyK" });
		await settle(palette);
		assert(rows(palette).includes("Admin tools"), "shown once it applies");
	});

	it("show() and hide() work without the key, and dj-close fires once on the way out", async () => {
		const { palette, opener } = await setup(COMMANDS);
		let closes = 0;
		palette.addEventListener("dj-close", () => closes++);
		opener.focus();
		palette.show();
		await settle(palette);
		assert(focusedInPalette(palette), "focus moves in");
		palette.hide();
		await palette.updateComplete;
		await settleFrames();
		assert(document.activeElement === opener, "focus goes back");
		assertEqual(closes, 1, "dj-close");
	});

	it("lists active shortcuts by group with ?, and the list follows the focus it opened from", async () => {
		const { registry, palette } = await setup(COMMANDS);
		const a = document.createElement("div");
		const b = document.createElement("div");
		const inA = Object.assign(document.createElement("button"), { textContent: "A" });
		const inB = Object.assign(document.createElement("button"), { textContent: "B" });
		a.append(inA);
		b.append(inB);
		document.body.append(a, b);
		registry.scope(a).register({ id: "a-del", label: "Delete rows", group: "Grid", shortcut: "Delete", run() {} });
		registry.scope(b).register({ id: "b-bold", label: "Bold", group: "Editor", shortcut: "Mod+B", run() {} });

		inA.focus();
		await sendKeys({ press: "Control+KeyK" });
		await settle(palette);
		await sendKeys({ press: "Shift+Slash" });
		await settle(palette);
		const helpA = rows(palette);
		assert(helpA.includes("Delete rows"), "A's key is listed from A");
		assert(!helpA.includes("Bold"), "B's key is not");
		assert(helpA.includes("Save document"), "global keys are listed");
		assert(!helpA.includes("Close document"), "commands without a shortcut are not");
		assertEqual(headings(palette).join("|"), "File|Go to|Commands|Grid");
		await sendKeys({ press: "Escape" });
		await palette.updateComplete;
		await settleFrames();

		inB.focus();
		palette.showHelp();
		await settle(palette);
		const helpB = rows(palette);
		assert(helpB.includes("Bold") && !helpB.includes("Delete rows"), `B's keys only, got ${helpB}`);
	});

	it("typing in the help view goes back to searching", async () => {
		const { palette } = await setup(COMMANDS);
		palette.showHelp();
		await settle(palette);
		assertEqual(palette.shadowRoot.querySelector(".title")?.textContent, "Keyboard shortcuts");
		await sendKeys({ type: "th" });
		await settle(palette);
		assertEqual(palette.shadowRoot.querySelector(".title"), null);
		assertEqual(rows(palette).join("|"), "View · Switch theme");
	});

	it("passes axe with the palette open, in search and in help", async () => {
		const { palette } = await setup(COMMANDS);
		palette.show();
		await settle(palette);
		await assertNoViolations(palette);
		palette.showHelp();
		await settle(palette);
		await assertNoViolations(palette);
	});
});
