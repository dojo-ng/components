import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import type { VideoJsOptions, VideoJsPlayer, VideoJsSource } from "video.js";

/**
 * `<dj-video>` — a themed video player built on video.js.
 *
 * video.js (version 8, which includes HLS support) plays the video and draws its own control bar.
 * The component handles setup, theming, and events.
 *
 * #### Before you use it
 * Load two things at the document level, because the component does not bundle them:
 * - The video.js stylesheet, with a `<link>` in the page head.
 * - video.js itself, resolved by your bundler or an import map.
 *
 * #### Changing properties
 * - `src`, `sources`, and `poster` update the playing video.
 * - `muted`, `autoplay`, `loop`, `tracks`, and `label` recreate the player.
 *
 * #### Events and methods
 * - `dj-play`, `dj-pause`, and `dj-ended` follow playback. `dj-time` reports
 *   `{ current, duration }` at most once per second.
 * - Use these events for analytics, xAPI statements, or saving the playback position.
 * - `play()` and `pause()` control playback. `player()` returns the video.js instance itself, for
 *   advanced use; the component does not support what you do with it.
 *
 * #### Light DOM
 * - The player renders in the light DOM, because video.js adds its own DOM and styles, and its
 *   fullscreen and track menus do not work well inside a shadow root.
 *
 * #### Not built
 * - Custom video controls. The video.js control bar is used as it is.
 *
 * Methods: `play()`, `pause()`, `player()` (the raw video.js instance; advanced, no support
 * implied). Events: `dj-play`, `dj-pause`, `dj-ended`, and `dj-time` `{ current, duration }`
 * throttled to at most once per second.
 */
export class DjVideo extends DojoElement {
	static override version = "0.1.1";

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
		// video.js sets its own player-root aria-label ("Video Player"/"Audio Player") during
		// createEl(), unconditionally — override it here so the `label` prop actually reaches the
		// landmark a screen reader's rotor shows, not just the inner <video> element.
		if (this.label) player.el().setAttribute("aria-label", this.label);
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
