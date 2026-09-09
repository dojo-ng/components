// Behavior tests for dj-nav. happy-dom does no layout and evaluates no container queries — that
// is the N7 browser check — so these cover the JS-observable behavior that does not depend on the
// computed `--dj-nav-collapsed` value: registration, ARIA on the expanded arrangement, i18n label
// overrides, the show/hide/toggle state machine and its event, and plain property reflection. Do
// not test collapse behavior here (see nav-collapse-spec.md task N6).
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/nav/dist/index.js";

/** Build a dj-nav with `count` slotted <a> links and the given props, then settle. */
async function build(props = {}, count = 2) {
	const el = document.createElement("dj-nav");
	for (const [k, v] of Object.entries(props)) el[k] = v;
	for (let i = 0; i < count; i++) {
		const a = document.createElement("a");
		a.href = `/link-${i + 1}`;
		a.textContent = `Link ${i + 1}`;
		el.appendChild(a);
	}
	document.body.appendChild(el);
	await settled(el);
	return el;
}

test("registers <dj-nav>", () => {
	assert.equal(typeof customElements.get("dj-nav"), "function");
});

test("expanded arrangement: slotted anchors land inside a <nav> with the default aria-label", async () => {
	const el = await build();
	// happy-dom evaluates no container query, so an unforced instance stays expanded — this is
	// the state the rest of this file relies on, not itself a claim about collapse behavior.
	assert.equal(el.collapsed, false);
	const nav = el.renderRoot.querySelector("nav");
	assert.ok(nav, "a <nav> renders");
	assert.equal(nav.getAttribute("aria-label"), "Navigation");
	const slot = nav.querySelector("slot");
	const assigned = slot.assignedElements({ flatten: true });
	assert.equal(assigned.length, 2);
	assert.equal(assigned[0].tagName, "A");
});

test("label overrides the i18n default on the <nav>", async () => {
	const el = await build({ label: "Site" });
	const nav = el.renderRoot.querySelector("nav");
	assert.equal(nav.getAttribute("aria-label"), "Site");
});

test("triggerLabel overrides the i18n default on the trigger", async () => {
	// Forces the collapsed arrangement directly by pinning the token, purely to reach the
	// trigger markup for this label check — not a claim about resize/threshold behavior.
	const el = document.createElement("dj-nav");
	el.style.setProperty("--dj-nav-collapsed", "1");
	el.triggerLabel = "Open menu";
	document.body.appendChild(el);
	await settled(el);
	const trigger = el.renderRoot.querySelector(".trigger");
	assert.ok(trigger, "the trigger renders once collapsed");
	assert.equal(trigger.getAttribute("aria-label"), "Open menu");
});

test("show()/hide()/toggle() flip open and each emits exactly one dj-nav-toggle with the right detail", async () => {
	const el = await build();
	const events = [];
	el.addEventListener("dj-nav-toggle", (e) => events.push(e.detail));

	await el.show();
	assert.equal(el.open, true);
	assert.deepEqual(events, [{ open: true }]);

	await el.show(); // already open: no-op, no re-emit
	assert.deepEqual(events, [{ open: true }]);

	el.hide();
	await settled(el);
	assert.equal(el.open, false);
	assert.deepEqual(events, [{ open: true }, { open: false }]);

	el.hide(); // already closed: no-op
	await settled(el);
	assert.deepEqual(events, [{ open: true }, { open: false }]);

	el.toggle();
	await settled(el);
	assert.equal(el.open, true);
	assert.deepEqual(events, [{ open: true }, { open: false }, { open: true }]);

	el.toggle();
	await settled(el);
	assert.equal(el.open, false);
	assert.deepEqual(events, [{ open: true }, { open: false }, { open: true }, { open: false }]);
});

test("panel reflects to the attribute", async () => {
	const el = await build();
	assert.equal(el.getAttribute("panel"), "drawer", "default");
	el.panel = "overlay";
	await settled(el);
	assert.equal(el.getAttribute("panel"), "overlay");
	el.panel = "dropdown";
	await settled(el);
	assert.equal(el.getAttribute("panel"), "dropdown");
});
