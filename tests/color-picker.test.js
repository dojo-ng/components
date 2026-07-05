// Tests for dj-color-picker: pure color math (color.ts) + component behavior that happy-dom can
// exercise (registration, value reflection, format, swatches, hue slider, keyboard). Pointer-drag
// geometry needs real layout and is a browser check (P7).
import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { mount, settled } from "./setup.js";
import {
	parseColor,
	toHex,
	toRgb,
	toHsl,
	hsvToRgb,
	rgbToHsv,
} from "../packages/color-picker/dist/color.js";
import "../packages/color-picker/dist/index.js";

test("color.ts: hex <-> rgb <-> hsl round-trip through HSV is exact", () => {
	for (const s of ["#3366cc", "#7f3fbf", "#123456", "#00ff80", "#abcdef", "#ffffff", "#000000"]) {
		const rgb = parseColor(s);
		const back = hsvToRgb(rgbToHsv(rgb));
		assert.deepEqual([back.r, back.g, back.b], [rgb.r, rgb.g, rgb.b], `${s} drifted`);
	}
});

test("color.ts: parses rgb()/rgba() and hsl(), comma or space separated", () => {
	assert.deepEqual(parseColor("rgb(51, 102, 204)"), { r: 51, g: 102, b: 204, a: 1 });
	assert.deepEqual(parseColor("rgba(51 102 204 / 0.5)"), { r: 51, g: 102, b: 204, a: 0.5 });
	assert.equal(toHex(parseColor("hsl(220, 60%, 50%)")), "#3366cc");
});

test("color.ts: formatters include alpha only when translucent or alphaOn", () => {
	const opaque = { r: 51, g: 102, b: 204, a: 1 };
	const translucent = { r: 51, g: 102, b: 204, a: 0.5 };
	assert.equal(toHex(opaque), "#3366cc");
	assert.equal(toHex(opaque, true), "#3366ccff");
	assert.equal(toRgb(translucent), "rgba(51, 102, 204, 0.5)");
	assert.equal(toHsl(opaque), "hsl(220, 60%, 50%)");
});

test("color.ts: invalid input returns undefined", () => {
	for (const s of ["", "rebeccapurple", "nonsense", "#12", "rgb(1,2)", "#gggggg"]) {
		assert.equal(parseColor(s), undefined, `${s} should be unparseable`);
	}
});

test("registers <dj-color-picker>", () => {
	assert.equal(typeof customElements.get("dj-color-picker"), "function");
});

test("value reflects into the text input and the form value", async () => {
	const el = await mount("dj-color-picker", { name: "c", value: "#3366cc" });
	const input = el.shadowRoot.querySelector(".value-input");
	await settled(input);
	assert.equal(input.value, "#3366cc");
	assert.equal(el.__formValue, "#3366cc");
});

test('format="rgb" reformats the value getter', async () => {
	const el = await mount("dj-color-picker", { value: "#3366cc", format: "rgb" });
	assert.equal(el.value, "rgb(51, 102, 204)");
});

test("swatch click sets the value and emits exactly one dj-change", async () => {
	const el = await mount("dj-color-picker", { swatches: ["#ff0000"] });
	let count = 0;
	let detail;
	el.addEventListener("dj-change", (e) => { count++; detail = e.detail.value; });
	const swatch = el.shadowRoot.querySelector(".swatch");
	swatch.click();
	assert.equal(count, 1);
	assert.equal(el.value, "#ff0000");
	assert.equal(detail, "#ff0000");
});

test("hue slider change updates the value", async () => {
	const el = await mount("dj-color-picker", { value: "#ff0000" }); // h=0, s=100, v=100
	const hue = el.shadowRoot.querySelector(".hue");
	hue.value = 120;
	hue.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
	await settled(el);
	assert.equal(el.value, "#00ff00");
});

test("keyboard arrows on the thumb change the value", async () => {
	const el = await mount("dj-color-picker", { value: "#3366cc" });
	const before = el.value;
	const thumb = el.shadowRoot.querySelector(".thumb");
	thumb.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", shiftKey: true, bubbles: true, composed: true }));
	await settled(el);
	assert.notEqual(el.value, before);
});

test("alpha off omits the alpha slider; alpha on renders it", async () => {
	const off = await mount("dj-color-picker", {});
	assert.equal(off.shadowRoot.querySelector(".alpha"), null);
	const on = await mount("dj-color-picker", { alpha: true });
	assert.ok(on.shadowRoot.querySelector(".alpha"));
});
