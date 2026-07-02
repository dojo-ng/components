import { css } from "lit";
export default css`
	:host { display: inline-flex; }
	.base {
		display: inline-flex; align-items: center; justify-content: center;
		overflow: hidden; background-size: cover; background-position: center;
		background-color: var(--dj-color-primary-600, #2563eb); color: var(--dj-color-neutral-0, #fff);
		font-weight: var(--dj-font-weight-semibold, 600);
	}
	:host([secondary]) .base { background-color: var(--dj-color-neutral-500, #6b7280); }
	:host([outline]) .base { background-color: transparent; color: var(--dj-color-text, #1f2937); border: 1px solid var(--dj-color-border, #d1d5db); }
	:host([type="circle"]) .base { border-radius: 50%; }
	:host([type="rounded"]) .base { border-radius: var(--dj-input-border-radius-medium, 0.25rem); }
	:host([size="small"]) .base { width: 1.75rem; height: 1.75rem; font-size: var(--dj-font-size-small, 0.875rem); }
	:host([size="medium"]) .base { width: 2.5rem; height: 2.5rem; }
	:host([size="large"]) .base { width: 3.5rem; height: 3.5rem; font-size: var(--dj-font-size-large, 1.5rem); }
`;
