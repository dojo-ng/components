import { html, css } from "lit";
import type { CSSResultGroup } from "lit";
import { property, state } from "lit/decorators.js";
import DjConstrainedInput from "@dojo-ng/constrained-input";
import type { TextInputType } from "@dojo-ng/text-input";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/icon";

registerDefaults("dj", { showPassword: "Show password", hidePassword: "Hide password" });

const EYE = html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
const EYE_OFF = html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2M9.9 5.1A9.7 9.7 0 0112 5c6 0 10 7 10 7a17 17 0 01-3.6 4.2M6.1 6.1A17 17 0 002 12s4 7 10 7a9.7 9.7 0 003-.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

/**
 * `<dj-password-input>` — a password field with a show/hide toggle in the trailing slot.
 * Inherits `<dj-constrained-input>`, so it also accepts a custom `validator`.
 */
export class DjPasswordInput extends DjConstrainedInput {
	static override version = "0.1.0";
	static override styles: CSSResultGroup = [
		DjConstrainedInput.styles,
		css`.pw-toggle { display: inline-flex; align-items: center; justify-content: center; min-width: 1.5rem; min-height: 1.5rem; border: none; background: transparent; cursor: pointer; color: var(--dj-color-text-muted, #6b7280); padding: 0 0.25rem; }
			.pw-toggle:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: 2px; }`,
	];
	@property() override type: TextInputType = "password";
	@state() private revealed = false;
	#i18n = new LocaleController(this);

	private toggle() { this.revealed = !this.revealed; this.type = this.revealed ? "text" : "password"; }

	protected override renderTrailing() {
		return html`<button type="button" class="pw-toggle" aria-label=${this.revealed ? (messages.resolve("dj", this.#i18n.locale, "hidePassword") ?? "Hide password") : (messages.resolve("dj", this.#i18n.locale, "showPassword") ?? "Show password")} aria-pressed=${this.revealed ? "true" : "false"} @click=${() => this.toggle()}>
			<dj-icon>${this.revealed ? EYE_OFF : EYE}</dj-icon>
		</button>`;
	}
}
export default DjPasswordInput;
