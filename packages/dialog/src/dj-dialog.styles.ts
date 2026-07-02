import { css } from "lit";
export default css`
	:host { display: contents; }
	.underlay {
		position: fixed; inset: 0; z-index: var(--dj-dialog-underlay-z-index, 940);
		background: transparent;
	}
	.underlay--visible { background: var(--dj-overlay-background-color, rgb(0 0 0 / 0.45)); }
	.main {
		position: fixed; z-index: var(--dj-dialog-z-index, 941);
		top: 50%; left: 50%; transform: translate(-50%, -50%);
		display: flex; flex-direction: column;
		max-width: min(92vw, 32rem); max-height: 86vh;
		background: var(--dj-color-background, #fff); color: var(--dj-color-text, #1f2937);
		border-radius: var(--dj-input-border-radius-large, 0.375rem);
		box-shadow: 0 12px 40px rgb(0 0 0 / 0.3);
		outline: none;
	}
	.title { display: flex; align-items: center; justify-content: space-between; gap: var(--dj-spacing-small, 0.75rem); padding: var(--dj-spacing-medium, 1rem); border-bottom: 1px solid var(--dj-color-border, #d1d5db); }
	.title__text { font-weight: var(--dj-font-weight-semibold, 600); }
	.close {
		display: inline-flex; align-items: center; justify-content: center;
		border: none; background: transparent; cursor: pointer; padding: 0.25rem;
		color: var(--dj-color-text-muted, #6b7280); border-radius: var(--dj-input-border-radius-small, 0.1875rem);
		width: 1.75rem; height: 1.75rem;
	}
	.close:hover { background: var(--dj-color-neutral-100, #f3f4f6); color: var(--dj-color-text, #1f2937); }
	.close:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: var(--dj-focus-ring-offset, 2px); }
	.content { padding: var(--dj-spacing-medium, 1rem); overflow: auto; }
	.actions { display: flex; justify-content: flex-end; gap: var(--dj-spacing-x-small, 0.5rem); padding: var(--dj-spacing-medium, 1rem); border-top: 1px solid var(--dj-color-border, #d1d5db); }
	/* Forced colors: the scrim becomes opaque (token) and the shadow vanishes, so border the
	   dialog to separate it from the page behind. */
	@media (forced-colors: active) { .main { border: 1px solid CanvasText; } }
`;
