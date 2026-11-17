// @dojo-ng/toast in a real browser: placement in LTR and RTL, the reduced-motion path, the pause
// rules on a fake clock, keyboard access to an Undo, the announcement order in the AX tree,
// and an axe pass. Queue logic is covered in tests/toast.test.js under happy-dom.
import { emulateMedia, sendKeys, sendMouse, resetMouse, executeServerCommand } from "@web/test-runner-commands";
import { cleanup, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/toast/dist/index.js";

function fakeClock() {
	let now = 0;
	let next = 0;
	const queue = [];
	return {
		now: () => now,
		setTimeout(callback, ms) { const id = ++next; queue.push({ id, at: now + ms, callback }); return id; },
		clearTimeout(id) { const i = queue.findIndex((t) => t.id === id); if (i !== -1) queue.splice(i, 1); },
		advance(ms) {
			const end = now + ms;
			for (;;) {
				queue.sort((a, b) => a.at - b.at);
				const due = queue[0];
				if (!due || due.at > end) break;
				queue.shift();
				now = due.at;
				due.callback();
			}
			now = end;
		},
	};
}

async function makeToaster(props = {}) {
	const el = document.createElement("dj-toaster");
	el.clock = fakeClock();
	Object.assign(el, props);
	document.body.append(el);
	await el.updateComplete;
	return el;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const toastEl = (el, id) => [...el.shadowRoot.querySelectorAll("dj-transition[data-id]")].find((t) => t.dataset.id === id);
const barRect = (el, id) => toastEl(el, id).querySelector("dj-snackbar").shadowRoot.querySelector(".bar").getBoundingClientRect();
const leaving = (el, id) => el.toasts.find((t) => t.id === id)?.leaving;

async function rendered(el) {
	await el.updateComplete;
	await settleFrames();
	await wait(260);
}

describe("dj-toaster", () => {
	afterEach(async () => {
		cleanup();
		document.documentElement.removeAttribute("dir");
		await resetMouse();
		await emulateMedia({ reducedMotion: "no-preference" });
	});

	for (const dir of ["ltr", "rtl"]) {
		it(`places toasts at the logical edges (${dir})`, async () => {
			document.documentElement.dir = dir;
			const width = document.documentElement.clientWidth;
			const height = document.documentElement.clientHeight;
			const near = (a, b, label) => assert(Math.abs(a - b) <= 24, `${label}: ${a} is not within 24px of ${b}`);
			for (const placement of ["bottom-start", "bottom-end", "top-start", "top-end", "bottom-center", "top-center"]) {
				const el = await makeToaster({ placement });
				el.show("Placed", { id: "p" });
				await rendered(el);
				const r = barRect(el, "p");
				const startIsLeft = dir === "ltr";
				if (placement.endsWith("-start")) near(startIsLeft ? r.left : width - r.right, 16, `${placement} ${dir} start edge`);
				if (placement.endsWith("-end")) near(startIsLeft ? width - r.right : r.left, 16, `${placement} ${dir} end edge`);
				if (placement.endsWith("-center")) near((r.left + r.right) / 2, width / 2, `${placement} centered`);
				if (placement.startsWith("top")) near(r.top, 16, `${placement} top`);
				else near(height - r.bottom, 16, `${placement} bottom`);
				el.remove();
			}
		});
	}

	it("puts the newest toast nearest the edge", async () => {
		const el = await makeToaster({ placement: "bottom-end" });
		el.show("old", { id: "a" });
		el.show("new", { id: "b" });
		await rendered(el);
		assert(barRect(el, "b").top > barRect(el, "a").top, "bottom: the newest is lowest");
		el.placement = "top-end";
		await rendered(el);
		assert(barRect(el, "b").top < barRect(el, "a").top, "top: the newest is highest");
	});

	it("animates entry normally, and skips the animation under reduced motion", async () => {
		const el = await makeToaster();
		el.show("Moving", { id: "m" });
		await el.updateComplete;
		await settleFrames();
		const entering = toastEl(el, "m");
		assertEqual(entering.getAttribute("state"), "entering", "a normal entry plays an effect");
		assertEqual(getComputedStyle(entering).animationName, "dj-toast-in", "with the toaster's keyframes");
		el.remove();

		await emulateMedia({ reducedMotion: "reduce" });
		const still = await makeToaster();
		still.show("Still", { id: "s" });
		await still.updateComplete;
		await settleFrames();
		const t = toastEl(still, "s");
		assertEqual(t.getAttribute("state"), "entered", "reduced motion: no entering phase to wait through");
		assertEqual(getComputedStyle(t).animationName, "none", "reduced motion: no animation");
		still.dismiss("s");
		await still.updateComplete;
		await settleFrames();
		await still.updateComplete;
		assertEqual(still.toasts.length, 0, "reduced motion: a dismissed toast leaves at once");
	});

	it("pauses its timers while the pointer is over it", async () => {
		const el = await makeToaster();
		el.show("Hover me", { id: "h" });
		await rendered(el);
		el.clock.advance(3000);
		const r = barRect(el, "h");
		await sendMouse({ type: "move", position: [Math.round(r.left + 10), Math.round(r.top + r.height / 2)] });
		await settleFrames();
		el.clock.advance(60000);
		assertEqual(leaving(el, "h"), false, "no timeout while hovered");
		await sendMouse({ type: "move", position: [0, 0] });
		await settleFrames();
		el.clock.advance(1999);
		assertEqual(leaving(el, "h"), false, "resumes with the 2 s that were left");
		el.clock.advance(1);
		assertEqual(leaving(el, "h"), true, "then closes");
	});

	it("pauses its timers while focus is inside it", async () => {
		const el = await makeToaster();
		el.show("Focus me", { id: "f" });
		await rendered(el);
		toastEl(el, "f").querySelector("button").focus();
		el.clock.advance(60000);
		assertEqual(leaving(el, "f"), false, "no timeout while focused");
		toastEl(el, "f").querySelector("button").blur();
		el.clock.advance(5000);
		assertEqual(leaving(el, "f"), true, "closes after focus leaves");
	});

	it("pauses its timers while the page is hidden", async () => {
		const el = await makeToaster();
		el.show("Hidden", { id: "v" });
		await rendered(el);
		const set = (state) => {
			Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
			document.dispatchEvent(new Event("visibilitychange"));
		};
		try {
			set("hidden");
			el.clock.advance(60000);
			assertEqual(leaving(el, "v"), false, "no timeout while hidden");
			set("visible");
			el.clock.advance(5000);
			assertEqual(leaving(el, "v"), true, "closes after the page is shown again");
		} finally {
			delete document.visibilityState;
		}
	});

	it("gives a toast with an action at least 8 seconds", async () => {
		const el = await makeToaster();
		el.show("Deleted", { id: "u", duration: 2000, action: { label: "Undo" } });
		await rendered(el);
		el.clock.advance(7999);
		assertEqual(leaving(el, "u"), false);
		el.clock.advance(1);
		assertEqual(leaving(el, "u"), true);
	});

	it("keyboard only: Alt+T reaches the Undo, Enter fires it, focus returns", async () => {
		const input = document.createElement("input");
		document.body.append(input);
		input.focus();
		const el = await makeToaster();
		let undone = 0;
		el.show("Message deleted", { id: "d", action: { label: "Undo", onClick: () => undone++ } });
		await rendered(el);
		assert(el.shadowRoot.querySelector(".list").getAttribute("aria-label").includes("Alt+T"), "the shortcut is in the region's label");
		await sendKeys({ press: "Alt+KeyT" });
		await settleFrames();
		assertEqual(el.shadowRoot.activeElement?.textContent, "Undo", "focus is on Undo");
		await sendKeys({ press: "Enter" });
		await el.updateComplete;
		assertEqual(undone, 1, "Undo ran");
		assertEqual(document.activeElement, input, "focus went back to the input");
	});

	it("Escape closes the focused toast and returns focus", async () => {
		const input = document.createElement("input");
		document.body.append(input);
		input.focus();
		const el = await makeToaster();
		const reasons = [];
		el.addEventListener("dj-toast-close", (e) => reasons.push(e.detail.reason));
		el.show("Saved", { id: "e" });
		await rendered(el);
		await sendKeys({ press: "Alt+KeyT" });
		await settleFrames();
		await sendKeys({ press: "Escape" });
		await el.updateComplete;
		assertEqual(reasons.join(), "escape");
		assertEqual(document.activeElement, input, "focus went back to the input");
	});

	it("announces three toasts in a row in order, in the AX tree", async () => {
		const el = await makeToaster();
		el.show("First notice", { id: "1" });
		el.show("Second notice", { id: "2" });
		el.show("Third notice", { id: "3" });
		await rendered(el);
		el.clock.advance(50);
		await settleFrames();
		const tree = await executeServerCommand("ax-tree");
		if (!Array.isArray(tree)) return; // Firefox and WebKit: no CDP; the DOM order is covered in tests/toast.test.js.
		const byId = new Map(tree.map((n) => [n.id, n]));
		const status = tree.find((n) => n.role === "status" && !n.ignored);
		assert(status, "a status region is in the Chromium AX tree");
		const texts = [];
		const walk = (id) => {
			const n = byId.get(id);
			if (!n) return;
			if (n.role === "StaticText" && !n.ignored) texts.push(n.name);
			n.children.forEach(walk);
		};
		walk(status.id);
		assertEqual(texts.join(" | "), "First notice | Second notice | Third notice", "the status region holds the three, in arrival order");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await makeToaster();
		el.show("Saved", { type: "success" });
		el.show("Careful", { type: "warning", action: { label: "Undo" } });
		el.show("Failed", { type: "error" });
		await rendered(el);
		await assertNoViolations(el);
	});
});
