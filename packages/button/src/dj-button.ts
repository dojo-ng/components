import { html, nothing } from "lit";
import type { CSSResultGroup } from "lit";
import { property, state } from "lit/decorators.js";
import DojoElement, { reducedMotion } from "@dojo-ng/dojo-element";
import styles from "./dj-button.styles.js";

export type ButtonKind = "contained" | "outlined" | "text";
export type ButtonType = "button" | "submit" | "reset" | "menu";
export type IconPosition = "before" | "after";

/**
 * `<dj-button>` — the foundational button.
 *
 * Slots:
 *  - (default): the button label
 *  - icon: an icon, placed per `icon-position`
 *
 * Parts: `base` (the native button), `label`, `icon`.
 *
 * Events: the native `click` is allowed to bubble (it is composed by default),
 * so consumers listen for `click` as they would on a native button. No duplicate
 * custom events are emitted.
 *
 * @cssprop [--dj-button-font-size-small=var(--dj-font-size-small)] - Font size of a small button.
 * @cssprop [--dj-button-font-size-medium=var(--dj-font-size-medium)] - Font size of a medium button.
 * @cssprop [--dj-button-font-size-large=1.125rem] - Font size of a large button.
 */
export class DjButton extends DojoElement {
	static override styles: CSSResultGroup = [styles, reducedMotion];
	static override version = "0.1.0";
	static override focusable = true;

	/** Whether the button is disabled. */
	@property({ type: Boolean, reflect: true }) disabled = false;

	/** Visual kind: contained, outlined, or text. */
	@property({ reflect: true }) kind: ButtonKind = "contained";

	/** Native button behavior. `menu` renders as a plain button. */
	@property() type: ButtonType = "button";

	/** Form field name. */
	@property() name?: string;

	/** Form field value. */
	@property() value?: string;

	/** Optional label set via attribute; the default slot takes precedence. */
	@property() label?: string;

	/** Where the icon sits relative to the label. */
	@property({ attribute: "icon-position", reflect: true }) iconPosition: IconPosition = "before";

	/** Native title (tooltip) text. */
	@property() override title = "";

	@state() private hasIcon = false;

	/** Move focus to the underlying native button. */
	override focus(options?: FocusOptions) {
		this.renderRoot?.querySelector("button")?.focus(options);
	}

	/** Remove focus from the underlying native button. */
	override blur() {
		this.renderRoot?.querySelector("button")?.blur();
	}

	private handleClick(event: MouseEvent) {
		if (this.disabled) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		if (this.type === "submit" || this.type === "reset") {
			const form = this.closest("form");
			if (form) {
				event.preventDefault();
				if (this.type === "submit") {
					form.requestSubmit();
				} else {
					form.reset();
				}
			}
		}
	}

	private handleIconSlotChange(event: Event) {
		const slot = event.target as HTMLSlotElement;
		this.hasIcon = slot.assignedNodes({ flatten: true }).length > 0;
	}

	override render() {
		const icon = html`<span part="icon" class="icon">
			<slot name="icon" @slotchange=${this.handleIconSlotChange}></slot>
		</span>`;

		return html`
			<button
				part="base"
				class="button button--${this.kind} ${this.hasIcon ? "button--has-icon" : ""}"
				type=${this.type === "menu" ? "button" : this.type}
				?disabled=${this.disabled}
				name=${this.name ?? nothing}
				value=${this.value ?? nothing}
				title=${this.title || nothing}
				aria-disabled=${this.disabled ? "true" : "false"}
				@click=${this.handleClick}
			>
				${this.iconPosition === "before" ? icon : nothing}
				<span part="label" class="label"><slot>${this.label ?? nothing}</slot></span>
				${this.iconPosition === "after" ? icon : nothing}
			</button>
		`;
	}
}

export default DjButton;
