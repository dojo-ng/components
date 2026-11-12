import { css } from "lit";
export default css`
	:host { display: block; }
	:host([hidden]) { display: none; }
	.list { list-style: none; margin: 0; padding: var(--dj-spacing-2x-small, 0.25rem); outline: none;
		background: var(--dj-color-background, #fff); color: var(--dj-color-text, #1f2937);
		border: 1px solid var(--dj-color-border, #d1d5db); border-radius: var(--dj-input-border-radius-medium, 0.25rem);
		max-height: var(--dj-list-max-height, none); overflow: auto; position: relative; box-sizing: border-box; }
	.list:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: 2px; }
	.item { display: flex; align-items: center; gap: var(--dj-spacing-x-small, 0.5rem);
		padding: var(--dj-spacing-x-small, 0.5rem) var(--dj-spacing-small, 0.75rem); border-radius: var(--dj-input-border-radius-small, 0.1875rem); cursor: pointer; }
	.item--active { background: var(--dj-color-neutral-100, #f3f4f6); }
	.item--selected { color: var(--dj-color-primary-600, #2563eb); font-weight: var(--dj-font-weight-semibold, 600); }
	.item--disabled { opacity: 0.5; cursor: not-allowed; }
	.check { width: 1rem; height: 1rem; flex: 0 0 auto; visibility: hidden; }
	.item--selected .check { visibility: visible; }
	/* Multiple: every option shows a box, checked when selected. */
	:host([multiple]) .check { visibility: visible; box-sizing: border-box; border: 1px solid var(--dj-color-border-strong, #9ca3af); border-radius: 0.1875rem; }
	:host([multiple]) .item--selected .check { border-color: currentColor; }
	:host([multiple]) .item:not(.item--selected) .check svg { visibility: hidden; }
	.divider { height: 1px; margin: var(--dj-spacing-2x-small, 0.25rem) 0; background: var(--dj-color-border, #d1d5db); }
	/* Virtual: rows sit at their offsets over a block as tall as every row, so the scrollbar is right. */
	.list--virtual { max-height: var(--dj-list-max-height, 20rem); }
	.list--virtual::after { content: ""; display: block; height: var(--dj-list-total, 0); }
	.list--virtual > li { position: absolute; top: 0; inset-inline: var(--dj-spacing-2x-small, 0.25rem); box-sizing: border-box; }
	.list--virtual .item { height: var(--dj-list-item-height, auto); white-space: nowrap; }
	.list--virtual .label { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
	.list--virtual .divider { margin: 0; background: none; display: flex; align-items: center; }
	.list--virtual .divider::before { content: ""; flex: 1; height: 1px; background: var(--dj-color-border, #d1d5db); }
	.loading { display: flex; justify-content: center; padding: var(--dj-spacing-medium, 1rem); }
	/* Reorder (progressive enhancement; hooks the @dojo-ng/dnd core renders). */
	:host([reorderable]) .item { cursor: grab; touch-action: none; }
	/* Keyboard "picked up" state: lift the item so a sighted keyboard user sees the grab. */
	.item--grabbed { outline: 2px solid var(--dj-color-primary-600, #2563eb); outline-offset: -2px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); background: var(--dj-color-primary-50, #eff6ff); }
	@media (forced-colors: active) { .item--grabbed { outline: 2px solid Highlight; } }
	.dj-drag-source { opacity: 0.4; }
	.dj-drag-ghost { border-radius: var(--dj-input-border-radius-small, 0.1875rem);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.28); opacity: 0.95; background: var(--dj-color-background, #fff); }
	.dj-drop-indicator { height: 2px; margin: 1px 0; background: var(--dj-color-primary-600, #2563eb); border-radius: 1px; }
	.announce { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; clip-path: inset(50%); overflow: hidden; white-space: nowrap; }
	/* Forced colors: the active row's grey fill and the selected row's color tint both
	   collapse, so use the system selected pair for the active row and pin selected text. */
	@media (forced-colors: active) {
		.item--active { background: Highlight; color: HighlightText; }
		.item--selected { color: Highlight; }
		.item--active.item--selected { color: HighlightText; }
		.dj-drop-indicator { background: Highlight; }
	}
`;
