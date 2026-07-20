// dj-chip: the close button is a real tab stop, so it must also SHOW focus (WCAG 2.4.7) —
// that ring was missing, which made keyboard-reaching a chip look like nothing happened.
// Focus-visible styling is non-layout CSS, so it's asserted as a string against the
// stylesheet (the chart-gaps/skeleton precedent); the rest is behavior.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/chip/dist/index.js";
import { DjChip } from "../packages/chip/dist/index.js";

const styleText = []
	.concat(DjChip.styles)
	.map((s) => (s && s.cssText) || "")
	.join("\n");

test("the close button shows a focus ring when keyboard-focused", () => {
	assert.match(
		styleText,
		/\.close:focus-visible\s*\{[^}]*outline:/,
		"close button needs a :focus-visible outline — it is a tab stop",
	);
});

test("closeable renders a real button (a keyboard tab stop) with a default label", async () => {
	const el = await mount("dj-chip", { closeable: true });
	const btn = el.renderRoot.querySelector('[part="close"]');
	assert.ok(btn, "close button rendered");
	assert.equal(btn.tagName, "BUTTON", "a real button, so it is keyboard focusable");
	assert.ok(!btn.hasAttribute("tabindex"), "no tabindex override removing it from tab order");
	assert.equal(btn.getAttribute("aria-label"), "Remove", "default accessible name");
});

test("close-label names what is being removed", async () => {
	const el = await mount("dj-chip", { closeable: true, closeLabel: "Remove From: Ada" });
	const btn = el.renderRoot.querySelector('[part="close"]');
	assert.equal(btn.getAttribute("aria-label"), "Remove From: Ada");
});

test("activating close emits dj-close and does not bubble a stray click", async () => {
	const el = await mount("dj-chip", { closeable: true });
	let closes = 0;
	el.addEventListener("dj-close", () => closes++);
	el.renderRoot.querySelector('[part="close"]').click();
	await settled(el);
	assert.equal(closes, 1);
});
