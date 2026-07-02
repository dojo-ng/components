import { css } from "lit";
export default css`
	:host { display: block; border: 1px solid var(--dj-color-border, #d1d5db); border-radius: var(--dj-input-border-radius-medium, 0.25rem); overflow: hidden; }
	:host([hidden]) { display: none; }
	.title { margin: 0; }
	.button {
		display: flex; align-items: center; gap: var(--dj-spacing-x-small, 0.5rem);
		width: 100%; box-sizing: border-box; text-align: start;
		padding: var(--dj-spacing-small, 0.75rem) var(--dj-spacing-medium, 1rem);
		border: none; background: var(--dj-color-neutral-50, #f9fafb); color: var(--dj-color-text, #1f2937);
		font: inherit; font-weight: var(--dj-font-weight-semibold, 600); cursor: pointer;
	}
	.button[disabled] { cursor: default; }
	.button:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: -2px; }
	.arrow { display: inline-flex; transition: transform var(--dj-transition-fast, 150ms); }
	:host([open]) .arrow { transform: rotate(90deg); }
	/* Animated collapse via grid-template-rows 0fr -> 1fr */
	.collapse { display: grid; grid-template-rows: 0fr; transition: grid-template-rows var(--dj-transition-fast, 150ms) ease; }
	:host([open]) .collapse { grid-template-rows: 1fr; }
	.content { overflow: hidden; }
	.content__inner { padding: var(--dj-spacing-medium, 1rem); }
`;
