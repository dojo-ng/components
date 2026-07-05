// dj-icon SVG registry smoke (review task 4.4): registerIcon makes a named icon
// resolvable by `type`, a late registration re-renders an already-mounted icon,
// and an inline slotted <svg> still works with no registry entry.
import { mount, settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { registerIcon, getIcon, hasIcon } from "../packages/icon/dist/index.js";
import iconStyles from "../packages/icon/dist/dj-icon.styles.js";

const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z"/></svg>';

test("registry stores and reports icons", () => {
	assert.equal(hasIcon("star"), false);
	registerIcon("star", STAR);
	assert.equal(hasIcon("star"), true);
	assert.equal(getIcon("star"), STAR);
});

test("dj-icon renders a registered icon's SVG for its type", async () => {
	registerIcon("check", '<svg data-name="check"><path d="M5 13l4 4"/></svg>');
	const el = await mount("dj-icon", { type: "check" });
	assert.ok(el.renderRoot.querySelector('svg[data-name="check"]'), "registered SVG rendered into the shadow root");
});

test("an icon registered AFTER mount re-renders the element", async () => {
	const el = await mount("dj-icon", { type: "late" });
	assert.equal(el.renderRoot.querySelector("svg"), null, "nothing yet for an unregistered type");
	registerIcon("late", '<svg data-name="late"></svg>');
	await settled(el);
	assert.ok(el.renderRoot.querySelector('svg[data-name="late"]'), "late registration picked up");
});

test("a slotted inline SVG still works without a registry entry", async () => {
	const el = await mount("dj-icon");
	el.innerHTML = '<svg data-name="slotted"></svg>';
	await settled(el);
	// No type set → the default slot is rendered (projects the light-DOM svg).
	assert.ok(el.renderRoot.querySelector("slot"), "default slot present when no type is set");
	assert.equal(el.querySelector('svg[data-name="slotted"]').getAttribute("data-name"), "slotted");
});

test("both icon sources are sized: registry (.icon svg) and slotted (::slotted(svg))", async () => {
	// happy-dom does no layout, so assert the stylesheet sizes both paths. A registry icon
	// (type=) renders into the shadow tree, so it needs `.icon svg`; a slotted svg needs
	// `::slotted(svg)`. Before the fix only the slotted rule existed and type= icons collapsed.
	const css = iconStyles.cssText.replace(/\s+/g, " ");
	assert.match(css, /\.icon svg\s*\{[^}]*width: 100%[^}]*height: 100%/, "registry svg sized");
	assert.match(css, /::slotted\(svg\)\s*\{[^}]*width: 100%[^}]*height: 100%/, "slotted svg sized");
	// And a type= icon really does render an <svg> inside the shadow root (not a slot).
	registerIcon("sized", '<svg data-name="sized"><path d="M0 0h24v24H0z"/></svg>');
	const el = await mount("dj-icon", { type: "sized" });
	assert.ok(el.renderRoot.querySelector('svg[data-name="sized"]'), "registry svg is in the shadow tree, where .icon svg applies");
});
