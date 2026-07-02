import { css } from "lit";
export default css`
	:host { display: block; }
	:host([hidden]) { display: none; }
	.tablist { display: flex; gap: 0; border-bottom: 1px solid var(--dj-color-border, #d1d5db); }
	.tab {
		display: inline-flex; align-items: center; gap: var(--dj-spacing-2x-small, 0.25rem);
		padding: var(--dj-spacing-x-small, 0.5rem) var(--dj-spacing-medium, 1rem);
		border: none; background: transparent; cursor: pointer;
		color: var(--dj-color-text-muted, #6b7280); font: inherit;
		border-bottom: 2px solid transparent; margin-bottom: -1px;
	}
	.tab:hover:not(.tab--disabled) { color: var(--dj-color-text, #1f2937); }
	.tab--active { color: var(--dj-color-primary-600, #2563eb); border-bottom-color: var(--dj-color-primary-600, #2563eb); }
	.tab--disabled { opacity: 0.5; cursor: not-allowed; }
	.tab:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: -2px; }
	.close { display: inline-flex; align-items: center; justify-content: center; border: none; background: transparent; cursor: pointer; color: inherit; padding: 0; width: 1.5rem; height: 1.5rem; border-radius: var(--dj-input-border-radius-small, 0.1875rem); }
	.close svg, .close .icon { width: 1rem; height: 1rem; }
	.panels { padding: var(--dj-spacing-medium, 1rem) 0; }
	:host([align-buttons="bottom"]) { display: flex; flex-direction: column; }
	:host([align-buttons="bottom"]) .tablist { order: 2; border-bottom: none; border-top: 1px solid var(--dj-color-border, #d1d5db); }
	/* Forced colors: the active tab's coloured text + underline collapse; pin both to the
	   system highlight so the selected tab stays obvious. */
	@media (forced-colors: active) {
		.tab--active { color: Highlight; border-bottom-color: Highlight; }
	}
`;
