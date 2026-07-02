import { css } from "lit";
export default css`
	:host { display: block; }
	:host([hidden]) { display: none; }
	.label { margin-bottom: var(--dj-spacing-2x-small, 0.25rem); cursor: pointer; }
	.trigger {
		display: flex; align-items: center; justify-content: space-between; gap: var(--dj-spacing-x-small, 0.5rem);
		width: 100%; box-sizing: border-box; min-height: var(--dj-input-height-medium, 2.5rem);
		padding: 0 var(--dj-spacing-small, 0.75rem); text-align: start;
		background: var(--dj-color-background, #fff); color: var(--dj-color-text, #1f2937);
		border: var(--dj-input-border-width, 1px) solid var(--dj-color-border, #d1d5db);
		border-radius: var(--dj-input-border-radius-medium, 0.25rem);
		font: inherit; font-size: var(--dj-font-size-medium, 1rem); cursor: pointer;
	}
	.trigger:focus-visible { outline: none; border-color: var(--dj-color-primary-600, #2563eb); box-shadow: 0 0 0 1px var(--dj-color-primary-600, #2563eb); }
	.trigger--invalid { border-color: var(--dj-color-danger-600, #dc2626); }
	:host([disabled]) .trigger { opacity: 0.5; cursor: not-allowed; }
	.placeholder { color: var(--dj-color-text-muted, #6b7280); }
	.arrow { display: inline-flex; color: var(--dj-color-text-muted, #6b7280); transition: transform var(--dj-transition-x-fast, 100ms); }
	:host([open]) .arrow { transform: rotate(180deg); }
	/* Forced colors: box-shadow is dropped, so show focus with a real outline instead. */
	@media (forced-colors: active) {
		.trigger:focus-visible { outline: 2px solid Highlight; outline-offset: -1px; }
	}
`;
