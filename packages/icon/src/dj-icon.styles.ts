import { css } from "lit";
export default css`
	:host { display: inline-flex; }
	:host([hidden]) { display: none; }
	.icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1em;
		height: 1em;
		font-style: normal;
		line-height: 1;
		color: var(--dj-icon-color, currentColor);
	}
	.icon ::slotted(svg) { width: 100%; height: 100%; fill: currentColor; }
	.icon--small { font-size: var(--dj-font-size-small, 0.875rem); }
	.icon--medium { font-size: var(--dj-font-size-medium, 1rem); }
	.icon--large { font-size: var(--dj-font-size-large, 1.5rem); }
`;
