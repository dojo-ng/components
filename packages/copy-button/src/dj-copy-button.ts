import { html } from "lit";
import type { CSSResultGroup, TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/button";
import "@dojo-ng/icon";
import styles from "./dj-copy-button.styles.js";

registerDefaults("dj", { copy: "Copy", copied: "Copied", copyError: "Copy failed" });

type CopyState = "idle" | "success" | "error";

const ICONS: Record<CopyState, TemplateResult> = {
	idle: html`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 15V5a2 2 0 012-2h8" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
	success: html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
	error: html`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
};

const FALLBACK: Record<CopyState, string> = { idle: "Copy", success: "Copied", error: "Copy failed" };
const KEY: Record<CopyState, string> = { idle: "copy", success: "copied", error: "copyError" };

/**
 * `<dj-copy-button>` — an icon-only button that copies text to the clipboard and flashes
 * feedback. It composes `<dj-button>`, so focus, keyboard, and button ARIA come for free.
 *
 * Copy the literal `value`, or point `from` at an element id in the same root to copy that
 * element's `value` (form controls) or `textContent` (`value` wins when both are set).
 * Copying uses `navigator.clipboard.writeText`, which requires a secure context (https or
 * localhost); there is no legacy `execCommand` fallback. If the clipboard is unavailable or
 * the write is rejected, the button shows an error state and emits `dj-error`.
 *
 * The icon swaps copy → check (success) → error for `feedback-duration` ms, then reverts,
 * and the button's accessible name changes with it (Copy / Copied / Copy failed) so assistive
 * tech hears the result.
 *
 * Parts: `button` (the composed `<dj-button>`).
 * Events: `dj-copy` (detail `{ value }`), `dj-error`.
 */
export class DjCopyButton extends DojoElement {
	static override styles: CSSResultGroup = styles;
	static override version = "0.1.0";
	static override focusable = true;

	/** The literal text to copy. Wins over `from` when both are set. */
	@property() value = "";
	/** Id of an element in the same root to copy from (its `value` ?? `textContent`). */
	@property() from?: string;
	/** How long (ms) the success/error state shows before reverting to the copy icon. */
	@property({ attribute: "feedback-duration", type: Number }) feedbackDuration = 2000;

	@state() private copyState: CopyState = "idle";
	#i18n = new LocaleController(this);
	#timer?: ReturnType<typeof setTimeout>;

	#label(): string {
		return messages.resolve("dj", this.#i18n.locale, KEY[this.copyState]) ?? FALLBACK[this.copyState];
	}

	#resolveValue(): string {
		if (this.value) return this.value; // value wins if both set
		if (this.from) {
			const root = this.getRootNode() as Document | ShadowRoot;
			const el = root.getElementById?.(this.from) as (HTMLElement & { value?: string }) | null;
			if (el) return el.value ?? el.textContent ?? "";
		}
		return this.value ?? "";
	}

	async #copy(): Promise<void> {
		const text = this.#resolveValue();
		try {
			const clip = navigator.clipboard;
			if (!clip || typeof clip.writeText !== "function") throw new Error("clipboard unavailable");
			await clip.writeText(text);
			this.#flash("success");
			this.emit("dj-copy", { detail: { value: text } });
		} catch {
			this.#flash("error");
			this.emit("dj-error");
		}
	}

	#flash(next: CopyState): void {
		this.copyState = next;
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => { this.copyState = "idle"; }, this.feedbackDuration);
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		clearTimeout(this.#timer);
	}

	override focus(options?: FocusOptions): void {
		this.renderRoot?.querySelector<HTMLElement>("dj-button")?.focus(options);
	}

	override render() {
		const label = this.#label();
		const cls = this.copyState === "idle" ? "icon" : `icon icon--${this.copyState}`;
		return html`
			<dj-button part="button" kind="text" label=${label} title=${label} @click=${() => this.#copy()}>
				<span slot="icon" class=${cls}>${ICONS[this.copyState]}</span>
			</dj-button>
		`;
	}
}
export default DjCopyButton;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-copy": CustomEvent<{ value: string }>;
		"dj-error": CustomEvent<Record<string, never>>;
	}
}
