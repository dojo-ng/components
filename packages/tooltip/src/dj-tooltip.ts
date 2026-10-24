import { html } from "lit";
import { property, state } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import styles from "./dj-tooltip.styles.js";

export type TooltipOrientation = "top" | "right" | "bottom" | "left";

/**
 * `<dj-tooltip>` — shows tip content next to its trigger on hover/focus. The trigger goes
 * in the default slot, the tip in the `content` slot. Set `open` to force it shown. Escape hides
 * a tip that hover or focus showed, without moving the pointer or focus; entering or focusing the
 * trigger again shows it again.
 * Parts: `content`.
 *
 * @cssprop [--dj-tooltip-z-index=950] - Stacking order of the tooltip.
 */
export class DjTooltip extends DojoElement {
	static override styles = styles;
	static override version = "0.1.1";

	/** Force the tooltip open regardless of hover/focus. */
	@property({ type: Boolean }) open = false;
	@property({ reflect: true }) orientation: TooltipOrientation = "top";
	@state() private active = false;

	connectedCallback() {
		super.connectedCallback();
		this.addEventListener("pointerenter", this.show);
		this.addEventListener("pointerleave", this.hide);
		this.addEventListener("focusin", this.show);
		this.addEventListener("focusout", this.hide);
	}
	disconnectedCallback() {
		super.disconnectedCallback();
		this.removeEventListener("pointerenter", this.show);
		this.removeEventListener("pointerleave", this.hide);
		this.removeEventListener("focusin", this.show);
		this.removeEventListener("focusout", this.hide);
		document.removeEventListener("keydown", this.dismiss);
	}
	private show = () => {
		this.active = true;
		document.addEventListener("keydown", this.dismiss);
	};
	private hide = () => {
		this.active = false;
		document.removeEventListener("keydown", this.dismiss);
	};
	/** Escape dismisses the tip without moving the pointer or focus (WCAG 1.4.13). It stays dismissed until the trigger is entered or focused again. */
	private dismiss = (event: KeyboardEvent) => {
		if (event.key === "Escape" && this.active) this.hide();
	};

	override render() {
		const visible = this.open || this.active;
		return html`
			<slot></slot>
			<div part="content" class="content content--${this.orientation}" role="tooltip" ?hidden=${!visible}>
				<slot name="content"></slot>
			</div>
		`;
	}
}
export default DjTooltip;
