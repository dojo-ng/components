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

describe("dj-file-input", () => {
	afterEach(cleanup);

	it("exposes a focusable choose button", async () => {
		const el = await mount(make("dj-file-input", { label: "Attachment" }));
		await el.updateComplete;
		el.focus();
		assert(el.shadowRoot.activeElement === el.shadowRoot.querySelector("[part=button]"), "focus lands on the choose button");
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
