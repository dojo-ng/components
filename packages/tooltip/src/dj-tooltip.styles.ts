import { css } from "lit";
export default css`
	:host { display: inline-block; position: relative; }
	:host([hidden]) { display: none; }
	.content {
		position: absolute; z-index: var(--dj-tooltip-z-index, 950);
		max-width: 20rem; width: max-content;
		padding: var(--dj-spacing-2x-small, 0.25rem) var(--dj-spacing-x-small, 0.5rem);
		background: var(--dj-color-neutral-800, #1f2937);
		color: var(--dj-color-neutral-0, #fff);
		border-radius: var(--dj-input-border-radius-small, 0.1875rem);
		font-size: var(--dj-font-size-small, 0.875rem); line-height: 1.3;
		box-shadow: 0 2px 8px rgb(0 0 0 / 0.25);
		pointer-events: none;
	}
	.content[hidden] { display: none; }
	/* Top layer (Popover API): positioned against the viewport by the component, so the
	   orientation classes' offsets and the UA popover chrome (inset, margin, border, colors)
	   are reset here. */
	.content:popover-open {
		position: fixed; inset: auto; margin: 0; border: 0; transform: none; overflow: visible;
	}
	.content--top { bottom: calc(100% + 0.4rem); left: 50%; transform: translateX(-50%); }
	.content--bottom { top: calc(100% + 0.4rem); left: 50%; transform: translateX(-50%); }
	.content--left { right: calc(100% + 0.4rem); top: 50%; transform: translateY(-50%); }
	.content--right { left: calc(100% + 0.4rem); top: 50%; transform: translateY(-50%); }
	/* Forced colors: the dark fill and shadow collapse; border the bubble so it reads as a
	   distinct surface over the page. */
	@media (forced-colors: active) { .content { border: 1px solid CanvasText; } }
`;
