import { css } from "lit";
export default css`
	:host {
		display: block;
		color: var(--dj-color-text, #1f2937);
		font-family: var(--dj-font-family, system-ui, sans-serif);
	}
	:host([hidden]) { display: none; }
	/* The grid template (columns/rows) is computed from position and set inline in render. */
	.grid { display: grid; block-size: 100%; inline-size: 100%; }
	/* Panes clip their own overflow so long content scrolls inside the pane, not the splitter. */
	.pane { overflow: auto; min-inline-size: 0; min-block-size: 0; }
	.divider {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--dj-split-panel-divider-color, var(--dj-color-border, #d1d5db));
		cursor: col-resize;
		/* Pointer drag owns the gesture; stop the browser turning it into a scroll/pan. */
		touch-action: none;
		user-select: none;
	}
	:host([orientation="vertical"]) .divider { cursor: row-resize; }
	:host([disabled]) .divider { cursor: default; }
	.divider:focus-visible {
		outline: var(--dj-focus-ring, 2px solid);
		outline-offset: calc(-1 * var(--dj-focus-ring-offset, 2px));
	}
	/* Forced colors: a background bar disappears, so pin the divider to a system color. */
	@media (forced-colors: active) {
		.divider { background: CanvasText; }
	}
`;
