import { html, css } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import { awaitMotion } from "./motion.js";

/**
 * `<dj-transition>` — runs an enter/leave effect when `show` toggles. It defines no
 * effects itself: it reflects a `state` attribute (`entering` | `entered` | `leaving`
 * | `left`) on the host, and the consumer's page CSS attaches the animation to
 * `dj-transition[state="entering"]` / `dj-transition[state="leaving"]`. Enter effects
 * must be `@keyframes` animations (enter-by-transition is not supported in v1); leave
 * effects may be an animation or transitioned properties. The wrapper stays mounted
 * through the leave effect, then hides via `display: none` at `state="left"`. Rapid
 * toggling cancels the in-flight phase cleanly and fires no event for it.
 *
 * Slots:
 *  - (default) — the content to show or hide.
 *
 * Events:
 *  - `dj-after-enter` — fired when an enter phase completes (never when interrupted).
 *  - `dj-after-leave` — fired when a leave phase completes (never when interrupted).
 */
export class DjTransition extends DojoElement {
	static override version = "0.1.0";
	static override styles = css`
		:host { display: block; }
		:host([state="left"]) { display: none; }
	`;

	/** Target visibility. Toggling runs the enter or leave effect. */
	@property({ type: Boolean, reflect: true }) show = false;
	/** Run the enter effect on initial mount when `show` starts true. */
	@property({ type: Boolean, reflect: true }) appear = false;
	/** Managed by the component; consumers treat it as read-only. */
	@property({ reflect: true }) state?: "entering" | "entered" | "leaving" | "left";

	/** Generation counter: a phase abandons itself if this changes mid-flight. */
	#token = 0;
	#initialized = false;

	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (!this.#initialized) {
			this.#initialized = true;
			this.#initState();
			return;
		}
		if (!changed.has("show")) return;
		if (this.show && (this.state === "leaving" || this.state === "left")) this.#enter();
		else if (!this.show && (this.state === "entering" || this.state === "entered")) this.#leave();
	}

	#initState() {
		if (this.show && this.appear) { this.#enter(); return; }
		if (this.show) { this.state = "entered"; return; }
		this.state = "left";
	}

	/**
	 * Test seam: the state machine awaits this rather than `awaitMotion` directly, so a
	 * test can replace it on an instance to hold a phase open deterministically. Add no
	 * other hooks.
	 */
	protected motionWait(el: HTMLElement): Promise<void> { return awaitMotion(el); }

	async #enter() {
		const token = ++this.#token;
		this.removeAttribute("aria-hidden");
		this.state = "entering";
		await this.updateComplete;
		await this.motionWait(this);
		if (token !== this.#token) return;
		this.state = "entered";
		this.emit("dj-after-enter");
	}

	async #leave() {
		const token = ++this.#token;
		this.setAttribute("aria-hidden", "true");
		this.state = "leaving";
		await this.updateComplete;
		await this.motionWait(this);
		if (token !== this.#token) return;
		this.state = "left";
		this.emit("dj-after-leave");
	}

	override render() { return html`<slot></slot>`; }
}
export default DjTransition;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-after-enter": CustomEvent<Record<string, never>>;
		"dj-after-leave": CustomEvent<Record<string, never>>;
	}
}
