import { html, nothing } from "lit";
import type { CSSResultGroup, TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import DojoElement, { baseStyles } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/icon";
import styles from "./dj-alert.styles.js";

registerDefaults("dj", { close: "Close" });

export type AlertVariant = "info" | "success" | "warning" | "danger";

/** Default variant glyphs, inline in the shadow (the password-input eye precedent). */
const GLYPHS: Record<AlertVariant, TemplateResult> = {
	info: html`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v5M12 7.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
	success: html`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12.5l2.5 2.5L16 9.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
	warning: html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9.5 16.5H2.5L12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v4M12 17v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
	danger: html`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
};

/**
 * `<dj-alert>` — an inline status banner. It sits in the page flow (unlike the transient,
 * floating `dj-snackbar`, and unlike the full-page `dj-result`); use it to call out a
 * persistent state next to the content it concerns.
 *
 * An alert written in markup shows by default (`open`); closing it sets `open` false and it
 * takes no space. Info/success announce politely (`role="status"`); warning/danger announce
 * assertively (`role="alert"`).
 *
 * Slots: default (the message), `icon` (replaces the default variant glyph).
 * Parts: `base`, `icon`, `message`, `close`.
 * Events: `dj-close` (after the alert closes). Method: `close()`.
 * @cssprop [--dj-alert-background=per-variant tint] - Banner background; defaults to the variant's `--dj-color-*-100`.
 * @cssprop [--dj-alert-color=per-variant ink] - Text color; defaults to the variant's `--dj-color-*-700`.
 * @cssprop [--dj-alert-accent-color=per-variant accent] - Icon + leading-border color; defaults to the variant's `--dj-color-*-600`.
 * @cssprop [--dj-alert-radius=var(--dj-input-border-radius-medium)] - Corner radius.
 */
export class DjAlert extends DojoElement {
	static override styles: CSSResultGroup = [baseStyles, styles];
	static override version = "0.1.0";

	/** Semantic variant. Reflected so `:host([variant="…"])` and page CSS can target it. */
	@property({ reflect: true }) variant: AlertVariant = "info";
	/** Show a close button. */
	@property({ type: Boolean }) closable = false;
	/** Whether the alert is shown. Reflected; defaults true so markup alerts appear. */
	@property({ type: Boolean, reflect: true }) open = true;

	#i18n = new LocaleController(this);

	/** Close the alert: hides it and emits `dj-close` once. No-op if already closed. */
	close(): void {
		if (!this.open) return;
		this.open = false;
		this.emit("dj-close");
	}

	#role(): "status" | "alert" {
		return this.variant === "warning" || this.variant === "danger" ? "alert" : "status";
	}

	override render() {
		const closeLabel = messages.resolve("dj", this.#i18n.locale, "close") ?? "Close";
		return html`
			<div part="base" class="base" role=${this.#role()}>
				<span part="icon" class="icon"><slot name="icon">${GLYPHS[this.variant] ?? GLYPHS.info}</slot></span>
				<span part="message" class="message"><slot></slot></span>
				${this.closable
					? html`<button part="close" class="close" type="button" aria-label=${closeLabel} @click=${() => this.close()}>
							<dj-icon><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" fill="none"/></svg></dj-icon>
						</button>`
					: nothing}
			</div>
		`;
	}
}
export default DjAlert;

declare global { interface GlobalEventHandlersEventMap { "dj-close": CustomEvent<Record<string, never>>; } }
