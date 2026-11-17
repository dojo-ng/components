import { html, css, nothing } from "lit";
import { property } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import DojoElement, { reducedMotion, deepActiveElement } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/snackbar";
import "@dojo-ng/transition";
import { upsert, shownIds, effectiveDuration } from "./queue.js";
import type { ToastEntry, ToastOptions, ToastUpdate, ToastHandle } from "./queue.js";
import { Countdown, realClock } from "./countdown.js";
import type { Clock } from "./countdown.js";
import { matchesShortcut } from "./shortcut.js";

registerDefaults("dj", { close: "Close", notifications: "Notifications" });

export type ToasterPlacement = "top-start" | "top-center" | "top-end" | "bottom-start" | "bottom-center" | "bottom-end";
export type ToastCloseReason = "timeout" | "action" | "close" | "escape" | "api";

/** How long an announcement stays in a live region before it is removed. */
const ANNOUNCE_KEEP = 7000;

/**
 * `<dj-toaster>` — the region that shows toasts raised with `toast()`.
 *
 * Most apps never write this element: the first `toast()` call adds one to `document.body`.
 * Write it yourself to choose `placement`, `max-visible`, or `shortcut`. Use one per page.
 *
 * #### Queue and timing
 * - Toasts are shown in arrival order, at most `max-visible` at a time; the rest wait and come in
 *   as shown ones close. The newest shown toast sits nearest the screen edge.
 * - A toast closes after 5 seconds; `error` and `loading` stay until closed. A toast with an action
 *   stays at least 8 seconds. Timers pause while the pointer is over the toaster, while focus is in
 *   it, and while the page is hidden.
 *
 * #### Announcements
 * - The toaster keeps one polite and one assertive live region for every toast on the page.
 *   `error` toasts are announced assertively, all others politely, in the order they appear.
 *   Each toast renders as a `quiet` `dj-snackbar`, so the snackbars do not announce themselves.
 *
 * #### Keyboard
 * - `shortcut` (default Alt+T) moves focus to the newest toast's first button, so a keyboard user
 *   can reach an Undo. The shortcut is part of the region's label.
 * - Escape closes the focused toast and returns focus to where it was before.
 *
 * #### Not built
 * - Swipe to dismiss, rich content, and browser (Notification API) notifications.
 *
 * Events:
 *  - `dj-toast-close` (a toast started closing; `detail` is `{ id, reason }`, reason being `timeout`, `action`, `close`, `escape`, or `api`)
 *
 * @cssprop [--dj-toaster-z-index=970] - Stacking order of the toaster.
 * @cssprop [--dj-toaster-offset=1rem] - Distance from the viewport edges.
 */
export class DjToaster extends DojoElement {
	static override version = "0.1.1";
	static override styles = [
		reducedMotion,
		css`
			:host {
				position: fixed;
				z-index: var(--dj-toaster-z-index, 970);
				inset-inline: var(--dj-toaster-offset, 1rem);
				inset-block-end: var(--dj-toaster-offset, 1rem);
				display: flex;
				justify-content: center;
				pointer-events: none;
			}
			:host([placement^="top"]) { inset-block-end: auto; inset-block-start: var(--dj-toaster-offset, 1rem); }
			:host([placement$="-start"]) { justify-content: flex-start; }
			:host([placement$="-end"]) { justify-content: flex-end; }
			.root { display: contents; }
			.list {
				display: flex;
				flex-direction: column;
				/* Every toast takes the widest one's width, so the stack has one edge. */
				align-items: stretch;
				max-inline-size: 100%;
				gap: var(--dj-spacing-x-small, 0.5rem);
				pointer-events: auto;
			}
			/* The snackbar positions itself for standalone use; inside the toaster the list does. */
			dj-snackbar { position: static; transform: none; display: block; }
			dj-transition[state="entering"] { animation: dj-toast-in 180ms ease-out; }
			dj-transition[state="leaving"] { animation: dj-toast-out 140ms ease-in forwards; }
			:host([placement^="top"]) dj-transition[state="entering"] { animation-name: dj-toast-in-top; }
			@keyframes dj-toast-in { from { opacity: 0; transform: translateY(0.75rem); } }
			@keyframes dj-toast-in-top { from { opacity: 0; transform: translateY(-0.75rem); } }
			@keyframes dj-toast-out { to { opacity: 0; } }
			.text { overflow-wrap: anywhere; }
			.spinner {
				display: inline-block;
				inline-size: 1em;
				block-size: 1em;
				margin-inline-end: var(--dj-spacing-x-small, 0.5rem);
				vertical-align: -0.15em;
				border: 2px solid currentColor;
				border-inline-end-color: transparent;
				border-radius: 50%;
				animation: dj-toast-spin 0.8s linear infinite;
			}
			@keyframes dj-toast-spin { to { transform: rotate(360deg); } }
			@media (prefers-reduced-motion: reduce) {
				dj-transition[state] { animation: none; }
				.spinner { animation: none; border-inline-end-color: currentColor; opacity: 0.6; }
			}
			button {
				font: inherit;
				color: inherit;
				background: transparent;
				border: 1px solid currentColor;
				border-radius: var(--dj-input-border-radius-medium, 0.25rem);
				padding: 0.125rem var(--dj-spacing-x-small, 0.5rem);
				cursor: pointer;
			}
			button.close { border-color: transparent; padding-inline: 0.375rem; }
			button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
			.sr {
				position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden;
				clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
			}
		`,
	];

	/** Where toasts appear. Logical, so `start` and `end` follow the page direction. */
	@property({ reflect: true }) placement: ToasterPlacement = "bottom-center";
	/** How many toasts are shown at once; the rest wait. */
	@property({ type: Number, attribute: "max-visible" }) maxVisible = 3;
	/** Key combination that moves focus into the toaster, such as `Alt+T`. Empty turns it off. */
	@property() shortcut = "Alt+T";
	/** Accessible name of the region. Defaults to the localized "Notifications". */
	@property() label?: string;

	/**
	 * Test seam: the toaster reads time through this, so a test can swap in a fake clock before
	 * the first toast. Add no other hooks.
	 */
	clock: Clock = realClock;

	#i18n = new LocaleController(this);
	#entries: ToastEntry[] = [];
	#timers = new Map<string, Countdown>();
	#announced = new Map<string, string>();
	#hover = false;
	#focus = false;
	#hidden = false;
	#returnFocus: HTMLElement | null = null;

	/** The current toasts, shown and waiting, in arrival order. Read-only snapshot. */
	get toasts(): readonly ToastEntry[] { return this.#entries.slice(); }

	override connectedCallback() {
		super.connectedCallback();
		document.addEventListener("keydown", this.#onDocumentKey);
		document.addEventListener("visibilitychange", this.#onVisibility);
		this.#hidden = document.visibilityState === "hidden";
		this.addEventListener("focusin", this.#onFocusIn);
		this.addEventListener("focusout", this.#onFocusOut);
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		document.removeEventListener("keydown", this.#onDocumentKey);
		document.removeEventListener("visibilitychange", this.#onVisibility);
		this.removeEventListener("focusin", this.#onFocusIn);
		this.removeEventListener("focusout", this.#onFocusOut);
		for (const timer of this.#timers.values()) timer.stop();
		this.#timers.clear();
	}

	/** Add a toast, or update the one whose `id` matches. */
	show(message: string, options: ToastOptions = {}): ToastHandle {
		const { entries, entry, added } = upsert(this.#entries, message, options);
		this.#entries = entries;
		if (!added) this.#dropTimer(entry.id);
		this.requestUpdate();
		return this.#handle(entry.id);
	}

	/** Change a toast in place. Its timer starts over. Does nothing if the toast is gone. */
	updateToast(id: string, options: ToastUpdate): void {
		if (!this.#entries.some((e) => e.id === id)) return;
		this.show(options.message as string, { ...options, id });
	}

	/** Close one toast, or every toast when `id` is omitted. */
	dismiss(id?: string, reason: ToastCloseReason = "api"): void {
		if (id === undefined) {
			for (const entry of this.#entries) this.dismiss(entry.id, reason);
			return;
		}
		const entry = this.#entries.find((e) => e.id === id);
		if (!entry || entry.leaving) return;
		const shown = shownIds(this.#entries, this.maxVisible).has(id);
		this.#dropTimer(id);
		this.#announced.delete(id);
		this.#moveFocusOff(id);
		this.#entries = shown
			? this.#entries.map((e) => (e.id === id ? { ...e, leaving: true } : e))
			: this.#entries.filter((e) => e.id !== id);
		this.emit("dj-toast-close", { detail: { id, reason } });
		this.requestUpdate();
	}

	#handle(id: string): ToastHandle {
		return {
			id,
			dismiss: () => this.dismiss(id),
			update: (options) => this.updateToast(id, options),
		};
	}

	#remove(id: string) {
		this.#entries = this.#entries.filter((e) => e.id !== id || !e.leaving);
		this.requestUpdate();
	}

	#dropTimer(id: string) {
		this.#timers.get(id)?.stop();
		this.#timers.delete(id);
	}

	get #paused() { return this.#hover || this.#focus || this.#hidden; }

	/** Start timers for newly shown toasts, stop ones no longer shown, apply the pause state, and announce. */
	#sync() {
		const shown = shownIds(this.#entries, this.maxVisible);
		const live = new Set<string>();
		for (const entry of this.#entries) {
			if (entry.leaving || !shown.has(entry.id)) continue;
			live.add(entry.id);
			if (!this.#timers.has(entry.id)) {
				this.#timers.set(entry.id, new Countdown(this.clock, effectiveDuration(entry), () => this.dismiss(entry.id, "timeout")));
			}
			const said = `${entry.type}|${entry.message}`;
			if (this.#announced.get(entry.id) !== said) {
				this.#announced.set(entry.id, said);
				this.#announce(entry);
			}
		}
		// The list hides when it empties, and a hidden list never sends pointerleave.
		if (live.size === 0) this.#hover = false;
		for (const id of [...this.#timers.keys()]) if (!live.has(id)) this.#dropTimer(id);
		for (const id of [...this.#announced.keys()]) if (!this.#entries.some((e) => e.id === id)) this.#announced.delete(id);
		this.#applyPause();
	}

	#applyPause() {
		for (const timer of this.#timers.values()) {
			if (this.#paused) timer.pause();
			else timer.resume();
		}
	}

	#setPause(flag: "hover" | "focus" | "hidden", value: boolean) {
		if (flag === "hover") this.#hover = value;
		else if (flag === "focus") this.#focus = value;
		else this.#hidden = value;
		this.#applyPause();
	}

	#announce(entry: ToastEntry) {
		const region = this.renderRoot?.querySelector<HTMLElement>(entry.type === "error" ? ".sr-alert" : ".sr-status");
		if (!region) return;
		let text = entry.message;
		if (entry.action && this.shortcut) text += `. ${entry.action.label}: ${this.shortcut}`;
		// Write on a later task: a live region only speaks on a change it sees after it exists.
		this.clock.setTimeout(() => {
			if (!this.isConnected) return;
			const line = document.createElement("div");
			line.textContent = text;
			region.append(line);
			while (region.childElementCount > 5) region.firstElementChild?.remove();
			this.clock.setTimeout(() => line.remove(), ANNOUNCE_KEEP);
		}, 50);
	}

	#toastElement(id: string): HTMLElement | null {
		for (const el of this.renderRoot.querySelectorAll<HTMLElement>("dj-transition[data-id]")) {
			if (el.dataset.id === id) return el;
		}
		return null;
	}

	/** If focus is inside the toast about to close, send it back where it came from, or to another toast. */
	#moveFocusOff(id: string) {
		const el = this.#toastElement(id);
		const active = deepActiveElement();
		if (!el || !active || !el.contains(active)) return;
		const back = this.#returnFocus;
		this.#returnFocus = null;
		if (back && back.isConnected) { back.focus(); return; }
		const other = this.#entries.filter((e) => e.id !== id && !e.leaving).pop();
		const target = other && this.#toastElement(other.id)?.querySelector("button");
		if (target) target.focus();
		else (active as HTMLElement).blur();
	}

	#onDocumentKey = (event: KeyboardEvent) => {
		if (!this.shortcut || !matchesShortcut(event, this.shortcut)) return;
		const shown = shownIds(this.#entries, this.maxVisible);
		const newest = this.#entries.filter((e) => shown.has(e.id) && !e.leaving).pop();
		const button = newest && this.#toastElement(newest.id)?.querySelector("button");
		if (!button) return;
		event.preventDefault();
		const active = deepActiveElement() as HTMLElement | null;
		if (active && !this.#contains(active)) this.#returnFocus = active;
		button.focus();
	};

	#onVisibility = () => this.#setPause("hidden", document.visibilityState === "hidden");

	#contains(node: Node | null): boolean {
		return !!node && (node === this || this.contains(node) || this.renderRoot.contains(node));
	}

	#onFocusIn = (event: FocusEvent) => {
		const from = event.relatedTarget as HTMLElement | null;
		if (!this.#returnFocus && from && !this.#contains(from)) this.#returnFocus = from;
		this.#setPause("focus", true);
	};

	#onFocusOut = (event: FocusEvent) => {
		const to = event.relatedTarget as Node | null;
		if (this.#contains(to)) return;
		this.#setPause("focus", false);
		if (to) this.#returnFocus = null;
	};

	#onKeyDown = (event: KeyboardEvent) => {
		if (event.key !== "Escape") return;
		const el = event.composedPath().find((n) => n instanceof HTMLElement && n.localName === "dj-transition" && n.dataset.id) as HTMLElement | undefined;
		const entry = el && this.#entries.find((e) => e.id === el.dataset.id);
		if (!entry || !entry.dismissible) return;
		event.preventDefault();
		event.stopPropagation();
		this.dismiss(entry.id, "escape");
	};

	#runAction(entry: ToastEntry) {
		try {
			entry.action?.onClick?.(this.#handle(entry.id));
		} finally {
			this.dismiss(entry.id, "action");
		}
	}

	protected override updated() { this.#sync(); }

	#renderToast(entry: ToastEntry) {
		const tint = entry.type === "success" || entry.type === "warning" || entry.type === "error" ? entry.type : undefined;
		const closeText = messages.resolve("dj", this.#i18n.locale, "close") ?? "Close";
		const actions = entry.action || entry.dismissible
			? html`<span slot="actions">${entry.action
				? html`<button type="button" class="action" @click=${() => this.#runAction(entry)}>${entry.action.label}</button>`
				: nothing}${entry.dismissible
				? html`<button type="button" class="close" aria-label=${closeText} @click=${() => this.dismiss(entry.id, "close")}><span aria-hidden="true">✕</span></button>`
				: nothing}</span>`
			: nothing;
		return html`<dj-transition data-id=${entry.id} appear .show=${!entry.leaving}
			@dj-after-enter=${(e: Event) => e.stopPropagation()}
			@dj-after-leave=${(e: Event) => { e.stopPropagation(); this.#remove(entry.id); }}>
			<dj-snackbar open quiet type=${tint ?? nothing} data-type=${entry.type}>${entry.type === "loading"
				? html`<span class="spinner" aria-hidden="true"></span>`
				: nothing}<span class="text">${entry.message}</span>${actions}</dj-snackbar>
		</dj-transition>`;
	}

	override render() {
		const shown = shownIds(this.#entries, this.maxVisible);
		let list = this.#entries.filter((e) => shown.has(e.id));
		// Newest nearest the edge: last for bottom placements, first for top. DOM order follows, so Tab order matches what is seen.
		if (this.placement.startsWith("top")) list = list.slice().reverse();
		const name = this.label ?? messages.resolve("dj", this.#i18n.locale, "notifications") ?? "Notifications";
		const regionName = this.shortcut ? `${name} (${this.shortcut})` : name;
		return html`<div class="root">
			<section class="list" aria-label=${regionName} ?hidden=${list.length === 0}
				@pointerenter=${() => this.#setPause("hover", true)}
				@pointerleave=${() => this.#setPause("hover", false)}
				@keydown=${this.#onKeyDown}>${repeat(list, (e) => e.id, (e) => this.#renderToast(e))}</section>
			<div class="sr sr-status" role="status" aria-live="polite" aria-atomic="false"></div>
			<div class="sr sr-alert" role="alert" aria-live="assertive" aria-atomic="false"></div>
		</div>`;
	}
}
export default DjToaster;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-toast-close": CustomEvent<{ id: string; reason: ToastCloseReason }>;
	}
}
