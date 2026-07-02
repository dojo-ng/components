import { css } from "lit";
export default css`
	:host { display: contents; }
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
	}
`;
