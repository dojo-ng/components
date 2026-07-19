import { css } from "lit";
export default css`
	:host {
		/* Per-variant defaults resolve from the theme's semantic color scales (the tint/ink
		   pairs the palette already defines); no per-variant alert tokens are invented. Public
		   override tokens: --dj-alert-background / --dj-alert-color / --dj-alert-accent-color. */
		--_dj-alert-bg: var(--dj-color-primary-100, #dbeafe);
		--_dj-alert-fg: var(--dj-color-primary-700, #1d4ed8);
		--_dj-alert-accent: var(--dj-color-primary-600, #2563eb);
		display: block;
	}
	/* open is reflected and defaults true; a closed alert takes no space. */
	:host(:not([open])) { display: none; }
	:host([variant="success"]) {
		--_dj-alert-bg: var(--dj-color-success-100, #dcfce7);
		--_dj-alert-fg: var(--dj-color-success-700, #15803d);
		--_dj-alert-accent: var(--dj-color-success-600, #16a34a);
	}
	:host([variant="warning"]) {
		--_dj-alert-bg: var(--dj-color-warning-100, #fef9c3);
		--_dj-alert-fg: var(--dj-color-warning-700, #a16207);
		--_dj-alert-accent: var(--dj-color-warning-600, #ca8a04);
	}
	:host([variant="danger"]) {
		--_dj-alert-bg: var(--dj-color-danger-100, #fee2e2);
		--_dj-alert-fg: var(--dj-color-danger-700, #b91c1c);
		--_dj-alert-accent: var(--dj-color-danger-600, #dc2626);
	}
	.base {
		display: flex;
		align-items: flex-start;
		gap: var(--dj-spacing-x-small, 0.5rem);
		padding: var(--dj-spacing-x-small, 0.5rem) var(--dj-spacing-medium, 1rem);
		font-family: var(--dj-font-family, system-ui, sans-serif);
		background: var(--dj-alert-background, var(--_dj-alert-bg));
		color: var(--dj-alert-color, var(--_dj-alert-fg));
		border: 1px solid transparent;
		border-inline-start: 4px solid var(--dj-alert-accent-color, var(--_dj-alert-accent));
		border-radius: var(--dj-alert-radius, var(--dj-input-border-radius-medium, 0.25rem));
	}
	.icon {
		display: inline-flex;
		flex: 0 0 auto;
		color: var(--dj-alert-accent-color, var(--_dj-alert-accent));
	}
	.icon svg { width: 1.25em; height: 1.25em; }
	.message { flex: 1 1 auto; min-inline-size: 0; }
	.close {
		flex: 0 0 auto;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin: -0.25rem -0.5rem -0.25rem 0;
		padding: 0.25rem;
		border: none;
		background: none;
		color: inherit;
		cursor: pointer;
		border-radius: var(--dj-input-border-radius-small, 0.1875rem);
	}
	.close:hover { background: rgb(0 0 0 / 0.06); }
	.close:focus-visible {
		outline: var(--dj-focus-ring, 2px solid currentColor);
		outline-offset: var(--dj-focus-ring-offset, 2px);
	}
	.close svg { width: 1rem; height: 1rem; }
	/* Forced colors flatten the tint/border; keep the banner outline visible. */
	@media (forced-colors: active) {
		.base { border: 1px solid CanvasText; }
	}
`;
