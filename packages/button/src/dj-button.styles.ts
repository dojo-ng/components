import { css } from "lit";

/**
 * Button styles. Theming is driven by --dj-* custom properties, which pierce the
 * shadow boundary, so a host app can theme buttons by setting tokens on any ancestor.
 * Fallback values keep the button usable before a full theme is loaded.
 */
export default css`
	:host {
		box-sizing: border-box;
		display: inline-block;
	}
	:host([hidden]) {
		display: none;
	}

	.button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--dj-spacing-small, 0.5rem);
		min-height: var(--dj-input-height-medium, 2.5rem);
		padding: 0 var(--dj-spacing-medium, 1rem);
		border: var(--dj-input-border-width, 1px) solid transparent;
		border-radius: var(--dj-input-border-radius-medium, 0.25rem);
		font-family: var(--dj-input-font-family, inherit);
		font-size: var(--dj-button-font-size-medium, 1rem);
		font-weight: var(--dj-font-weight-semibold, 600);
		line-height: 1;
		white-space: nowrap;
		cursor: pointer;
		user-select: none;
		-webkit-user-select: none;
		transition: background-color var(--dj-transition-x-fast, 100ms),
			border-color var(--dj-transition-x-fast, 100ms),
			color var(--dj-transition-x-fast, 100ms),
			box-shadow var(--dj-transition-x-fast, 100ms);
	}

	.button:focus {
		outline: none;
	}
	.button:focus-visible {
		outline: var(--dj-focus-ring, 2px solid currentColor);
		outline-offset: var(--dj-focus-ring-offset, 2px);
	}

	/* Contained (default) */
	.button--contained {
		background-color: var(--dj-color-primary-600, #2563eb);
		border-color: var(--dj-color-primary-600, #2563eb);
		color: var(--dj-color-neutral-0, #ffffff);
	}
	.button--contained:hover {
		background-color: var(--dj-color-primary-500, #3b82f6);
		border-color: var(--dj-color-primary-500, #3b82f6);
	}

	/* Outlined */
	.button--outlined {
		background: none;
		border-color: var(--dj-color-primary-600, #2563eb);
		color: var(--dj-color-primary-600, #2563eb);
	}
	.button--outlined:hover {
		background-color: var(--dj-color-primary-600, #2563eb);
		color: var(--dj-color-neutral-0, #ffffff);
	}

	/* Text */
	.button--text {
		background: none;
		border-color: transparent;
		color: var(--dj-color-primary-600, #2563eb);
	}
	.button--text:hover {
		color: var(--dj-color-primary-500, #3b82f6);
	}

	/* Disabled */
	:host([disabled]) .button,
	.button[disabled] {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Hide the icon slot wrapper when no icon is supplied, so gap doesn't apply. */
	.icon {
		display: none;
		flex: 0 0 auto;
		align-items: center;
	}
	.button--has-icon .icon {
		display: inline-flex;
	}

	.label {
		display: inline-flex;
		align-items: center;
	}
`;
