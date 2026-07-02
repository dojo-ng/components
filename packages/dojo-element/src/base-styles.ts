import { css } from "lit";

/** Box-sizing reset and hidden helper shared by every Dojo NG component. */
export default css`
	:host {
		box-sizing: border-box;
	}
	:host *,
	:host *::before,
	:host *::after {
		box-sizing: inherit;
	}
	[hidden] {
		display: none !important;
	}
`;

/**
 * Honors the user's `prefers-reduced-motion` setting by near-instantly completing transitions
 * and animations within the component's shadow tree. Compose it into the `styles` array of any
 * component that animates: `static styles = [styles, reducedMotion]`. Motion-conveyed state
 * still settles (durations collapse rather than being removed), so nothing breaks.
 */
export const reducedMotion = css`
	@media (prefers-reduced-motion: reduce) {
		:host,
		:host *,
		:host *::before,
		:host *::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
			scroll-behavior: auto !important;
		}
	}
`;
