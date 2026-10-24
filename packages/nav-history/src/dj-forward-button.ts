import type { CSSResultGroup } from "lit";
import { property } from "lit/decorators.js";
import DojoElement, { reducedMotion } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import { HistoryController } from "./history-controller.js";
import { renderArrowButton } from "./arrow-button.js";
import styles from "./arrow-button.styles.js";

registerDefaults("dj", { forward: "Forward" });

/**
 * `<dj-forward-button>` — a Forward button that follows the app's navigation history.
 *
 * It is built on `<dj-button>`, so keyboard use, focus, and button semantics come from there.
 * Install `@dojo-ng/history` once at startup; the button finds it through `HistoryController`.
 *
 * - It calls Forward, and is disabled when there is nothing to go forward to: before any Back, and
 *   after a new navigation, which clears Forward. With no history installed it calls
 *   `window.history.forward()` and is never disabled.
 * - After a reload with `sessionStorage` blocked, history cannot know how far Forward goes, so the
 *   button stays disabled. That is harmless.
 * - `dj-forward` fires first and can be canceled. Call `preventDefault()` to do something else.
 * - The label is "Forward". Set `label` to replace it. The accessible name always equals the
 *   visible label. With `icon-only`, only the arrow shows, the label becomes the accessible name,
 *   and a tooltip shows it on hover and focus. The arrow mirrors in right-to-left layouts.
 *
 * Parts: `button` (the composed `<dj-button>`).
 * Events: `dj-forward` (cancelable, empty detail).
 */
export class DjForwardButton extends DojoElement {
	static override styles: CSSResultGroup = [styles, reducedMotion];
	static override version = "0.1.0";
	static override focusable = true;

	/** Replaces the default label. */
	@property() label?: string;

	/** Show only the arrow. The label is still the accessible name, and a tooltip shows it. */
	@property({ attribute: "icon-only", type: Boolean, reflect: true }) iconOnly = false;

	#nav = new HistoryController(this);
	#i18n = new LocaleController(this);

	#onClick = (): void => {
		const event = this.emit("dj-forward", { cancelable: true });
		if (event.defaultPrevented) return;
		if (this.#nav.history) this.#nav.history.forward();
		else window.history.forward();
	};

	override focus(options?: FocusOptions): void {
		this.renderRoot?.querySelector<HTMLElement>("dj-button")?.focus(options);
	}

	override blur(): void {
		this.renderRoot?.querySelector<HTMLElement>("dj-button")?.blur();
	}

	override render() {
		const instance = this.#nav.history;
		return renderArrowButton({
			direction: "forward",
			label: this.label || (messages.resolve("dj", this.#i18n.locale, "forward") ?? "Forward"),
			disabled: instance !== undefined && !instance.canGoForward,
			iconOnly: this.iconOnly,
			rtl: this.#i18n.dir === "rtl",
			onClick: this.#onClick,
		});
	}
}
export default DjForwardButton;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-forward": CustomEvent<Record<string, never>>;
	}
}
