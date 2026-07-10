import { css } from "lit";
export default css`
	:host { display: contents; }
	/* Top-layer container. Promoted via the Popover API (popover="manual") so the
	   popup escapes any transformed / clipping / z-index ancestor and positions
	   against the viewport. The UA popover styles (border, padding, background,
	   inset, margin, fit-content sizing) are neutralized here so the underlay and
	   wrapper keep their own fixed positioning. Where the Popover API is absent the
	   attribute is ignored and this is a plain full-viewport pass-through container
	   (today's in-shadow behavior). */
	.layer {
		position: fixed;
		inset: 0;
		margin: 0;
		border: 0;
		padding: 0;
		width: auto;
		height: auto;
		max-width: none;
		max-height: none;
		overflow: visible;
		background: transparent;
		color: inherit;
		pointer-events: none;
	}
	.layer .underlay,
	.layer .wrapper { pointer-events: auto; }
	.underlay {
		position: fixed;
		inset: 0;
		z-index: var(--dj-popup-underlay-z-index, 900);
		background: transparent;
	}
	.underlay--visible {
		background: var(--dj-overlay-background-color, rgb(0 0 0 / 0.35));
	}
	.wrapper {
		position: fixed;
		z-index: var(--dj-popup-z-index, 901);
		box-sizing: border-box;
		/* Hidden until reposition() places it (same update tick, before paint), so the
		   popup never flashes at the top-left corner on open. */
		opacity: 0;
	}
`;
