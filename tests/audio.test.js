// Behavior tests for dj-audio. happy-dom implements neither media playback nor
// HTMLMediaElement.play/pause, so we stub the inner <audio> instance: play/pause
// become spies, and currentTime/duration are made writable. These cover the
// JS-observable behavior — the button state following real media events, the
// dj- event mapping + throttle, and seeking. Actual playback is the M4 browser check.
import { settled } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/audio/dist/index.js";

const tick = async (n = 2) => {
	for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0));
};

/** Build a dj-audio, stub its inner <audio>, and settle. Returns { el, audio, calls }. */
async function build(props = {}) {
	const el = document.createElement("dj-audio");
	for (const [k, v] of Object.entries(props)) el[k] = v;
	document.body.appendChild(el);
	if (el.updateComplete) await el.updateComplete;
	const audio = el.renderRoot.querySelector("audio");
	const calls = { play: 0, pause: 0 };
	audio.play = () => {
		calls.play++;
	};
	audio.pause = () => {
		calls.pause++;
	};
	// happy-dom leaves these unset/NaN; make them plain writable numbers.
	let _ct = 0;
	Object.defineProperty(audio, "currentTime", {
		configurable: true,
		get: () => _ct,
		set: (v) => {
			_ct = v;
		},
	});
	let _dur = 0;
	Object.defineProperty(audio, "duration", {
		configurable: true,
		get: () => _dur,
		set: (v) => {
			_dur = v;
		},
	});
	return { el, audio, calls };
}

const fire = (target, type) => target.dispatchEvent(new Event(type));
const iconOf = (el) => el.renderRoot.querySelector("dj-icon");
const timeText = (el) => el.renderRoot.querySelector('[part="time"]').textContent.trim();
const seekOf = (el) => el.renderRoot.querySelector("dj-slider");

test("registers <dj-audio>", () => {
	assert.equal(typeof customElements.get("dj-audio"), "function");
});

test("play button click calls the inner audio's play()", async () => {
	const { el, calls } = await build({ src: "x.mp3" });
	const btn = el.renderRoot.querySelector('[part="play"]');
	btn.click();
	assert.equal(calls.play, 1, "clicking play calls audio.play once");
	assert.equal(calls.pause, 0);
});

test("play/pause events (not the click) drive the button state and emit dj-play/dj-pause", async () => {
	const { el, audio } = await build();
	const events = [];
	el.addEventListener("dj-play", () => events.push("play"));
	el.addEventListener("dj-pause", () => events.push("pause"));

	// Starts showing the play glyph, labeled Play.
	assert.equal(iconOf(el).getAttribute("type"), "play");

	fire(audio, "play");
	await settled(el);
	assert.equal(iconOf(el).getAttribute("type"), "pause", "icon flips to pause on the play event");
	assert.equal(iconOf(el).getAttribute("alt-text"), "Pause");

	fire(audio, "pause");
	await settled(el);
	assert.equal(iconOf(el).getAttribute("type"), "play", "icon flips back on the pause event");
	assert.deepEqual(events, ["play", "pause"]);
});

test("ended emits dj-ended and resets the button to play", async () => {
	const { el, audio } = await build();
	const events = [];
	el.addEventListener("dj-ended", () => events.push("ended"));
	fire(audio, "play");
	await settled(el);
	fire(audio, "ended");
	await settled(el);
	assert.equal(iconOf(el).getAttribute("type"), "play");
	assert.deepEqual(events, ["ended"]);
});

test("loadedmetadata sets the seek max and the total time readout", async () => {
	const { el, audio } = await build();
	audio.duration = 125; // 2:05
	fire(audio, "loadedmetadata");
	await settled(el);
	assert.equal(Number(seekOf(el).max), 125, "slider max is the duration");
	assert.equal(timeText(el), "0:00 / 2:05");
});

test("timeupdate updates the time text, emits dj-time, and throttles to one per second", async () => {
	const { el, audio } = await build();
	audio.duration = 200;
	fire(audio, "loadedmetadata");
	const times = [];
	el.addEventListener("dj-time", (e) => times.push(e.detail));

	audio.currentTime = 65; // 1:05
	fire(audio, "timeupdate");
	audio.currentTime = 66;
	fire(audio, "timeupdate"); // rapid second within the same second → throttled out
	await settled(el);

	assert.equal(times.length, 1, "two rapid timeupdates emit exactly one dj-time");
	assert.deepEqual(times[0], { current: 65, duration: 200 });
	assert.equal(timeText(el), "1:05 / 3:20");
});

test("seek: a slider change sets the media currentTime", async () => {
	const { el, audio } = await build();
	audio.duration = 300;
	fire(audio, "loadedmetadata");
	await settled(el);
	const seek = seekOf(el);
	seek.value = 45;
	seek.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
	assert.equal(audio.currentTime, 45, "change on the seek slider seeks the audio");
});

test("media() returns the inner HTMLAudioElement", async () => {
	const { el, audio } = await build();
	assert.equal(el.media(), audio);
});
