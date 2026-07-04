import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import type { VideoJsOptions, VideoJsPlayer, VideoJsSource } from "video.js";

/**
 * `<dj-video>` — a themed video player wrapping video.js (the product's engine; v8, which bundles
 * HLS). We own integration; video.js owns playback and renders its own control bar (`controls:
 * true` — we do NOT rebuild video controls in v1).
 *
 * LIGHT DOM: this component renders its player region into light DOM (`createRenderRoot()` returns
 * `this`, the dj-rich-text precedent) because video.js injects DOM, needs its global stylesheet,
 * and its fullscreen/track menus misbehave inside a shadow root. video.js's stylesheet is a
 * documented APP PREREQUISITE, loaded at document level (see the README's link tag) — the same
 * arrangement as element-internals-polyfill.
 *
 * Test seam: the engine is only ever created through `protected createPlayer(el, options)`, which
 * defaults to lazily importing the real video.js factory. Tests replace it with a stub player.
 *
 * Methods: `play()`, `pause()`, `player()` (the raw video.js instance; advanced, no support
 * implied). Events: `dj-play`, `dj-pause`, `dj-ended`, and `dj-time` `{ current, duration }`
 * throttled to at most once per second. xAPI/analytics/resume-position are app listeners on these.
 *
 * Prop changes after creation: `src`/`sources`/`poster` update the live player; the rest
 * (`muted`/`autoplay`/`loop`/`tracks`/`label`) recreate it (dispose → createPlayer).
 */
export class DjVideo extends DojoElement {
	static override version = "0.1.0";

	/** Ordered source list (`{ src, type }`). Takes precedence over `src`. */
	@property({ attribute: false }) sources?: VideoJsSource[];
	/** Convenience single source; becomes one entry in `sources`. */
	@property() src?: string;
	/** Poster image URL, shown before playback. */
	@property() poster?: string;
	/** Start muted. */
	@property({ type: Boolean }) muted = false;
	/** Start playing (browsers require `muted` for autoplay). */
	@property({ type: Boolean }) autoplay = false;
	/** Loop playback. */
	@property({ type: Boolean }) loop = false;
	/** Text-track descriptors passed straight to video.js. */
	@property({ attribute: false }) tracks?: unknown[];
	/** Accessible name for the player. */
	@property() label?: string;

	#player?: VideoJsPlayer;
	#initializing = false;
	#lastTimeEmit = 0;

	/** video.js injects and needs its own DOM/CSS; render into light DOM. */
	protected override createRenderRoot() {
		return this;
	}

	/** Start playback. */
	play(): void {
		void this.#player?.play();
	}
	/** Pause playback. */
	pause(): void {
		this.#player?.pause();
	}
	/** The underlying video.js player instance. Advanced escape hatch; no support implied. */
	player(): VideoJsPlayer | null {
		return this.#player ?? null;
	}

	/** The engine factory, isolated so tests can stub it. Defaults to the real video.js. */
	protected createPlayer(el: HTMLVideoElement, options: VideoJsOptions): VideoJsPlayer | Promise<VideoJsPlayer> {
		return import("video.js").then((m) => m.default(el, options));
	}

	#sources(): VideoJsSource[] {
		if (this.sources?.length) return this.sources;
		if (this.src) return [{ src: this.src }];
		return [];
	}

	#options(): VideoJsOptions {
		return {
			controls: true,
			autoplay: this.autoplay,
			muted: this.muted,
			loop: this.loop,
			poster: this.poster,
			sources: this.#sources(),
			tracks: this.tracks,
		};
	}

	async #init() {
		if (this.#initializing || this.#player) return;
		this.#initializing = true;
		const el = this.renderRoot.querySelector("video") as HTMLVideoElement | null;
		if (!el) {
			this.#initializing = false;
			return;
		}
		const player = await this.createPlayer(el, this.#options());
		this.#player = player;
		this.#initializing = false;
		this.#wire(player);
	}

	#wire(p: VideoJsPlayer) {
		p.on("play", () => this.emit("dj-play"));
		p.on("pause", () => this.emit("dj-pause"));
		p.on("ended", () => this.emit("dj-ended"));
		// video.js fires timeupdate several times a second; throttle dj-time to 1/second.
		p.on("timeupdate", () => {
			const now = Date.now();
			if (now - this.#lastTimeEmit < 1000) return;
			this.#lastTimeEmit = now;
			this.emit("dj-time", { detail: { current: p.currentTime(), duration: p.duration() } });
		});
	}

	#teardown() {
		this.#player?.dispose();
		this.#player = undefined;
	}

	#recreate() {
		this.#teardown();
		void this.#init();
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		this.#teardown();
	}

	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (!this.#player) {
			// First render (or after a teardown): build from the current props. The initial
			// `changed` set is consumed here via #options(), so it is not re-applied below.
			void this.#init();
			return;
		}
		const recreateProps = ["muted", "autoplay", "loop", "tracks", "label"];
		if (recreateProps.some((k) => changed.has(k))) {
			this.#recreate();
			return;
		}
		if (changed.has("src") || changed.has("sources")) this.#player.src(this.#sources());
		if (changed.has("poster")) this.#player.poster(this.poster ?? "");
	}

	override render() {
		return html`<div class="dj-video-container">
			<video class="video-js" aria-label=${this.label ?? nothing} playsinline></video>
		</div>`;
	}
}
export default DjVideo;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-play": CustomEvent;
		"dj-pause": CustomEvent;
		"dj-ended": CustomEvent;
		"dj-time": CustomEvent<{ current: number; duration: number }>;
	}
}
