import { css } from "lit";
export default css`
	:host { display: inline-flex; }
	.root {
		display: inline-flex; align-items: center; gap: var(--dj-spacing-2x-small, 0.25rem);
		padding: 0.2rem var(--dj-spacing-x-small, 0.5rem); border-radius: 9999px;
		background: var(--dj-color-neutral-100, #f3f4f6); color: var(--dj-color-text, #1f2937);
		font-size: var(--dj-font-size-small, 0.875rem); line-height: 1.4;
	}
	:host([checked]) .root { background: var(--dj-color-primary-600, #2563eb); color: var(--dj-color-neutral-0, #fff); }
	.action {
		display: inline-flex; align-items: center; gap: var(--dj-spacing-2x-small, 0.25rem);
		border: none; background: transparent; color: inherit; font: inherit; padding: 0; margin: 0;
	}
	button.action { cursor: pointer; }
	button.action:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: 2px; border-radius: 9999px; }
	:host([disabled]) .root { opacity: 0.5; }
	:host([disabled]) button.action { cursor: not-allowed; }
	.close { display: inline-flex; align-items: center; justify-content: center; cursor: pointer; border: none; background: transparent; color: inherit; padding: 0; width: 1.5rem; height: 1.5rem; border-radius: 50%; }
	.close .icon, .close svg { width: 1rem; height: 1rem; }
	.close:hover { background: rgb(0 0 0 / 0.1); }
	.icon { display: inline-flex; }
	/* Forced colors: the chip's fill is forced flat, so add a border for shape and use the
	   system selected pair when checked. */
	@media (forced-colors: active) {
		.root { border: 1px solid CanvasText; }
		:host([checked]) .root { background: Highlight; color: HighlightText; border-color: Highlight; }
	}
`;
