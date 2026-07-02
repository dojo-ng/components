import { css } from "lit";
export default css`
	:host { display: inline-block; }
	:host([hidden]) { display: none; }
	.root { display: inline-flex; align-items: center; gap: var(--dj-spacing-x-small, 0.5rem); }
	.native { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
	.circle {
		display: inline-flex; align-items: center; justify-content: center;
		width: 1.15rem; height: 1.15rem; flex: 0 0 auto; border-radius: 50%;
		border: var(--dj-input-border-width, 1px) solid var(--dj-color-border, #d1d5db);
		background: var(--dj-color-background, #fff);
		transition: border-color var(--dj-transition-x-fast, 100ms); cursor: pointer;
	}
	.dot { width: 0.6rem; height: 0.6rem; border-radius: 50%; background: var(--dj-color-primary-600, #2563eb); transform: scale(0); transition: transform var(--dj-transition-x-fast, 100ms); }
	:host([checked]) .circle { border-color: var(--dj-color-primary-600, #2563eb); }
	:host([checked]) .dot { transform: scale(1); }
	:host([disabled]) .root { opacity: 0.5; }
	.native:focus-visible + .circle { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: var(--dj-focus-ring-offset, 2px); }
	/* WCAG 2.5.8: extend the clickable target to >=24px without enlarging the visual circle. */
	.circle { position: relative; }
	.circle::before { content: ""; position: absolute; inset: -0.3rem; border-radius: 50%; }
	.label { cursor: pointer; }
	/* Forced colors: pin the checked dot to the system highlight so it can't collapse to the
	   forced background and the selected radio stays distinguishable. */
	@media (forced-colors: active) {
		:host([checked]) .dot { background: Highlight; }
	}
`;
