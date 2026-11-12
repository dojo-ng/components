import { css } from "lit";
export default css`
	:host { display: block; position: relative; }
	:host([hidden]) { display: none; }
	.label { margin-bottom: var(--dj-spacing-2x-small, 0.25rem); cursor: pointer; }
	.trigger {
		display: flex; align-items: center; justify-content: space-between; gap: var(--dj-spacing-x-small, 0.5rem);
		width: 100%; box-sizing: border-box; min-height: var(--dj-input-height-medium, 2.5rem);
		padding: 0 var(--dj-spacing-small, 0.75rem); text-align: start;
		background: var(--dj-color-background, #fff); color: var(--dj-color-text, #1f2937);
		border: var(--dj-input-border-width, 1px) solid var(--dj-color-border, #d1d5db);
		border-radius: var(--dj-input-border-radius-medium, 0.25rem);
		font: inherit; font-size: var(--dj-font-size-medium, 1rem); cursor: pointer;
	}
	.trigger:focus-visible { outline: none; border-color: var(--dj-color-primary-600, #2563eb); box-shadow: 0 0 0 1px var(--dj-color-primary-600, #2563eb); }
	.trigger--invalid { border-color: var(--dj-color-danger-600, #dc2626); }
	:host([disabled]) .trigger { opacity: 0.5; cursor: not-allowed; }
	.placeholder { color: var(--dj-color-text-muted, #6b7280); }
	.arrow { display: inline-flex; color: var(--dj-color-text-muted, #6b7280); transition: transform var(--dj-transition-x-fast, 100ms); }
	:host([open]) .arrow { transform: rotate(180deg); }
	/* Multiple: chips on one line, cut to "+N" by the component when they do not fit. */
	.trigger--multiple { padding-inline-start: var(--dj-spacing-2x-small, 0.25rem); }
	.trigger--disabled { opacity: 0.5; cursor: not-allowed; }
	.chips { display: flex; flex: 1 1 auto; align-items: center; gap: var(--dj-spacing-2x-small, 0.25rem); min-width: 0; overflow: hidden; white-space: nowrap; }
	.chip { display: inline-flex; align-items: center; gap: 0.125rem; flex: 0 0 auto; max-width: 12rem;
		padding-inline: var(--dj-spacing-x-small, 0.5rem) 0.125rem; border-radius: var(--dj-border-radius-pill, 999px);
		background: var(--dj-color-neutral-100, #f3f4f6); font-size: var(--dj-font-size-small, 0.875rem); line-height: 1.5rem; }
	.chip-label { overflow: hidden; text-overflow: ellipsis; }
	.chip-remove { display: inline-flex; align-items: center; justify-content: center; width: 1.25rem; height: 1.25rem; padding: 0;
		border: 0; border-radius: 50%; background: none; color: inherit; cursor: pointer; }
	.chip-remove:hover { background: var(--dj-color-neutral-200, #e5e7eb); }
	.chip-remove svg { width: 0.75rem; height: 0.75rem; }
	.more { flex: 0 0 auto; color: var(--dj-color-text-muted, #6b7280); font-size: var(--dj-font-size-small, 0.875rem); }
	.panel { display: flex; flex-direction: column; }
	/* The popup list scrolls inside a bounded height, so long and paged lists stay usable. */
	dj-list { --dj-list-max-height: var(--dj-select-list-max-height, 20rem); }
	.more-loading { display: flex; justify-content: center; padding: var(--dj-spacing-2x-small, 0.25rem); }
	.status { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; clip-path: inset(50%); overflow: hidden; white-space: nowrap; }
	/* Forced colors: box-shadow is dropped, so show focus with a real outline instead. */
	@media (forced-colors: active) {
		.trigger:focus-visible { outline: 2px solid Highlight; outline-offset: -1px; }
	}
`;
