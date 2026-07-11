// dj-file-input, in a real browser: the choose button is focusable, dropping a file adds
// it (and submits it in a form), removing clears it, and an axe pass. A real OS picker
// can't be scripted, so the drop path stands in for file selection — it runs the same
// #add pipeline the picker does.
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/file-input/dist/index.js";

function drop(dropzone, files) {
	const ev = new Event("drop", { bubbles: true });
	Object.defineProperty(ev, "dataTransfer", { value: { files } });
	dropzone.dispatchEvent(ev);
}

function paste(el, files) {
	const ev = new Event("paste", { bubbles: true, composed: true, cancelable: true });
	Object.defineProperty(ev, "clipboardData", { value: { files } });
	el.dispatchEvent(ev);
}

describe("dj-file-input", () => {
	afterEach(cleanup);

	it("focuses the drop zone and exposes a focusable choose button", async () => {
		const el = await mount(make("dj-file-input", { label: "Attachment" }));
		await el.updateComplete;
		const zone = el.shadowRoot.querySelector("[part=dropzone]");
		assertEqual(zone.getAttribute("tabindex"), "0", "the drop zone is tabbable");
		el.focus();
		assert(el.shadowRoot.activeElement === zone, "focus lands on the drop zone (the paste surface)");
		// the choose button is still reachable and opens the picker
		const button = el.shadowRoot.querySelector("[part=button]");
		button.focus();
		assert(el.shadowRoot.activeElement === button, "the choose button is focusable");
	});

	it("pastes a file onto the focused drop zone", async () => {
		const el = await mount(make("dj-file-input", { name: "doc", label: "Attachment", multiple: true }));
		await el.updateComplete;
		el.focus(); // the drop zone
		let events = 0;
		el.addEventListener("dj-change", () => events++);
		paste(el, [new File(["img"], "shot.png", { type: "image/png" })]);
		await el.updateComplete;
		assertEqual(el.files.length, 1, "the pasted file is added");
		assertEqual(el.files[0].name, "shot.png", "the pasted file is the one on the clipboard");
		assertEqual(events, 1, "paste emits one dj-change");
	});

	it("dropping a file selects it, emits dj-change, and submits it", async () => {
		const form = make("form");
		const el = make("dj-file-input", { name: "doc", label: "Attachment" });
		form.append(el);
		await mount(form);
		await el.updateComplete;

		let events = 0;
		el.addEventListener("dj-change", () => events++);
		const file = new File(["hi"], "note.txt", { type: "text/plain" });
		drop(el.shadowRoot.querySelector("[part=dropzone]"), [file]);
		await el.updateComplete;

		assertEqual(el.files.length, 1, "the dropped file is selected");
		assertEqual(el.files[0].name, "note.txt", "the selected file is the one dropped");
		assertEqual(events, 1, "selection emits one dj-change");
		const submitted = new FormData(form).get("doc");
		assert(submitted instanceof File && submitted.name === "note.txt", "the file is submitted under its name");
	});

	it("removing a file clears the selection", async () => {
		const el = await mount(make("dj-file-input", { name: "doc", label: "Attachment" }));
		await el.updateComplete;
		drop(el.shadowRoot.querySelector("[part=dropzone]"), [new File(["hi"], "a.txt")]);
		await el.updateComplete;
		el.shadowRoot.querySelector("[part=remove]").click();
		await el.updateComplete;
		assertEqual(el.files.length, 0, "removing empties the selection");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-file-input", { label: "Attachment", name: "doc" }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
