// Behavior tests for dj-video. The real video.js engine is NEVER run here (it is not installed
// and does not work in happy-dom): the component only touches the engine through the protected
// createPlayer seam, which each test replaces with a stub player. Real playback is the M4 browser
// check. These cover the light-DOM render, the options built from props, the event mapping, live
// source updates, and disposal.
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/video/dist/index.js";

const tick = async (n = 2) => {
	for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0));
};

/** A minimal stand-in for a video.js player: records on() handlers and lets tests fire them. */
function makeStubPlayer() {
	const handlers = {};
	return {
		handlers,
		_src: null,
		_poster: null,
		_disposed: false,
		_played: false,
		_paused: false,
		_ct: 0,
		_dur: 0,
		on(ev, cb) {
			(handlers[ev] ||= []).push(cb);
		},
		fire(ev) {
			(handlers[ev] || []).forEach((cb) => cb());
		},
		src(s) {
			if (s === undefined) return this._src;
			this._src = s;
		},
		poster(p) {
			if (p === undefined) return this._poster;
			this._poster = p;
		},
		paused() {
			return !this._played || this._paused;
		},
		play() {
			this._played = true;
		},
		pause() {
			this._paused = true;
		},
		currentTime() {
			return this._ct;
		},
		duration() {
			return this._dur;
		},
		dispose() {
			this._disposed = true;
		},
	};
}

/** Build a dj-video whose engine is the given stub. Returns { el, stub, received }. */
async function build(props = {}) {
	const el = document.createElement("dj-video");
	const stub = makeStubPlayer();
	const received = {};
	// Replace the createPlayer seam before the element renders (updated() calls it).
	el.createPlayer = (element, options) => {
		received.element = element;
		received.options = options;
		return stub;
	};
	for (const [k, v] of Object.entries(props)) el[k] = v;
	document.body.appendChild(el);
	if (el.updateComplete) await el.updateComplete;
	await tick(); // let the async #init resolve and wire the stub
	if (el.updateComplete) await el.updateComplete;
	return { el, stub, received };
}

test("registers <dj-video>", () => {
	assert.equal(typeof customElements.get("dj-video"), "function");
});

test("renders the player region in light DOM (no shadow root)", async () => {
	const { el } = await build({ src: "movie.mp4" });
	assert.equal(el.shadowRoot, null, "no shadow root — light DOM render");
	const video = el.querySelector("video.video-js");
	assert.ok(video, "a <video class='video-js'> is in light DOM");
});

test("createPlayer receives the video element and options built from props", async () => {
	const { el, received } = await build({ src: "movie.mp4", poster: "p.jpg", muted: true });
	assert.equal(received.element, el.querySelector("video"), "the seam gets the light-DOM <video>");
	assert.equal(received.options.controls, true, "video.js owns the control bar");
	assert.deepEqual(received.options.sources, [{ src: "movie.mp4" }], "src convenience → one source");
	assert.equal(received.options.poster, "p.jpg");
	assert.equal(received.options.muted, true);
});

test("sources array takes precedence over the src convenience prop", async () => {
	const list = [
		{ src: "a.m3u8", type: "application/x-mpegURL" },
		{ src: "a.mp4", type: "video/mp4" },
	];
	const { received } = await build({ src: "ignored.mp4", sources: list });
	assert.deepEqual(received.options.sources, list);
});

test("the player's events drive dj-play / dj-pause / dj-ended", async () => {
	const { el, stub } = await build({ src: "movie.mp4" });
	const events = [];
	el.addEventListener("dj-play", () => events.push("play"));
	el.addEventListener("dj-pause", () => events.push("pause"));
	el.addEventListener("dj-ended", () => events.push("ended"));
	stub.fire("play");
	stub.fire("pause");
	stub.fire("ended");
	assert.deepEqual(events, ["play", "pause", "ended"]);
});

test("timeupdate emits dj-time {current,duration} throttled to one per second", async () => {
	const { el, stub } = await build({ src: "movie.mp4" });
	stub._ct = 12;
	stub._dur = 300;
	const times = [];
	el.addEventListener("dj-time", (e) => times.push(e.detail));
	stub.fire("timeupdate");
	stub.fire("timeupdate"); // rapid second within the same second → throttled out
	assert.equal(times.length, 1);
	assert.deepEqual(times[0], { current: 12, duration: 300 });
});

test("a sources change updates the live player via src()", async () => {
	const { el, stub } = await build({ src: "movie.mp4" });
	const next = [{ src: "b.m3u8", type: "application/x-mpegURL" }];
	el.sources = next;
	await settled(el);
	await tick();
	assert.deepEqual(stub._src, next, "the live player's src() was called with the new sources");
});

test("a poster change updates the live player via poster()", async () => {
	const { el, stub } = await build({ src: "movie.mp4" });
	el.poster = "new.jpg";
	await settled(el);
	await tick();
	assert.equal(stub._poster, "new.jpg");
});

test("play()/pause() drive the player and player() exposes the instance", async () => {
	const { el, stub } = await build({ src: "movie.mp4" });
	assert.equal(el.player(), stub);
	el.play();
	assert.equal(stub._played, true);
	el.pause();
	assert.equal(stub._paused, true);
});

test("disconnecting disposes the player", async () => {
	const { el, stub } = await build({ src: "movie.mp4" });
	el.remove();
	assert.equal(stub._disposed, true);
});
