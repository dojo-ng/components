// dj-badge (spec task BD): a small presentational status/count label. Variant reflects,
// pill reflects, default slot renders, and it exposes a `base` part. No ARIA role.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/badge/dist/index.js";

test("variant defaults to neutral and reflects", async () => {
	const el = await mount("dj-badge");
	assert.equal(el.variant, "neutral");
	assert.equal(el.getAttribute("variant"), "neutral", "default variant reflected");
	el.variant = "danger";
	await settled(el);
	assert.equal(el.getAttribute("variant"), "danger");
});

test("pill is a reflected boolean", async () => {
	const el = await mount("dj-badge", { pill: true });
	assert.ok(el.hasAttribute("pill"));
	el.pill = false;
	await settled(el);
	assert.ok(!el.hasAttribute("pill"));
});

test("renders default slot content inside the base part", async () => {
	const el = await mount("dj-badge");
	el.textContent = "4";
	await settled(el);
	const base = el.renderRoot.querySelector('[part="base"]');
	assert.ok(base, "exposes a base part");
	assert.ok(base.querySelector("slot"), "content comes through the default slot");
});

test("is presentational — no role attribute", async () => {
	const el = await mount("dj-badge");
	assert.ok(!el.hasAttribute("role"), "badge carries no ARIA role");
});
