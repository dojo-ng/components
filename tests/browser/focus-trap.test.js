// CB29, in a real browser: the dialog focus trap skips stops the user cannot reach (hidden,
// inert, display: none, visibility: hidden, input[type=hidden], negative tabindex) and counts
// the ones the old selector missed (contenteditable, summary), so Tab wraps instead of letting
// focus escape the dialog.
import { sendKeys } from "@web/test-runner-commands";
import { collectFocusables, deepActiveElement } from "../../packages/dojo-element/dist/index.js";
import { cleanup, make, assert, assertEqual } from "./helpers.js";
import "../../packages/dialog/dist/index.js";

function html(markup) {
	const t = document.createElement("template");
	t.innerHTML = markup.trim();
	return t.content;
}

async function openDialog(content) {
	const opener = make("button", {}, "Open");
	const dialog = make("dj-dialog");
	dialog.append(html(content));
	document.body.append(opener, dialog);
	opener.focus();
	dialog.open = true;
	await dialog.updateComplete;
	return dialog;
}

describe("focus trap stops (CB29)", () => {
	afterEach(cleanup);

	it("leaves out hidden, inert, and untabbable elements", async () => {
		const dialog = await openDialog(`
			<button id="first">First</button>
			<button hidden id="h1">Hidden attr</button>
			<div style="display:none"><button id="h2">In display none</button></div>
			<button style="visibility:hidden" id="h3">Visibility hidden</button>
			<div inert><button id="h4">Inert</button></div>
			<input type="hidden" name="token" value="x" id="h5">
			<button tabindex="-1" id="h6">Negative tabindex</button>
			<button id="last">Last</button>
			<input type="hidden" name="trailing" value="y" id="h7">
			<button hidden id="h8">Trailing hidden</button>`);
		const ids = collectFocusables(dialog.shadowRoot, dialog).map((el) => el.id).filter(Boolean);
		assertEqual(ids.includes("first") && ids.includes("last"), true, "visible buttons are stops");
		for (const id of ["h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8"]) {
			assertEqual(ids.includes(id), false, `#${id} is not a stop`);
		}
	});

	it("counts contenteditable and a details summary as stops", async () => {
		const dialog = await openDialog(`
			<button id="first">First</button>
			<details><summary id="sum">More</summary><button id="inside">Inside closed details</button></details>
			<div contenteditable id="edit">Edit me</div>
			<div contenteditable="false" id="noedit">Not editable</div>`);
		const ids = collectFocusables(dialog.shadowRoot, dialog).map((el) => el.id).filter(Boolean);
		assertEqual(ids.includes("sum"), true, "summary is a stop");
		assertEqual(ids.includes("edit"), true, "contenteditable is a stop");
		assertEqual(ids.includes("noedit"), false, "contenteditable=false is not a stop");
		assertEqual(ids.includes("inside"), false, "content of a closed details is not a stop");
	});

	it("Tab from the last visible stop wraps instead of escaping past trailing hidden content", async () => {
		const dialog = await openDialog(`
			<button id="first">First</button>
			<button id="last">Last</button>
			<input type="hidden" name="trailing" value="y">
			<button hidden>Trailing hidden</button>
			<div inert><button>Inert</button></div>`);
		const focusables = collectFocusables(dialog.shadowRoot, dialog);
		const last = dialog.querySelector("#last");
		assert(focusables[focusables.length - 1] === last, "the last stop is the last visible button");
		last.focus();
		await sendKeys({ press: "Tab" });
		assert(deepActiveElement() === focusables[0], "Tab wraps to the first stop");
		assert(dialog.contains(deepActiveElement()) || dialog.shadowRoot.contains(deepActiveElement()), "focus stays in the dialog");
	});
});
