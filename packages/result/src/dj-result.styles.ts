import { css } from "lit";
export default css`
	:host { display: block; }
	.root { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--dj-spacing-x-small, 0.5rem); padding: var(--dj-spacing-large, 1.5rem); }
	.status { display: inline-flex; width: 2.5rem; height: 2.5rem; }
	.status--success { color: var(--dj-color-success-600, #16a34a); }
	.status--error { color: var(--dj-color-danger-600, #dc2626); }
	.status--alert { color: var(--dj-color-warning-600, #ca8a04); }
	.status--info { color: var(--dj-color-primary-600, #2563eb); }
	.title { margin: 0; font-size: 1.15rem; }
	.subtitle { margin: 0; color: var(--dj-color-text-muted, #6b7280); }
	.actions { display: flex; gap: var(--dj-spacing-x-small, 0.5rem); margin-top: var(--dj-spacing-x-small, 0.5rem); }
`;
