import { css } from "lit";
export default css`
	:host { display: inline-block; }
	:host([hidden]) { display: none; }
	.root { display: inline-flex; align-items: center; gap: var(--dj-spacing-x-small, 0.5rem); }
	.native { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
	.track {
		position: relative; display: inline-flex; align-items: center; flex: 0 0 auto;
		width: 2.25rem; height: 1.25rem; border-radius: 9999px;
		background: var(--dj-color-neutral-300, #d1d5db);
		transition: background var(--dj-transition-x-fast, 100ms); cursor: pointer;
	}
	.thumb {
		position: absolute; left: 2px; width: 1rem; height: 1rem; border-radius: 50%;
		background: var(--dj-color-neutral-0, #fff); box-shadow: 0 1px 2px rgb(0 0 0 / 0.3);
		transition: transform var(--dj-transition-x-fast, 100ms);
	}
	:host([checked]) .track { background: var(--dj-color-primary-600, #2563eb); }
	:host([checked]) .thumb { transform: translateX(1rem); }
	:host([disabled]) .root { opacity: 0.5; }
	.native:focus-visible + .track { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: var(--dj-focus-ring-offset, 2px); }
	/* WCAG 2.5.8: extend the clickable target to >=24px tall without enlarging the visual track. */
	.track::before { content: ""; position: absolute; inset: -0.2rem 0; }
	.label { cursor: pointer; }
	/* Forced colors: track fill is forced flat, so give the track a border and a system-colored
	   thumb. On/off reads from thumb position plus the Highlight fill when checked. */
	@media (forced-colors: active) {
		.track { border: 1px solid CanvasText; }
		.thumb { background: CanvasText; }
		:host([checked]) .track { background: Highlight; }
		:host([checked]) .thumb { background: HighlightText; }
	}
`;
