// dj-back-button and HistoryController, in a real browser with the real History API. Keyboard
// activation with Enter and Space, the accessible name, up mode through dj-navigate, and an axe pass.
// Real focus, real key events, and a popstate that fires a task after history.back(), none of which
// happy-dom (tests/nav-history.test.js) does.
import { sendKeys } from "@web/test-runner-commands";
import { createPubSub } from "@dojo-ng/pubsub";
import { installHistory } from "@dojo-ng/history";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import { confirmLeave } from "../../packages/nav-history/dist/index.js";

/** Resolves with the next location, after the replay, that satisfies `test`. */
function nextLocation(h, test = () => true) {
	return new Promise((resolve) => {
		let replayed = false;
		let stop;
		stop = h.subscribe((location) => {
			if (!replayed || !test(location)) return;
			stop?.();
			resolve(location);
		});
		replayed = true;
	});
}

const inner = (el) => el.shadowRoot.querySelector("dj-button");
const nativeButton = (el) => inner(el).shadowRoot.querySelector("button");

describe("dj-back-button", () => {
	let h;
	beforeEach(() => {
		h = installHistory(createPubSub(), { dwellMs: 0 });
	});
	afterEach(() => {
		h.destroy();
		cleanup();
	});

	it("history mode: Enter and Space on the focused button go Back; it disables at the first entry", async () => {
		h.go("/nh-test/a");
		h.go("/nh-test/b");
		const el = await mount(make("dj-back-button"));
		await el.updateComplete;
		assert(!nativeButton(el).disabled, "enabled with entries behind it");

		el.focus();
		assert(el.shadowRoot.activeElement === inner(el), "focus() reaches the inner dj-button");
		let arrived = nextLocation(h);
		await sendKeys({ press: "Enter" });
		assertEqual((await arrived).path, "/nh-test/a", "Enter goes Back");

		arrived = nextLocation(h);
		el.focus();
		await sendKeys({ press: "Space" });
		const landing = await arrived;
		assertEqual(landing.index, 0, "Space goes Back to the landing entry");
		await el.updateComplete;
		assert(nativeButton(el).disabled, "disabled at the first entry");
	});

	it("the accessible name equals the visible label, and is not empty", async () => {
		h.go("/nh-test/a");
		const el = await mount(make("dj-back-button"));
		await el.updateComplete;
		assertEqual(inner(el).textContent.trim(), "Back", "visible label (the dj-button's slotted text, which names the native button)");
		assertEqual(nativeButton(el).getAttribute("aria-label"), null, "named by its text, not by a second string");

		el.iconOnly = true;
		await el.updateComplete;
		assertEqual(nativeButton(el).getAttribute("aria-label"), "Back", "icon-only: aria-label is the label");
		assertEqual(el.shadowRoot.querySelector('dj-tooltip [slot="content"]').textContent.trim(), "Back", "the tooltip shows the same label");
	});

	it("up mode: Enter dispatches dj-navigate to the parent, and the label reads the trail", async () => {
		h.go("/nh-test/orders/7", undefined, { trail: [{ path: "/nh-test/orders", label: "Orders" }, { path: "/nh-test/orders/7", label: "Order 7" }] });
		const el = await mount(make("dj-back-button", { mode: "up" }));
		await el.updateComplete;
		assertEqual(inner(el).textContent.trim(), "Back to Orders", "label");

		el.focus();
		const arrived = nextLocation(h, (l) => l.path === "/nh-test/orders");
		await sendKeys({ press: "Enter" });
		const location = await arrived;
		assertEqual(location.source, "go", "up is a navigation, not a Back");
		assertEqual(JSON.stringify(location.trail), JSON.stringify([{ path: "/nh-test/orders", label: "Orders" }]), "the parent's trail");
	});

	it("has no serious or critical accessibility violations, with the label shown and icon-only", async () => {
		h.go("/nh-test/a");
		const el = await mount(make("dj-back-button"));
		await el.updateComplete;
		await assertNoViolations(el);
		el.iconOnly = true;
		await el.updateComplete;
		await assertNoViolations(el);
	});
});

describe("dj-forward-button", () => {
	let h;
	beforeEach(() => {
		h = installHistory(createPubSub(), { dwellMs: 0 });
	});
	afterEach(() => {
		h.destroy();
		cleanup();
	});

	it("Enter and Space on the focused button go Forward; it enables after a Back and disables at the end", async () => {
		h.go("/nh-fwd/a");
		h.go("/nh-fwd/b");
		const el = await mount(make("dj-forward-button"));
		await el.updateComplete;
		assert(nativeButton(el).disabled, "disabled with nothing ahead");

		let back = nextLocation(h);
		h.back();
		await back;
		back = nextLocation(h);
		h.back();
		await back;
		await el.updateComplete;
		assert(!nativeButton(el).disabled, "enabled after Back");

		el.focus();
		assert(el.shadowRoot.activeElement === inner(el), "focus() reaches the inner dj-button");
		let arrived = nextLocation(h);
		await sendKeys({ press: "Enter" });
		assertEqual((await arrived).path, "/nh-fwd/a", "Enter goes Forward");

		arrived = nextLocation(h);
		el.focus();
		await sendKeys({ press: "Space" });
		assertEqual((await arrived).path, "/nh-fwd/b", "Space goes Forward");
		await el.updateComplete;
		assert(nativeButton(el).disabled, "disabled at the end of the stack");
	});

	it("the accessible name is Forward, as text and when icon-only", async () => {
		h.go("/nh-fwd/a");
		h.back();
		const el = await mount(make("dj-forward-button"));
		await el.updateComplete;
		assertEqual(inner(el).textContent.trim(), "Forward", "visible label");
		el.iconOnly = true;
		await el.updateComplete;
		assertEqual(nativeButton(el).getAttribute("aria-label"), "Forward", "icon-only: aria-label is the label");
	});

	it("has no serious or critical accessibility violations, with the label shown and icon-only", async () => {
		h.go("/nh-fwd/a");
		h.back();
		const el = await mount(make("dj-forward-button"));
		await el.updateComplete;
		await assertNoViolations(el);
		el.iconOnly = true;
		await el.updateComplete;
		await assertNoViolations(el);
	});
});

describe("confirmLeave", () => {
	let h;
	beforeEach(() => {
		h = installHistory(createPubSub(), { dwellMs: 0 });
	});
	afterEach(() => {
		h.destroy();
		document.querySelectorAll("dj-dialog[data-confirm-leave]").forEach((d) => d.remove());
		cleanup();
	});

	const until = async (check, message) => {
		for (let i = 0; i < 100; i++) {
			if (check()) return;
			await new Promise((resolve) => setTimeout(resolve, 20));
		}
		throw new Error(`timed out: ${message}`);
	};
	const dialog = () => document.querySelector("dj-dialog[data-confirm-leave]");
	const choose = (label) => [...dialog().querySelectorAll("dj-button")].find((b) => b.textContent.trim() === label).click();

	it("a dirty form: the real Back button asks, Stay keeps the page and focus, Leave goes back", async () => {
		h.go("/cl-test/a");
		h.go("/cl-test/form");
		const input = await mount(make("input", { "aria-label": "Notes" }));
		input.focus();
		const unblock = h.block(confirmLeave("You have unsaved changes."));

		history.back(); // the browser's own Back, not h.back()
		await until(() => dialog()?.open, "the dialog opens");
		assertEqual(location.pathname, "/cl-test/form", "still on the form while asking");
		assertEqual(dialog().querySelector("p").textContent, "You have unsaved changes.", "message");

		choose("Stay");
		await until(() => !dialog(), "the dialog closes on Stay");
		await settleFrames();
		assertEqual(location.pathname, "/cl-test/form", "Stay keeps the location");
		assertEqual(h.current.path, "/cl-test/form", "and publishes nothing");
		assert(document.activeElement === input, "focus is back on the field");

		const arrived = new Promise((resolve) => {
			let replayed = false;
			let stop;
			stop = h.subscribe((l) => { if (replayed && l.source === "pop") { stop?.(); resolve(l); } });
			replayed = true;
		});
		history.back();
		await until(() => dialog()?.open, "the dialog opens again");
		choose("Leave");
		assertEqual((await arrived).path, "/cl-test/a", "Leave goes back");
		assertEqual(location.pathname, "/cl-test/a", "the URL follows");
		unblock();
	});

	it("the open dialog has no serious or critical accessibility violations", async () => {
		h.go("/cl-test/a");
		h.block(confirmLeave("You have unsaved changes."));
		history.back();
		await until(() => dialog()?.open, "the dialog opens");
		await dialog().updateComplete;
		await assertNoViolations(dialog());
	});
});
