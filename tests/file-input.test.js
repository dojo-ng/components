// Tests for dj-file-input: the pure matchesAccept helper + component behavior happy-dom can drive
// (registration, add via the native input's change, remove, max-size, required, single vs multiple,
// form value). Real drag-and-drop needs a browser (no DataTransfer in happy-dom) — that is P7.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { mount, settled } from "./setup.js";
import { matchesAccept } from "../packages/file-input/dist/accept.js";
import "../packages/file-input/dist/index.js";

const file = (name, { type = "", size = 10 } = {}) => {
	const f = new File(["x".repeat(size)], name, { type });
	// happy-dom derives size from content; guarantee the requested size for max-size tests.
	if (f.size !== size) Object.defineProperty(f, "size", { value: size, configurable: true });
	return f;
};

/** Simulate an OS-picker selection: set the native input's files and fire change. */
function pick(el, files) {
	const input = el.shadowRoot.querySelector(".native");
	Object.defineProperty(input, "files", { value: files, configurable: true });
	input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
}

/** Simulate a paste of files onto the (focused) control. happy-dom has no ClipboardEvent. */
function paste(el, files) {
	const ev = new Event("paste", { bubbles: true, composed: true, cancelable: true });
	Object.defineProperty(ev, "clipboardData", { value: { files }, configurable: true });
	el.dispatchEvent(ev);
	return ev;
}

test("matchesAccept: extensions, MIME, wildcards, empty", () => {
	assert.equal(matchesAccept({ name: "a.PNG", type: "" }, ".png"), true);
	assert.equal(matchesAccept({ name: "a.jpg", type: "" }, ".png"), false);
	assert.equal(matchesAccept({ name: "a", type: "application/pdf" }, "application/pdf"), true);
	assert.equal(matchesAccept({ name: "a", type: "image/png" }, "application/pdf"), false);
	assert.equal(matchesAccept({ name: "a", type: "image/png" }, "image/*"), true);
	assert.equal(matchesAccept({ name: "a", type: "text/plain" }, "image/*"), false);
	assert.equal(matchesAccept({ name: "a", type: "text/plain" }, ""), true);
	assert.equal(matchesAccept({ name: "a", type: "text/plain" }, undefined), true);
	assert.equal(matchesAccept({ name: "doc.pdf", type: "" }, "image/*,.pdf"), true);
});

test("registers <dj-file-input>", () => {
	assert.equal(typeof customElements.get("dj-file-input"), "function");
});

test("picking files populates files, renders rows, and emits dj-change", async () => {
	const el = await mount("dj-file-input", { multiple: true, name: "docs" });
	let events = 0;
	let detail;
	el.addEventListener("dj-change", (e) => { events++; detail = e.detail.files; });
	pick(el, [file("a.txt"), file("b.txt")]);
	await settled(el);
	assert.equal(el.files.length, 2);
	assert.equal(el.shadowRoot.querySelectorAll(".item").length, 2);
	assert.equal(events, 1);
	assert.equal(detail.length, 2);
});

test("remove button removes one file and emits dj-change", async () => {
	const el = await mount("dj-file-input", { multiple: true, name: "docs" });
	pick(el, [file("a.txt"), file("b.txt")]);
	await settled(el);
	let events = 0;
	el.addEventListener("dj-change", () => events++);
	el.shadowRoot.querySelector(".item [part=remove]").click();
	await settled(el);
	assert.equal(el.files.length, 1);
	assert.equal(el.files[0].name, "b.txt");
	assert.equal(events, 1);
});

test("max-size rejects an oversize file and sets a localized customError", async () => {
	const el = await mount("dj-file-input", { name: "f", maxSize: 1000 });
	pick(el, [file("big.bin", { size: 5000 })]);
	await settled(el);
	assert.equal(el.files.length, 0);
	assert.equal(el.validity.customError, true);
	assert.match(el.validationMessage, /exceeds the maximum size/);
	// the message names the file
	assert.match(el.validationMessage, /big\.bin/);
});

test("required with no files reports valueMissing", async () => {
	const el = await mount("dj-file-input", { name: "f", required: true });
	await settled(el);
	assert.equal(el.validity.valueMissing, true);
});

test("single-file mode replaces rather than appends", async () => {
	const el = await mount("dj-file-input", { name: "f" }); // not multiple
	pick(el, [file("a.txt")]);
	await settled(el);
	pick(el, [file("b.txt")]);
	await settled(el);
	assert.equal(el.files.length, 1);
	assert.equal(el.files[0].name, "b.txt");
});

test("form value: single = File, multiple = FormData with one entry per file", async () => {
	const single = await mount("dj-file-input", { name: "avatar" });
	pick(single, [file("me.png", { type: "image/png" })]);
	await settled(single);
	assert.ok(single.__formValue instanceof File);
	assert.equal(single.__formValue.name, "me.png");

	const many = await mount("dj-file-input", { name: "docs", multiple: true });
	pick(many, [file("a.txt"), file("b.txt"), file("c.txt")]);
	await settled(many);
	assert.ok(many.__formValue instanceof FormData);
	assert.equal(many.__formValue.getAll("docs").length, 3);
});

test("no name: no form value is set", async () => {
	const el = await mount("dj-file-input", {});
	pick(el, [file("a.txt")]);
	await settled(el);
	assert.equal(el.__formValue ?? null, null);
});

// --- FI1: programmatic addFiles + paste ---

test("addFiles filters by accept and max-size, emitting one dj-change with survivors", async () => {
	const el = await mount("dj-file-input", { name: "f", multiple: true, accept: "image/*", maxSize: 1000 });
	let events = 0;
	let detail;
	el.addEventListener("dj-change", (e) => { events++; detail = e.detail.files; });
	el.addFiles([
		file("keep.png", { type: "image/png", size: 500 }),   // accepted
		file("nope.txt", { type: "text/plain", size: 500 }),  // wrong type
		file("big.png", { type: "image/png", size: 5000 }),   // oversize
	]);
	await settled(el);
	assert.deepEqual(el.files.map((f) => f.name), ["keep.png"]);
	assert.equal(events, 1);
	assert.equal(detail.length, 1);
	assert.equal(detail[0].name, "keep.png");
});

test("addFiles accepts a FileList-like and appends when multiple", async () => {
	const el = await mount("dj-file-input", { name: "f", multiple: true });
	el.addFiles([file("a.txt")]);
	await settled(el);
	// a FileList-like: array-like with length, consumed via Array.from
	el.addFiles([file("b.txt"), file("c.txt")]);
	await settled(el);
	assert.deepEqual(el.files.map((f) => f.name), ["a.txt", "b.txt", "c.txt"]);
});

test("addFiles replaces rather than appends when not multiple", async () => {
	const el = await mount("dj-file-input", { name: "f" }); // single
	el.addFiles([file("a.txt")]);
	await settled(el);
	el.addFiles([file("b.txt")]);
	await settled(el);
	assert.deepEqual(el.files.map((f) => f.name), ["b.txt"]);
});

test("the dropzone is a focus target (tabbable) for paste/drop", async () => {
	const el = await mount("dj-file-input", { name: "f" });
	await settled(el);
	const zone = el.shadowRoot.querySelector("[part=dropzone]");
	assert.equal(zone.getAttribute("tabindex"), "0");
	el.focus();
	assert.equal(el.shadowRoot.activeElement, zone);
});

test("paste with a file adds it when the control has focus", async () => {
	const el = await mount("dj-file-input", { name: "f", multiple: true });
	await settled(el);
	el.focus(); // focuses the dropzone → shadowRoot.activeElement set
	let events = 0;
	el.addEventListener("dj-change", () => events++);
	const ev = paste(el, [file("shot.png", { type: "image/png" })]);
	await settled(el);
	assert.deepEqual(el.files.map((f) => f.name), ["shot.png"]);
	assert.equal(events, 1);
	assert.equal(ev.defaultPrevented, true);
});

test("paste is ignored when the control does not have focus", async () => {
	const el = await mount("dj-file-input", { name: "f", multiple: true });
	await settled(el);
	el.blur?.();
	const ev = paste(el, [file("shot.png", { type: "image/png" })]);
	await settled(el);
	assert.equal(el.files.length, 0);
	assert.equal(ev.defaultPrevented, false);
});
