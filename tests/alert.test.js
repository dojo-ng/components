// dj-alert (spec task AL): an inline status banner. Variant reflects and switches the
// live-region role (status vs alert); open defaults true and close() hides + emits dj-close
// once; a closable alert renders a localized close button; a slotted icon replaces the glyph.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/alert/dist/index.js";

const base = (el) => el.renderRoot.querySelector('[part="base"]');

test("variant reflects and switches the live-region role", async () => {
	const el = await mount("dj-alert");
	assert.equal(el.getAttribute("variant"), "info", "default variant reflected");
	assert.equal(base(el).getAttribute("role"), "status", "info announces politely");

	el.variant = "danger";
	await settled(el);
	assert.equal(el.getAttribute("variant"), "danger");
	assert.equal(base(el).getAttribute("role"), "alert", "danger announces assertively");

	el.variant = "success";
	await settled(el);
	assert.equal(base(el).getAttribute("role"), "status");
	el.variant = "warning";
	await settled(el);
	assert.equal(base(el).getAttribute("role"), "alert");
});

test("open defaults true; close() hides and emits dj-close once", async () => {
	const el = await mount("dj-alert");
	assert.equal(el.open, true);
	assert.ok(el.hasAttribute("open"), "open reflected");

	let closes = 0;
	el.addEventListener("dj-close", () => closes++);
	el.close();
	await settled(el);
	assert.equal(el.open, false);
	assert.ok(!el.hasAttribute("open"), "closed removes the open attribute (display:none)");
	assert.equal(closes, 1);

	el.close(); // already closed
	assert.equal(closes, 1, "close() is a no-op when already closed");
});

test("closable renders a close button with the localized label", async () => {
	const el = await mount("dj-alert", { closable: true });
	const btn = el.renderRoot.querySelector('[part="close"]');
	assert.ok(btn, "close button rendered");
	assert.equal(btn.getAttribute("aria-label"), "Close");
	btn.click();
	await settled(el);
	assert.equal(el.open, false, "clicking the button closes the alert");
});

test("a slotted icon replaces the default glyph", async () => {
	const el = await mount("dj-alert");
	const custom = document.createElement("span");
	custom.slot = "icon";
	custom.textContent = "★";
	el.appendChild(custom);
	await settled(el);
	const iconSlot = el.renderRoot.querySelector('[part="icon"] slot[name="icon"]');
	assert.ok(iconSlot, "icon slot present");
	const assigned = iconSlot.assignedElements ? iconSlot.assignedElements() : [];
	assert.equal(assigned.length, 1, "the slotted icon is assigned, overriding the fallback glyph");
	assert.equal(assigned[0], custom);
});
