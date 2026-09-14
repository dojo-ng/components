// dj-video, in a real browser: the shell constructs and wires the engine through its documented
// test seam (`createPlayer`), so we never load real video.js or media (not CI-stable). A stub
// player lets us verify play()/pause() reach the engine and that the engine's events surface as
// dj- events. The player region renders in LIGHT DOM (video.js injects its own DOM/CSS).
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { DjVideo } from "../../packages/video/dist/index.js";

// A minimal stand-in for a video.js player, installed via the createPlayer seam.
class StubVideo extends DjVideo {
	createPlayer(el, options) {
		const handlers = {};
		const player = {
			options, played: 0, paused: 0,
			play() { this.played++; return Promise.resolve(); },
			pause() { this.paused++; },
			dispose() {},
			on(ev, fn) { (handlers[ev] ??= []).push(fn); },
			fire(ev) { (handlers[ev] || []).forEach((f) => f()); },
			currentTime() { return 3; },
			duration() { return 10; },
			src() {},
			poster() {},
			el() { return el; },
		};
		this.stub = player;
		return player;
	}
}
customElements.define("x-video-stub", StubVideo);

describe("dj-video", () => {
	afterEach(cleanup);

	it("constructs, renders a light-DOM <video>, and creates the engine via the seam", async () => {
		const el = await mount(make("x-video-stub", { label: "Lesson", src: "x.mp4" }));
		await el.updateComplete;
		await settleFrames();
		assert(el.querySelector("video"), "a <video> element renders in light DOM");
		assert(el.player() === el.stub, "player() returns the engine built through createPlayer");
		assertEqual(el.stub.options.controls, true, "video.js is created with its own controls");
	});

	it("play() and pause() reach the engine", async () => {
		const el = await mount(make("x-video-stub", { label: "Lesson", src: "x.mp4" }));
		await el.updateComplete;
		await settleFrames();
		el.play();
		el.pause();
		assertEqual(el.stub.played, 1, "play() calls the engine's play()");
		assertEqual(el.stub.paused, 1, "pause() calls the engine's pause()");
	});

	it("surfaces engine events as dj- events", async () => {
		const el = await mount(make("x-video-stub", { label: "Lesson", src: "x.mp4" }));
		await el.updateComplete;
		await settleFrames();
		let plays = 0, pauses = 0, ended = 0;
		el.addEventListener("dj-play", () => plays++);
		el.addEventListener("dj-pause", () => pauses++);
		el.addEventListener("dj-ended", () => ended++);

		el.stub.fire("play");
		el.stub.fire("pause");
		el.stub.fire("ended");
		assertEqual(plays, 1, "the engine's play event surfaces as dj-play");
		assertEqual(pauses, 1, "the engine's pause event surfaces as dj-pause");
		assertEqual(ended, 1, "the engine's ended event surfaces as dj-ended");
	});
});
