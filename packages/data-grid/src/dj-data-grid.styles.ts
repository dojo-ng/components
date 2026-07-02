import { css } from "lit";
export default css`
	:host { display: block; }
	:host([hidden]) { display: none; }
	.grid { border: 1px solid var(--dj-color-border, #d1d5db); border-radius: var(--dj-input-border-radius-medium, .25rem); overflow: hidden; font-size: var(--dj-font-size-medium, 1rem); background: var(--dj-color-background, #fff); color: var(--dj-color-text, #1f2937); }
	.row { display: grid; align-items: center; }
	.head { position: sticky; top: 0; z-index: 1; background: var(--dj-color-neutral-50, #f9fafb); border-bottom: 1px solid var(--dj-color-border, #d1d5db); }
	.hcell { display: flex; align-items: center; gap: .25rem; padding: var(--dj-spacing-x-small, .5rem) var(--dj-spacing-small, .75rem); font-weight: var(--dj-font-weight-semibold, 600); color: var(--dj-color-text-muted, #6b7280); user-select: none; }
	.hcell.sortable { cursor: pointer; } .hcell.sortable:hover { color: var(--dj-color-text, #1f2937); }
	.sortind { display: inline-flex; opacity: .7; width: 1em; }
	.scroll { overflow: auto; outline: none; }
	.scroll:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: -2px; }
	.vrow { position: absolute; left: 0; right: 0; display: grid; align-items: center; border-bottom: 1px solid var(--dj-color-neutral-100, #f3f4f6); }
	.vrow:hover { background: var(--dj-color-neutral-50, #f9fafb); }
	.vrow--active { background: var(--dj-color-neutral-100, #f3f4f6); }
	.vrow--selected { background: var(--dj-color-primary-100, #dbeafe); }
	.cell { padding: var(--dj-spacing-x-small, .5rem) var(--dj-spacing-small, .75rem); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	/* Forced colors: row tints collapse; use the system selected pair for selected rows and
	   an outline for the active (keyboard) row so both remain visible. */
	@media (forced-colors: active) {
		.vrow--active { background: Canvas; outline: 2px solid Highlight; outline-offset: -2px; }
		.vrow--selected { background: Highlight; color: HighlightText; }
	}
`;
