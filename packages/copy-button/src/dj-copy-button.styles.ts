import { css } from "lit";
export default css`
	:host { display: inline-flex; }
	:host([hidden]) { display: none; }
	.icon { display: inline-flex; }
	.icon svg { width: 1.1em; height: 1.1em; }
	/* Icon-only: the localized state text is the button's accessible name, kept for AT but
	   visually hidden (dj-button doesn't forward a host aria-label). */
	dj-button::part(label) {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}
	/* Feedback colors reuse the semantic scales. */
	.icon--success { color: var(--dj-color-success-600, #16a34a); }
	.icon--error { color: var(--dj-color-danger-600, #dc2626); }
`;
