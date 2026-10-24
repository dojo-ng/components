import { html } from "lit";
import type { TemplateResult } from "lit";
import "@dojo-ng/button";
import "@dojo-ng/tooltip";

/** What `renderArrowButton` draws. The two history buttons differ only in these. */
export interface ArrowButton {
	/** Which way the arrow points before right-to-left mirroring. */
	direction: "back" | "forward";
	/** The visible label, and the accessible name when `iconOnly`. */
	label: string;
	disabled: boolean;
	iconOnly: boolean;
	/** The arrow mirrors in right-to-left text, so it keeps pointing along the reading direction. */
	rtl: boolean;
	onClick: () => void;
}

const POINTS = { back: "M15 6l-6 6 6 6", forward: "M9 6l6 6-6 6" };

/**
 * The shared markup of `dj-back-button` and `dj-forward-button`: a text `<dj-button>` with an
 * arrow, or an icon-only one inside a tooltip. A function and not a base class, so each element
 * declares its own properties and the manifest generator sees them.
 */
export function renderArrowButton(button: ArrowButton): TemplateResult {
	const arrow = html`<span slot="icon"
		><svg class="arrow ${button.rtl ? "arrow--rtl" : ""}" viewBox="0 0 24 24" aria-hidden="true"
			><path d=${POINTS[button.direction]} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
		/></svg></span>`;
	if (button.iconOnly) {
		return html`<dj-tooltip orientation="bottom">
			<dj-button part="button" kind="text" aria-label=${button.label} ?disabled=${button.disabled} @click=${button.onClick}>${arrow}</dj-button>
			<span slot="content">${button.label}</span>
		</dj-tooltip>`;
	}
	return html`<dj-button part="button" kind="text" ?disabled=${button.disabled} @click=${button.onClick}>${arrow}${button.label}</dj-button>`;
}
