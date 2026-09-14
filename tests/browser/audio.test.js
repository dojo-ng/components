// dj-audio, in a real browser: the shell constructs with its dj- controls and follows the
// media element's own play/pause/ended events (the button state is driven by the media, not
// the click), and the toggle button drives the media. Real media playback is skipped (no
// network/codecs in CI); we exercise the wiring by firing the media events directly.
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/audio/dist/index.js";

describe("dj-audio", () => {
	afterEach(cleanup);

	it("constructs with the control parts and exposes the media element", async () => {
		const el = await mount(make("dj-audio", { label: "Clip" }));
		await el.updateComplete;
		assert(el.shadowRoot.querySelector('[part="play"]'), "a play/pause control renders");
		assert(el.shadowRoot.querySelector('[part="seek"]'), "a seek slider renders");
		assert(el.shadowRoot.querySelector('[part="time"]'), "a time readout renders");
		assert(el.media() instanceof HTMLAudioElement, "media() returns the underlying <audio>");
	});

	it("follows the media element's play/pause/ended events", async () => {
		const el = await mount(make("dj-audio", { label: "Clip" }));
		await el.updateComplete;
		const media = el.media();
		let plays = 0, pauses = 0, ended = 0;
		el.addEventListener("dj-play", () => plays++);
		el.addEventListener("dj-pause", () => pauses++);
		el.addEventListener("dj-ended", () => ended++);

		media.dispatchEvent(new Event("play"));
		await el.updateComplete;
		assertEqual(plays, 1, "a media play event emits dj-play");
		assertEqual(el.shadowRoot.querySelector('[part="play"] dj-icon').getAttribute("alt-text"), "Pause", "the button now offers Pause");

		media.dispatchEvent(new Event("pause"));
		await el.updateComplete;
		assertEqual(pauses, 1, "a media pause event emits dj-pause");
		assertEqual(el.shadowRoot.querySelector('[part="play"] dj-icon').getAttribute("alt-text"), "Play", "the button offers Play again");

		media.dispatchEvent(new Event("ended"));
		assertEqual(ended, 1, "a media ended event emits dj-ended");
	});

	it("the toggle button drives the media element", async () => {
		const el = await mount(make("dj-audio", { label: "Clip" }));
		await el.updateComplete;
		const media = el.media();
		let played = 0;
		media.play = () => { played++; return Promise.resolve(); };
		el.shadowRoot.querySelector('[part="play"]').click();
		assertEqual(played, 1, "clicking play calls the media element's play()");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-audio", { label: "Clip" }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
