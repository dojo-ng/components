import { css } from "lit";
export default css`
	:host { display: block; }
	:host([hidden]) { display: none; }
	.list { list-style: none; margin: 0; padding: var(--dj-spacing-2x-small, 0.25rem); outline: none;
		background: var(--dj-color-background, #fff); color: var(--dj-color-text, #1f2937);
		border: 1px solid var(--dj-color-border, #d1d5db); border-radius: var(--dj-input-border-radius-medium, 0.25rem);
		max-height: var(--dj-list-max-height, none); overflow: auto; }
	.list:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: 2px; }
	.item { display: flex; align-items: center; gap: var(--dj-spacing-x-small, 0.5rem);
		padding: var(--dj-spacing-x-small, 0.5rem) var(--dj-spacing-small, 0.75rem); border-radius: var(--dj-input-border-radius-small, 0.1875rem); cursor: pointer; }
	.item--active { background: var(--dj-color-neutral-100, #f3f4f6); }
	.item--selected { color: var(--dj-color-primary-600, #2563eb); font-weight: var(--dj-font-weight-semibold, 600); }
	.item--disabled { opacity: 0.5; cursor: not-allowed; }
	.check { width: 1rem; height: 1rem; flex: 0 0 auto; visibility: hidden; }
	.item--selected .check { visibility: visible; }
	.divider { height: 1px; margin: var(--dj-spacing-2x-small, 0.25rem) 0; background: var(--dj-color-border, #d1d5db); }
	.loading { display: flex; justify-content: center; padding: var(--dj-spacing-medium, 1rem); }
	/* Forced colors: the active row's grey fill and the selected row's color tint both
	   collapse, so use the system selected pair for the active row and pin selected text. */
	@media (forced-colors: active) {
		.item--active { background: Highlight; color: HighlightText; }
		.item--selected { color: Highlight; }
		.item--active.item--selected { color: HighlightText; }
	}
`;
