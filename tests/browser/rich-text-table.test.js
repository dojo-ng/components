// rich-text-table in a real browser: the caret can leave a table that ends the document (CB15), and
// header cells follow the theme in dark mode, including after a `value` round trip (CB14). The
// editor renders in LIGHT DOM.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { tablePlugin } from "../../packages/rich-text-table/dist/index.js";

// The real theme tokens, so dark mode has actual values to resolve (same fixture as chart-financial).
if (!document.querySelector('link[href="/packages/theme/theme.css"]')) {
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = "/packages/theme/theme.css";
	document.head.appendChild(link);
}
const themeLoaded = () =>
	new Promise((resolve) => {
		const link = document.querySelector('link[href="/packages/theme/theme.css"]');
		if (link.sheet) resolve();
		else link.addEventListener("load", () => resolve(), { once: true });
	});

const TABLE_LAST =
	"<p>Intro</p><table><tr><th><p>H1</p></th><th><p>H2</p></th></tr>" +
	"<tr><td><p>a</p></td><td><p>b</p></td></tr></table>";

/** Relative luminance of a computed `rgb()`/`rgba()` color (0 = black, 1 = white). */
function luminance(rgb) {
	const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => {
		const c = v / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe("dj-rich-text table plugin", () => {
	afterEach(() => {
		cleanup();
		document.documentElement.removeAttribute("data-dj-theme");
	});

	it("CB15: a value ending in a table gets a paragraph after it, and ArrowDown reaches it", async () => {
		const el = await mount(make("dj-rich-text", { label: "Body", plugins: [tablePlugin] }));
		await el.updateComplete;
		el.value = TABLE_LAST;
		await el.updateComplete;
		await settleFrames();

		const content = el.querySelector('[contenteditable="true"]');
		assert(content, "editor content element");
		const last = content.lastElementChild;
		assertEqual(last.tagName, "P", "the last block after a trailing table is a paragraph");

		// Put the caret in the last cell, then press ArrowDown: it should land after the table.
		const cell = [...content.querySelectorAll("td")].at(-1);
		const range = document.createRange();
		range.selectNodeContents(cell);
		range.collapse(false);
		el.focus();
		const sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
		await settleFrames();
		await sendKeys({ press: "ArrowDown" });
		await settleFrames();
		await sendKeys({ type: "after" });
		await el.updateComplete;
		await settleFrames();
		const lastText = content.lastElementChild.textContent;
		assertEqual(lastText, "after", "typed text lands in the paragraph after the table");
	});

	it("CB14: header cells are dark in dark mode, also after a value round trip", async () => {
		await themeLoaded();
		document.documentElement.setAttribute("data-dj-theme", "dark");
		const el = await mount(make("dj-rich-text", { label: "Body", plugins: [tablePlugin] }));
		await el.updateComplete;
		// A reopened draft: Lexical's export writes an inline light fill on header cells, and setting
		// that HTML back as the value used to import it as the cell's own color.
		el.value = TABLE_LAST.replaceAll("<th>", '<th style="background-color: #f2f3f5">');
		await el.updateComplete;
		await settleFrames();

		const th = el.querySelector('[contenteditable="true"] th');
		assert(th, "header cell rendered");
		const cs = getComputedStyle(th);
		assert(luminance(cs.backgroundColor) < 0.1, `header background is dark (got ${cs.backgroundColor})`);
		assert(luminance(cs.color) > 0.5, `header text is light (got ${cs.color})`);
		assertEqual(th.style.backgroundColor, "", "no inline light fill in the editor DOM");
	});
});
