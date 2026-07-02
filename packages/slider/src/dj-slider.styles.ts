import { css } from "lit";
export default css`
	:host { display: block; min-width: 16rem; }
	:host([hidden]) { display: none; }
	.label { margin-bottom: var(--dj-spacing-2x-small, 0.25rem); }
	.wrapper { position: relative; display: flex; align-items: center; gap: var(--dj-spacing-small, 0.75rem); }
	.track-area { position: relative; flex: 1 1 auto; height: 1.5rem; display: flex; align-items: center; }
	.track { position: absolute; left: 0; right: 0; height: 4px; border-radius: 9999px; background: var(--dj-color-neutral-200, #e5e7eb); }
	.fill { position: absolute; inset-inline-start: 0; height: 4px; border-radius: 9999px; background: var(--dj-color-primary-600, #2563eb); }
	.input { position: absolute; left: 0; width: 100%; margin: 0; background: transparent; -webkit-appearance: none; appearance: none; height: 1.5rem; }
	.input:focus-visible { outline: none; }
	.input::-webkit-slider-thumb { -webkit-appearance: none; width: 1rem; height: 1rem; border-radius: 50%; background: var(--dj-color-primary-600, #2563eb); cursor: pointer; border: 2px solid var(--dj-color-neutral-0, #fff); box-shadow: 0 1px 3px rgb(0 0 0 / 0.3); }
	.input::-moz-range-thumb { width: 1rem; height: 1rem; border-radius: 50%; background: var(--dj-color-primary-600, #2563eb); cursor: pointer; border: 2px solid var(--dj-color-neutral-0, #fff); }
	.input:focus-visible::-webkit-slider-thumb { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: 2px; }
	.input:focus-visible::-moz-range-thumb { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: 2px; }
	.output { min-width: 2ch; text-align: end; color: var(--dj-color-text, #1f2937); font-variant-numeric: tabular-nums; }
	:host([disabled]) .wrapper { opacity: 0.5; }
	/* Forced colors: the track/fill background colors collapse; border the track and pin the
	   fill to the system highlight so the value position stays visible. */
	@media (forced-colors: active) {
		.track { border: 1px solid CanvasText; }
		.fill { background: Highlight; }
		.input::-webkit-slider-thumb { background: ButtonText; }
		.input::-moz-range-thumb { background: ButtonText; }
	}
`;
