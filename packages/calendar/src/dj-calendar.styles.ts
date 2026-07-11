import { css } from "lit";
export default css`
	:host { display: inline-block; background: var(--dj-color-background, #fff); color: var(--dj-color-text, #1f2937);
		border: 1px solid var(--dj-color-border, #d1d5db); border-radius: var(--dj-input-border-radius-medium, 0.25rem);
		padding: var(--dj-spacing-small, 0.75rem); font-family: var(--dj-input-font-family, inherit); }
	:host([hidden]) { display: none; }
	.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--dj-spacing-x-small, 0.5rem); }
	.month-label { font-weight: var(--dj-font-weight-semibold, 600); }
	.nav { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border: none; background: transparent; cursor: pointer; color: var(--dj-color-text, #1f2937); border-radius: var(--dj-input-border-radius-small, 0.1875rem); }
	.nav:hover { background: var(--dj-color-neutral-100, #f3f4f6); }
	.nav:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: 2px; }
	.grid { display: grid; grid-template-columns: repeat(7, 2.25rem); }
	.dj-cal-row { display: contents; }
	.weekday { text-align: center; font-size: var(--dj-font-size-small, 0.875rem); color: var(--dj-color-text-muted, #6b7280); padding: 0.25rem 0; }
	.day { width: 2.25rem; height: 2.25rem; border: none; background: transparent; cursor: pointer; border-radius: 50%; color: inherit; font: inherit; }
	.day:hover:not(:disabled) { background: var(--dj-color-neutral-100, #f3f4f6); }
	.day:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: -2px; }
	.day--outside { color: var(--dj-color-text-muted, #6b7280); }
	.day--today { font-weight: var(--dj-font-weight-bold, 700); box-shadow: inset 0 0 0 1px var(--dj-color-primary-400, #60a5fa); }
	.day--selected { background: var(--dj-color-primary-600, #2563eb); color: var(--dj-color-neutral-0, #fff); }
	.day--selected:hover { background: var(--dj-color-primary-600, #2563eb); }
	.day:disabled { opacity: 0.3; cursor: not-allowed; }
	/* Forced colors: the selected day's fill and the today ring (inset box-shadow) both
	   collapse, so use the system selected pair and swap the ring for an outline. */
	@media (forced-colors: active) {
		.day--selected, .day--selected:hover { background: Highlight; color: HighlightText; }
		.day--today { box-shadow: none; outline: 1px solid CanvasText; outline-offset: -3px; }
	}
`;
