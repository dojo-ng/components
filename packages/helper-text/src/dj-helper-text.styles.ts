import { css } from "lit";
export default css`
	:host { display: block; }
	:host([hidden]) { display: none; }
	.root { color: var(--dj-color-neutral-500, #6b7280); }
	.root--valid { color: var(--dj-color-success-600, #16a34a); }
	.root--invalid { color: var(--dj-color-danger-600, #dc2626); }
	.text {
		margin: var(--dj-spacing-2x-small, 0.25rem) 0 0;
		font-size: var(--dj-input-help-text-font-size, 0.8rem);
		line-height: 1.3;
	}
`;
