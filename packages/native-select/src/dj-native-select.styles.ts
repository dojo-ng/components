import { css } from "lit";
export default css`
	:host { display: block; }
	:host([hidden]) { display: none; }
	.label { margin-bottom: var(--dj-spacing-2x-small, 0.25rem); }
	.wrapper {
		position: relative; display: flex; align-items: center;
		background: var(--dj-color-background, #fff);
		border: var(--dj-input-border-width, 1px) solid var(--dj-color-border, #d1d5db);
		border-radius: var(--dj-input-border-radius-medium, 0.25rem);
		transition: border-color var(--dj-transition-x-fast, 100ms), box-shadow var(--dj-transition-x-fast, 100ms);
	}
	.wrapper--focused { border-color: var(--dj-color-primary-600, #2563eb); box-shadow: 0 0 0 1px var(--dj-color-primary-600, #2563eb); }
	.wrapper--invalid { border-color: var(--dj-color-danger-600, #dc2626); }
	:host([disabled]) .wrapper { opacity: 0.5; }
	.select {
		appearance: none; -webkit-appearance: none;
		flex: 1 1 auto; width: 100%;
		min-height: var(--dj-input-height-medium, 2.5rem);
		padding-block: 0; padding-inline-start: var(--dj-spacing-small, 0.75rem); padding-inline-end: calc(var(--dj-spacing-small, 0.75rem) + 1.25rem);
		border: none; outline: none; background: transparent;
		color: var(--dj-color-text, #1f2937);
		font-family: var(--dj-input-font-family, inherit); font-size: var(--dj-font-size-medium, 1rem);
		cursor: pointer;
	}
	.arrow {
		position: absolute; inset-inline-end: var(--dj-spacing-x-small, 0.5rem); pointer-events: none;
		display: inline-flex; color: var(--dj-color-text-muted, #6b7280);
	}
	/* Forced colors: box-shadow is dropped, so show focus with a real outline instead. */
	@media (forced-colors: active) {
		.wrapper--focused { outline: 2px solid Highlight; outline-offset: -1px; }
	}
`;
