import { css } from "lit";
export default css`
	:host { display: inline-block; }
	:host([hidden]) { display: none; }
	.root { display: inline-flex; align-items: center; gap: var(--dj-spacing-x-small, 0.5rem); }
	/* The native control stays focusable but visually replaced by .box. */
	.native {
		position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
		overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
	}
	.box {
		display: inline-flex; align-items: center; justify-content: center;
		width: 1.15rem; height: 1.15rem; flex: 0 0 auto;
		border: var(--dj-input-border-width, 1px) solid var(--dj-color-border, #d1d5db);
		border-radius: var(--dj-input-border-radius-small, 0.1875rem);
		background: var(--dj-color-background, #fff);
		color: var(--dj-color-neutral-0, #fff);
		transition: background var(--dj-transition-x-fast, 100ms), border-color var(--dj-transition-x-fast, 100ms);
		cursor: pointer;
	}
	.check { width: 0.8rem; height: 0.8rem; visibility: hidden; }
	:host([checked]) .box { background: var(--dj-color-primary-600, #2563eb); border-color: var(--dj-color-primary-600, #2563eb); }
	:host([checked]) .check { visibility: visible; }
	:host([disabled]) .root { opacity: 0.5; }
	:host([disabled]) .box { cursor: not-allowed; }
	.native:focus-visible + .box { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: var(--dj-focus-ring-offset, 2px); }
	/* WCAG 2.5.8: extend the clickable target to >=24px without enlarging the visual box. */
	.box { position: relative; }
	.box::before { content: ""; position: absolute; inset: -0.3rem; }
	.root--invalid .box { border-color: var(--dj-color-danger-600, #dc2626); }
	.label { cursor: pointer; }
	/* Forced colors: the checked fill is forced to a system color, so render it as the
	   system "selected" pair (Highlight box, HighlightText tick) to keep checked legible. */
	@media (forced-colors: active) {
		:host([checked]) .box { background: Highlight; border-color: Highlight; color: HighlightText; }
	}
`;
