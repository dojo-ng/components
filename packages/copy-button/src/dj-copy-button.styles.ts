import { css } from "lit";
export default css`
	:host { display: inline-flex; }
	:host([hidden]) { display: none; }
	.icon { display: inline-flex; }
	.icon svg { width: 1.1em; height: 1.1em; }
	/* Icon-only: dj-button forwards a host aria-label to the native button now (Track A of
	   rich-text-value-button-name-spec.md, 2026-09-10), but this label text stays visually hidden
	   rather than becoming redundant -- it is a live STATE ANNOUNCEMENT (Copy, Copied, Copy failed),
	   not just a static name, so it has to be real slotted content an AT re-announces on change. */
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
