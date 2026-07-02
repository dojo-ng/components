import { css } from "lit";
export default css`
	:host { display: block; }
	.steps { display: flex; gap: 0; }
	:host([direction="vertical"]) .steps { flex-direction: column; }
	.step { display: flex; align-items: flex-start; gap: var(--dj-spacing-x-small, 0.5rem); flex: 1; }
	.step.clickable { cursor: pointer; border-radius: var(--dj-input-border-radius-medium, 0.25rem); }
	.step.clickable:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: 2px; }
	.indicator { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; flex: 0 0 auto; border-radius: 50%;
		background: var(--dj-color-neutral-300, #d1d5db); color: var(--dj-color-neutral-0, #fff); font-weight: var(--dj-font-weight-semibold, 600); }
	.step--inProgress .indicator { background: var(--dj-color-primary-600, #2563eb); }
	.step--complete .indicator { background: var(--dj-color-success-600, #16a34a); }
	.step--error .indicator { background: var(--dj-color-danger-600, #dc2626); }
	.text { display: flex; flex-direction: column; }
	.title { font-weight: var(--dj-font-weight-semibold, 600); }
	.subtitle, .description { font-size: var(--dj-font-size-small, 0.875rem); color: var(--dj-color-text-muted, #6b7280); }
	.steps > .connector:first-child { display: none; }
	.connector { flex: 1 1 auto; height: 2px; align-self: center; background: var(--dj-color-neutral-300, #d1d5db); margin: 0 var(--dj-spacing-x-small, 0.5rem); }
	:host([direction="vertical"]) .connector { display: none; }
`;
