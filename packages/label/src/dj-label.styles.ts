import { css } from "lit";
export default css`
	:host { display: inline-block; }
	:host([hidden]) { display: none; }
	.label {
		display: inline-block;
		font-family: var(--dj-input-font-family, inherit);
		font-size: var(--dj-input-label-font-size, 0.95rem);
		color: var(--dj-color-neutral-700, #374151);
		cursor: default;
	}
	.label--secondary { color: var(--dj-color-neutral-500, #6b7280); }
	.label--disabled { opacity: 0.5; cursor: not-allowed; }
	.label--focused { color: var(--dj-color-primary-600, #2563eb); }
	.label--invalid { color: var(--dj-color-danger-600, #dc2626); }
	.label--required::after {
		content: "*";
		margin-inline-start: 0.125rem;
		color: var(--dj-color-danger-600, #dc2626);
	}
	/* Visually hidden but available to assistive tech. */
	:host([visually-hidden]) .label {
		position: absolute;
		width: 1px; height: 1px;
		padding: 0; margin: -1px;
		overflow: hidden; clip: rect(0 0 0 0);
		white-space: nowrap; border: 0;
	}
`;
