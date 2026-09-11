// dj-copy-button, in a real browser: it composes dj-button, so the thing worth proving here is
// that the whole composed shape works — the accessible name actually changing (Copy -> Copied /
// Copy failed) is what assistive tech hears, and it is an icon-only button, the shape Track A of
// rich-text-value-button-name-spec.md (CB9) had to fix. navigator.clipboard.writeText is stubbed
// rather than relying on the real OS clipboard, which needs a permission grant this runner
// doesn't have — the point here is dj-copy-button's own reaction to resolve/reject, not
// re-proving the Clipboard API itself.
import { mount, cleanup, make, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/copy-button/dist/index.js";

function stubClipboard(writeText) {
	const original = navigator.clipboard.writeText;
	navigator.clipboard.writeText = writeText;
	return () => { navigator.clipboard.writeText = original; };
}

function accessibleName(el) {
	return el.shadowRoot.querySelector("dj-button").shadowRoot.querySelector('[part="base"]').textContent.trim();
}

describe("dj-copy-button", () => {
	afterEach(cleanup);

	it("copying flashes Copied, emits dj-copy, then reverts after feedback-duration", async () => {
		const restore = stubClipboard(() => Promise.resolve());
		try {
			const el = await mount(make("dj-copy-button", { value: "hello", feedbackDuration: 30 }));
			await el.updateComplete;
			let copied;
			el.addEventListener("dj-copy", (e) => { copied = e.detail.value; });

			assertEqual(accessibleName(el), "Copy", "starts with the Copy label");
			el.shadowRoot.querySelector("dj-button").click();
			// #copy() awaits the (stubbed) clipboard write before flashing state, so the state
			// change lands a tick after the click's own synchronous dispatch — flush a macrotask,
			// not just updateComplete, before checking.
			await new Promise((r) => setTimeout(r, 0));
			await el.updateComplete;

			assertEqual(copied, "hello", "dj-copy carries the copied value");
			assertEqual(accessibleName(el), "Copied", "the accessible name announces success");

			await new Promise((r) => setTimeout(r, 80));
			await el.updateComplete;
			assertEqual(accessibleName(el), "Copy", "reverts to the Copy label after feedback-duration");
		} finally {
			restore();
		}
	});

	it("a clipboard failure flashes Copy failed and emits dj-error", async () => {
		const restore = stubClipboard(() => Promise.reject(new Error("denied")));
		try {
			const el = await mount(make("dj-copy-button", { value: "hello", feedbackDuration: 30 }));
			await el.updateComplete;
			let errors = 0;
			el.addEventListener("dj-error", () => errors++);

			el.shadowRoot.querySelector("dj-button").click();
			await new Promise((r) => setTimeout(r, 0));
			await el.updateComplete;

			assertEqual(errors, 1, "a rejected write emits dj-error");
			assertEqual(accessibleName(el), "Copy failed", "the accessible name announces the error");
		} finally {
			restore();
		}
	});

	it("has no serious or critical accessibility violations", async () => {
		const restore = stubClipboard(() => Promise.resolve());
		try {
			const el = await mount(make("dj-copy-button", { value: "hello" }));
			await el.updateComplete;
			await assertNoViolations(el);
		} finally {
			restore();
		}
	});
});
