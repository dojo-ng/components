import { css } from "lit";
import type { CSSResultGroup } from "lit";
import { property } from "lit/decorators.js";
import DjButton from "@dojo-ng/button";

export type FabSize = "small" | "normal" | "extended";
export type FabPosition =
	| "bottom-right" | "bottom-center" | "bottom-left"
	| "left-center" | "right-center"
	| "top-left" | "top-center" | "top-right";

/**
 * `<dj-floating-action-button>` — a circular (or extended/pill) action button, optionally
 * fixed to a screen position. Subclasses `<dj-button>`; default-slot label, `icon` slot.
 *
 * @cssprop [--dj-fab-z-index=800] - Stacking order of the floating action button.
 */
export class DjFloatingActionButton extends DjButton {
	static override version = "0.1.1";
	static override styles: CSSResultGroup = [
		DjButton.styles,
		css`
			:host { position: relative; }
			.button { border-radius: 9999px; box-shadow: 0 2px 6px rgb(0 0 0 / 0.3); padding: 0; width: var(--dj-input-height-medium, 2.5rem); height: var(--dj-input-height-medium, 2.5rem); }
			:host([size="small"]) .button { width: var(--dj-input-height-small, 1.75rem); height: var(--dj-input-height-small, 1.75rem); }
			:host([size="extended"]) .button { width: auto; padding: 0 var(--dj-spacing-medium, 1rem); }
			:host([position]) { position: fixed; z-index: var(--dj-fab-z-index, 800); }
			:host([position="bottom-right"]) { right: 1rem; bottom: 1rem; }
			:host([position="bottom-left"]) { left: 1rem; bottom: 1rem; }
			:host([position="bottom-center"]) { left: 50%; bottom: 1rem; transform: translateX(-50%); }
			:host([position="top-right"]) { right: 1rem; top: 1rem; }
			:host([position="top-left"]) { left: 1rem; top: 1rem; }
			:host([position="top-center"]) { left: 50%; top: 1rem; transform: translateX(-50%); }
			:host([position="left-center"]) { left: 1rem; top: 50%; transform: translateY(-50%); }
			:host([position="right-center"]) { right: 1rem; top: 50%; transform: translateY(-50%); }
			/* Forced colors: the elevation shadow vanishes, so border the FAB to keep its edge. */
			@media (forced-colors: active) { .button { border: 1px solid currentColor; } }
		`,
	];
	@property({ reflect: true }) size: FabSize = "normal";
	@property({ reflect: true }) position?: FabPosition;
}
export default DjFloatingActionButton;
