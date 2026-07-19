import { css } from "lit";
export default css`
	:host {
		/* Per-variant defaults resolve from the theme's semantic color scales (the same
		   ones dj-snackbar/dj-result use); no per-variant badge tokens are invented. The
		   public override tokens are --dj-badge-background / --dj-badge-color. */
		--_dj-badge-bg: var(--dj-color-neutral-600, #4b5563);
		--_dj-badge-fg: var(--dj-color-neutral-0, #ffffff);
		display: inline-flex;
		vertical-align: middle;
	}
	:host([hidden]) { display: none; }
	:host([variant="info"]) { --_dj-badge-bg: var(--dj-color-primary-600, #2563eb); }
	:host([variant="success"]) { --_dj-badge-bg: var(--dj-color-success-600, #16a34a); }
	:host([variant="warning"]) { --_dj-badge-bg: var(--dj-color-warning-600, #ca8a04); }
	:host([variant="danger"]) { --_dj-badge-bg: var(--dj-color-danger-600, #dc2626); }
	.base {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--dj-spacing-2x-small, 0.25rem);
		min-inline-size: 1em;
		padding: 0.1em 0.55em;
		font-family: var(--dj-font-family, system-ui, sans-serif);
		font-size: var(--dj-badge-font-size, 0.75rem);
		font-weight: var(--dj-font-weight-semibold, 600);
		line-height: 1.4;
		white-space: nowrap;
		background: var(--dj-badge-background, var(--_dj-badge-bg));
		color: var(--dj-badge-color, var(--_dj-badge-fg));
		border-radius: var(--dj-badge-radius, var(--dj-input-border-radius-small, 0.1875rem));
	}
	:host([pill]) .base { border-radius: 9999px; }
	/* Forced colors flatten the background fill, so keep the shape with a system border. */
	@media (forced-colors: active) {
		.base { border: 1px solid CanvasText; }
	}
`;
