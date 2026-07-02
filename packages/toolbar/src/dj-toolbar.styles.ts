import { css } from "lit";
export default css`
	:host { display: block; }
	:host([sticky]) { position: sticky; top: 0; z-index: var(--dj-toolbar-z-index, 700); }
	.bar {
		display: flex; align-items: center; gap: var(--dj-spacing-small, 0.75rem);
		padding: var(--dj-spacing-x-small, 0.5rem) var(--dj-spacing-medium, 1rem);
		background: var(--dj-color-neutral-50, #f9fafb);
		border-bottom: 1px solid var(--dj-color-border, #d1d5db);
		color: var(--dj-color-text, #1f2937);
	}
	.leading { display: inline-flex; align-items: center; gap: var(--dj-spacing-x-small, 0.5rem); }
	.title { flex: 1 1 auto; min-width: 0; font-weight: var(--dj-font-weight-semibold, 600); }
	.actions { display: inline-flex; align-items: center; gap: var(--dj-spacing-x-small, 0.5rem); }
	.more {
		display: inline-flex; align-items: center; justify-content: center;
		width: 1.75rem; height: 1.75rem; flex: 0 0 auto;
		border: none; background: transparent; cursor: pointer; color: inherit;
		border-radius: var(--dj-input-border-radius-small, 0.1875rem);
	}
	.more:hover { background: var(--dj-color-neutral-100, #f3f4f6); }
	.more:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: 2px; }
	@media (forced-colors: active) { .more:focus-visible { outline: 2px solid Highlight; } }
`;
