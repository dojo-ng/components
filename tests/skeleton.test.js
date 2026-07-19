// dj-skeleton (spec task SK): a loading placeholder. effect reflects, aria-hidden is
// always set, the sheen animation CSS is gated on effect=sheen, and the shared
// reduced-motion rule is present. happy-dom does no layout, so the animation/motion
// assertions are string checks against the stylesheet (the chart-gaps precedent).
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/skeleton/dist/index.js";
import { DjSkeleton } from "../packages/skeleton/dist/index.js";

const styleText = []
	.concat(DjSkeleton.styles)
	.map((s) => (s && s.cssText) || "")
	.join("\n");

test("effect defaults to sheen and reflects", async () => {
	const el = await mount("dj-skeleton");
	assert.equal(el.effect, "sheen");
	assert.equal(el.getAttribute("effect"), "sheen", "default effect reflected");
	el.effect = "none";
	await settled(el);
	assert.equal(el.getAttribute("effect"), "none");
});

test("is always aria-hidden", async () => {
	const el = await mount("dj-skeleton");
	assert.equal(el.getAttribute("aria-hidden"), "true");
});

test("exposes a base part", async () => {
	const el = await mount("dj-skeleton");
	assert.ok(el.renderRoot.querySelector('[part="base"]'), "base part present");
});

test("sheen animation CSS is gated on effect=sheen", () => {
	assert.match(styleText, /@keyframes dj-skeleton-sheen/, "keyframes defined");
	assert.match(
		styleText,
		/:host\(\[effect="sheen"\]\)[^}]*animation:\s*dj-skeleton-sheen/,
		"animation only applies under effect=sheen",
	);
});

test("honors reduced motion (shared snippet present)", () => {
	assert.match(styleText, /prefers-reduced-motion:\s*reduce/, "reduced-motion media query present");
});
