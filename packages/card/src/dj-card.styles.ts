import { css } from "lit";
export default css`
	:host { display: block; max-width: 100%; }
	.root { background: var(--dj-color-background, #fff); color: var(--dj-color-text, #1f2937); border-radius: var(--dj-input-border-radius-large, 0.375rem); overflow: hidden; }
	:host([kind="elevated"]) .root { box-shadow: 0 1px 3px rgb(0 0 0 / 0.2); }
	:host([kind="outlined"]) .root { border: 1px solid var(--dj-color-border, #d1d5db); }
	.media { background-size: cover; background-position: center; }
	.media--16x9 { aspect-ratio: 16 / 9; }
	.media--square { aspect-ratio: 1 / 1; }
	.title { font-size: 1.1rem; margin: 0; }
	.subtitle { font-size: 0.9rem; color: var(--dj-color-text-muted, #6b7280); margin: 0.15rem 0 0; }
	.body { padding: var(--dj-spacing-medium, 1rem); }
	.title-wrap + ::slotted(*) { margin-top: var(--dj-spacing-x-small, 0.5rem); }
	.actions { display: flex; gap: var(--dj-spacing-x-small, 0.5rem); padding: var(--dj-spacing-x-small, 0.5rem) var(--dj-spacing-medium, 1rem); border-top: 1px solid var(--dj-color-border, #d1d5db); }
	.clickable { cursor: pointer; }
	.clickable:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: -2px; }
	/* Forced colors: the elevation shadow vanishes, so border the card to keep its boundary. */
	@media (forced-colors: active) { .root { border: 1px solid CanvasText; } }
`;
