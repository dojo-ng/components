import { css } from "lit";
export default css`
	:host {
		display: inline-block;
		position: relative; /* containing block for the marker overlay */
		inline-size: var(--dj-sparkline-width, 8em);
		block-size: var(--dj-sparkline-height, 1.5em);
		line-height: 0; /* an inline SVG otherwise leaves a baseline gap below the host box */
	}
	:host([hidden]) {
		display: none;
	}
	svg {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
	}
	/* preserveAspectRatio="none" (set on the element) can stretch the viewBox non-uniformly;
	   non-scaling-stroke keeps the line weight visually constant regardless of that stretch. */
	.line {
		fill: none;
		stroke: var(--dj-sparkline-color, var(--dj-chart-1, #2563eb));
		stroke-width: 1.5;
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}
	.area {
		fill: var(--dj-sparkline-color, var(--dj-chart-1, #2563eb));
		opacity: 0.2;
		stroke: none;
	}
	.bar {
		fill: var(--dj-sparkline-color, var(--dj-chart-1, #2563eb));
	}
	/* An HTML overlay rather than an SVG <circle>: preserveAspectRatio="none" would stretch a
	   circle into an ellipse. See the comment on renderMarker in dj-sparkline.ts. */
	.marker {
		position: absolute;
		inline-size: var(--dj-sparkline-marker-size, 0.25em);
		block-size: var(--dj-sparkline-marker-size, 0.25em);
		border-radius: 50%;
		background: var(--dj-sparkline-color, var(--dj-chart-1, #2563eb));
		transform: translate(-50%, -50%);
		pointer-events: none;
	}
	@media (forced-colors: active) {
		.line {
			stroke: CanvasText;
		}
		.area {
			opacity: 1;
			fill: Canvas;
			stroke: CanvasText;
			stroke-width: 1;
		}
		.bar {
			fill: CanvasText;
		}
		.marker {
			background: CanvasText;
		}
	}
`;
