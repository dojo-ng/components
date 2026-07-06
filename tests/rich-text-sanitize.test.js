// Unit tests for the rich-text paste sanitizer. Pure (no component mount), but needs a DOMParser —
// setup.js installs happy-dom's on globalThis. These lock the security-relevant behavior: dangerous
// elements removed, disallowed elements unwrapped (text kept), unsafe attributes/URLs stripped,
// formatting and safe links preserved. The paste command wiring itself is the M-browser check.
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeHtml } from "../packages/rich-text/dist/index.js";

test("removes <script> entirely, content and all", () => {
	const out = sanitizeHtml('<p>ok</p><script>alert(1)</script>');
	assert.equal(out.includes("<script"), false);
	assert.equal(out.includes("alert(1)"), false);
	assert.equal(out.includes("<p>ok</p>"), true);
});

test("removes <style>, <iframe>, <object>, <embed>", () => {
	// No iframe src: happy-dom would otherwise schedule an async load that outlives the test.
	const out = sanitizeHtml('<style>*{color:red}</style><iframe></iframe><object></object><embed><p>hi</p>');
	assert.equal(/<(style|iframe|object|embed)/i.test(out), false);
	assert.equal(out.includes("<p>hi</p>"), true);
});

test("strips event-handler and style/class attributes", () => {
	const out = sanitizeHtml('<p onclick="steal()" style="color:red" class="x">text</p>');
	assert.equal(out.includes("onclick"), false);
	assert.equal(out.includes("style"), false);
	assert.equal(out.includes("class"), false);
	assert.equal(out.includes("text"), true);
});

test("drops javascript: and data: hrefs but keeps the link element and text", () => {
	const js = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
	assert.equal(js.includes("javascript:"), false);
	assert.equal(js.includes("href"), false);
	assert.equal(js.includes(">click</a>"), true);
	const data = sanitizeHtml('<a href="data:text/html,evil">x</a>');
	assert.equal(data.includes("href"), false);
});

test("keeps safe http/mailto/relative hrefs", () => {
	assert.match(sanitizeHtml('<a href="https://dojo.io">d</a>'), /href="https:\/\/dojo\.io"/);
	assert.match(sanitizeHtml('<a href="mailto:a@b.com">m</a>'), /href="mailto:a@b\.com"/);
	assert.match(sanitizeHtml('<a href="/path#x">r</a>'), /href="\/path#x"/);
});

test("keeps allowed formatting and structure", () => {
	const out = sanitizeHtml("<h2>Title</h2><p><strong>b</strong> and <em>i</em></p><ul><li>one</li></ul>");
	assert.equal(out, "<h2>Title</h2><p><strong>b</strong> and <em>i</em></p><ul><li>one</li></ul>");
});

test("unwraps disallowed elements but keeps their (cleaned) contents", () => {
	const out = sanitizeHtml('<div class="wrap"><section><strong>cell</strong></section></div>');
	assert.equal(/<(div|section)/i.test(out), false);
	assert.equal(out.includes("<strong>cell</strong>"), true);
});

test("keeps a pasted table with its structural tags and colspan/rowspan", () => {
	const out = sanitizeHtml(
		'<table><thead><tr><th colspan="2">H</th></tr></thead>' +
		'<tbody><tr><td rowspan="2">a</td><td>b</td></tr></tbody></table>'
	);
	for (const tag of ["table", "thead", "tbody", "tr", "th", "td"]) {
		assert.equal(new RegExp(`<${tag}[ >]`, "i").test(out), true, `${tag} kept`);
	}
	assert.match(out, /colspan="2"/);
	assert.match(out, /rowspan="2"/);
});

test("strips style/class/onclick from a table cell but keeps the cell", () => {
	const out = sanitizeHtml('<table><tr><td onclick="x()" style="color:red" class="c">cell</td></tr></table>');
	assert.equal(out.includes("onclick"), false);
	assert.equal(out.includes("style"), false);
	assert.equal(out.includes("class"), false);
	assert.equal(/<td[ >]/i.test(out), true);
	assert.equal(out.includes("cell"), true);
});

test("drops <col>/<colgroup> without leaving text", () => {
	const out = sanitizeHtml('<table><colgroup><col><col></colgroup><tr><td>x</td></tr></table>');
	assert.equal(/<(col|colgroup)[ >]/i.test(out), false);
	assert.equal(/<td[ >]/i.test(out), true);
	assert.equal(out.includes("x"), true);
});

test("a table inside a removed <iframe> is gone entirely", () => {
	const out = sanitizeHtml('<iframe><table><tr><td>secret</td></tr></table></iframe><p>ok</p>');
	assert.equal(/<(iframe|table|tr|td)[ >]/i.test(out), false);
	assert.equal(out.includes("secret"), false);
	assert.equal(out.includes("<p>ok</p>"), true);
});

test("empty / nullish input is safe", () => {
	assert.equal(sanitizeHtml(""), "");
	assert.equal(sanitizeHtml(undefined), "");
});
