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
	/* Size + color both icon sources: a slotted <svg> (light DOM) and a registry icon
	   rendered into the shadow tree via type=. ::slotted() matches only the former and
	   .icon svg only the latter, so the two rules never double-apply to one element. */
	.icon ::slotted(svg) { width: 100%; height: 100%; fill: currentColor; }
	.icon svg { width: 100%; height: 100%; fill: currentColor; }
	.icon--small { font-size: var(--dj-font-size-small, 0.875rem); }
	.icon--medium { font-size: var(--dj-font-size-medium, 1rem); }
	.icon--large { font-size: var(--dj-font-size-large, 1.5rem); }
`;
