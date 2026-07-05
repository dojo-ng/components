import { css } from "lit";

export default css`
	:host {
		display: inline-block;
		width: var(--dj-color-picker-width, 240px);
	}
	:host([hidden]) { display: none; }
	.picker { display: flex; flex-direction: column; gap: var(--dj-spacing-small, 0.75rem); }
	.label { margin-bottom: var(--dj-spacing-2x-small, 0.25rem); }

	/* 2D saturation/brightness area */
	.area {
		position: relative;
		width: 100%;
		aspect-ratio: 4 / 3;
		border-radius: var(--dj-input-border-radius-medium, 0.25rem);
		/* white->transparent on X, transparent->black on Y, over the hue base (set inline) */
		background-image:
			linear-gradient(to top, #000, rgba(0, 0, 0, 0)),
			linear-gradient(to right, #fff, rgba(255, 255, 255, 0));
		touch-action: none;
		cursor: crosshair;
	}
	.thumb {
		position: absolute;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 2px solid #fff;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4);
		transform: translate(-50%, -50%);
		cursor: grab;
	}
	.thumb:focus-visible {
		outline: 2px solid var(--dj-color-primary-600, #2563eb);
		outline-offset: 2px;
	}

	.sliders { display: flex; flex-direction: column; gap: var(--dj-spacing-2x-small, 0.25rem); }

	.swatches { display: flex; flex-wrap: wrap; gap: var(--dj-spacing-2x-small, 0.25rem); }
	.swatch {
		width: 20px;
		height: 20px;
		padding: 0;
		border: 1px solid var(--dj-color-border, #d1d5db);
		border-radius: var(--dj-input-border-radius-small, 0.1875rem);
		cursor: pointer;
	}
	.swatch:focus-visible {
		outline: 2px solid var(--dj-color-primary-600, #2563eb);
		outline-offset: 1px;
	}

	:host([disabled]) .picker { opacity: 0.5; pointer-events: none; }

	@media (forced-colors: active) {
		.thumb { outline: 1px solid CanvasText; }
	}
`;
