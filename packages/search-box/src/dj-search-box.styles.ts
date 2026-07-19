import { css } from "lit";

// Mirrors dj-chip-typeahead's box: chips + input wrap on one bordered surface, focus ring on the
// box, chips wrap to new lines at narrow widths. Chip close and clear targets stay >=24px (mobile).
export default css`
	:host { display: block; }
	:host([hidden]) { display: none; }
	.label { margin-bottom: var(--dj-spacing-2x-small, 0.25rem); }
	.box {
		display: flex; flex-wrap: wrap; align-items: center; gap: var(--dj-spacing-2x-small, 0.25rem);
		min-height: var(--dj-input-height-medium, 2.5rem); padding: 0.25rem var(--dj-spacing-x-small, 0.5rem);
		background: var(--dj-color-background, #fff);
		border: var(--dj-input-border-width, 1px) solid var(--dj-color-border, #d1d5db);
		border-radius: var(--dj-input-border-radius-medium, 0.25rem);
	}
	.box--focused { border-color: var(--dj-color-primary-600, #2563eb); box-shadow: 0 0 0 1px var(--dj-color-primary-600, #2563eb); }
	:host([disabled]) .box { opacity: 0.5; }
	.input { flex: 1 1 6rem; min-width: 4rem; border: none; outline: none; background: transparent; color: var(--dj-color-text, #1f2937); font: inherit; }
	.clear {
		display: inline-flex; align-items: center; justify-content: center;
		width: 1.5rem; height: 1.5rem; min-width: 1.5rem; padding: 0;
		border: none; background: transparent; color: var(--dj-color-text-muted, #6b7280);
		cursor: pointer; border-radius: 50%;
	}
	.clear:hover { color: var(--dj-color-text, #1f2937); }
	.clear:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: var(--dj-focus-ring-offset, 2px); }
	/* Forced colors: box-shadow is dropped, so show focus with a real outline instead. */
	@media (forced-colors: active) {
		.box--focused { outline: 2px solid Highlight; outline-offset: -1px; }
	}
`;
