import { css } from "lit";
export default css`
	:host { display: block; }
	:host([hidden]) { display: none; }
	.label { margin-bottom: var(--dj-spacing-2x-small, 0.25rem); cursor: pointer; }
	.control {
		display: block;
		background: var(--dj-color-background, #fff);
		border: var(--dj-input-border-width, 1px) solid var(--dj-color-border, #d1d5db);
		border-radius: var(--dj-input-border-radius-medium, 0.25rem);
		transition: border-color var(--dj-transition-x-fast, 100ms), box-shadow var(--dj-transition-x-fast, 100ms);
	}
	.control--focused { border-color: var(--dj-color-primary-600, #2563eb); box-shadow: 0 0 0 1px var(--dj-color-primary-600, #2563eb); }
	.control--invalid { border-color: var(--dj-color-danger-600, #dc2626); }
	:host([disabled]) .control { opacity: 0.5; }
	.input {
		display: block; width: 100%; box-sizing: border-box;
		border: none; outline: none; background: transparent; resize: vertical;
		padding: var(--dj-spacing-x-small, 0.5rem) var(--dj-spacing-small, 0.75rem);
		color: var(--dj-color-text, #1f2937);
		font-family: var(--dj-input-font-family, inherit);
		font-size: var(--dj-font-size-medium, 1rem); line-height: 1.4;
	}
	.input::placeholder { color: var(--dj-color-text-muted, #6b7280); }
	/* Forced colors: box-shadow is dropped, so show focus with a real outline instead. */
	@media (forced-colors: active) {
		.control--focused { outline: 2px solid Highlight; outline-offset: -1px; }
	}
`;
