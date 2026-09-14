import { html, nothing } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement, { reducedMotion } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/button";
import "@dojo-ng/slider";
import "@dojo-ng/icon";
import styles from "./dj-audio.styles.js";

registerDefaults("dj", { play: "Play", pause: "Pause", seek: "Seek" });
const EN: Record<string, string> = { play: "Play", pause: "Pause", seek: "Seek" };

// Glyphs are SLOTTED into dj-icon (not registered by name): dj-icon only sizes/colors
// `::slotted(svg)`, and slotting keeps play/pause out of the global icon registry.
const PLAY_ICON = html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>`;
const PAUSE_ICON = html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"></path></svg>`;

/** mm:ss (or h:mm:ss past an hour) for a duration in seconds. Not a date — plain string math. */
function formatTime(seconds: number): string {
	if (!isFinite(seconds) || seconds < 0) seconds = 0;
	const total = Math.floor(seconds);
	const s = total % 60;
	const m = Math.floor(total / 60) % 60;
	const h = Math.floor(total / 3600);
	const ss = String(s).padStart(2, "0");
	if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
	return `${m}:${ss}`;
}

/**
 * `<dj-audio>` — a themed audio player wrapping the native `HTMLAudioElement`. The `<audio>`
 * element is ours (hidden in the shadow root); the UI is dj- controls: a play/pause `<dj-button>`
 * whose icon and localized label follow the media's real `play`/`pause` events (not the click, so
 * the button stays correct if the media is driven through `media()`), a seek `<dj-slider>` whose
 * max is set from the media duration and whose value tracks playback, and a current/total time
 * readout. No vendor engine — audio needs none.
 *
 * Parts: `bar` (the control row), `play` (the play/pause button), `seek` (the slider), `time`.
 * Methods: `play()`, `pause()`, `media()` (the raw `HTMLAudioElement`; advanced, no support implied).
 * Events: `dj-play`, `dj-pause`, `dj-ended`, and `dj-time` `{ current, duration }` throttled to
 * at most once per second. xAPI/analytics/resume-position are app listeners on these events.
 */
export class DjAudio extends DojoElement {
	static override styles = [styles, reducedMotion];
	static override version = "0.1.0";

	/** Media source URL. */
	@property() src?: string;
	/** Accessible name for the player. */
	@property() label?: string;
	/** Native `preload` hint. */
	@property() preload = "metadata";

	@state() private playing = false;
	@state() private current = 0;
	@state() private duration = 0;

	@query("audio") private audio!: HTMLAudioElement;

	#i18n = new LocaleController(this);
	#lastTimeEmit = 0;

	#msg(key: string): string {
		return messages.resolve("dj", this.#i18n.locale, key) ?? EN[key] ?? key;
	}

	/** Start playback. */
	play(): void {
		void this.audio?.play();
	}
	/** Pause playback. */
	pause(): void {
		this.audio?.pause();
	}
	/** The underlying `HTMLAudioElement`. Advanced escape hatch; no support implied. */
	media(): HTMLAudioElement | null {
		return this.audio ?? null;
	}

	// Button state follows the media's own events, so it stays honest when the media is
	// driven directly via media().
	#onPlay = () => {
		this.playing = true;
		this.emit("dj-play");
	};
	#onPause = () => {
		this.playing = false;
		this.emit("dj-pause");
	};
	#onEnded = () => {
		this.playing = false;
		this.current = this.duration;
		this.emit("dj-ended");
	};
	#onMeta = () => {
		const d = this.audio?.duration ?? 0;
		this.duration = isFinite(d) && d > 0 ? d : 0;
	};
	// timeupdate fires ~4x/second; throttle the state update AND the dj-time event to 1/second.
	#onTimeUpdate = () => {
		const now = Date.now();
		if (now - this.#lastTimeEmit < 1000) return;
		this.#lastTimeEmit = now;
		this.current = this.audio?.currentTime ?? 0;
		this.emit("dj-time", { detail: { current: this.current, duration: this.duration } });
	};

	#onToggle = () => {
		if (this.playing) this.pause();
		else this.play();
	};

	#onSeek = (e: Event) => {
		const slider = e.target as HTMLElement & { value?: number };
		const to = Number(slider.value ?? 0);
		if (this.audio) this.audio.currentTime = to;
		this.current = to;
	};

	override render() {
		const action = this.playing ? "pause" : "play";
		const label = this.#msg(action);
		return html`
			<div class="bar" part="bar" role="group" aria-label=${this.label ?? nothing}>
				<dj-button
					part="play"
					class="play"
					kind="text"
					@click=${this.#onToggle}
				>
					<dj-icon slot="icon" alt-text=${label}>${this.playing ? PAUSE_ICON : PLAY_ICON}</dj-icon>
				</dj-button>
				<dj-slider
					part="seek"
					class="seek"
					label=${this.#msg("seek")}
					label-hidden
					.showOutput=${false}
					min="0"
					max=${this.duration}
					step="1"
					.value=${this.current}
					@change=${this.#onSeek}
				></dj-slider>
				<span class="time" part="time">${formatTime(this.current)} / ${formatTime(this.duration)}</span>
				<audio
					.src=${this.src ?? ""}
					preload=${this.preload}
					@play=${this.#onPlay}
					@pause=${this.#onPause}
					@ended=${this.#onEnded}
					@loadedmetadata=${this.#onMeta}
					@durationchange=${this.#onMeta}
					@timeupdate=${this.#onTimeUpdate}
				></audio>
			</div>
		`;
	}
}
export default DjAudio;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-play": CustomEvent;
		"dj-pause": CustomEvent;
		"dj-ended": CustomEvent;
		"dj-time": CustomEvent<{ current: number; duration: number }>;
	}
}
