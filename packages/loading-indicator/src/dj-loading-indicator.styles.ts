import { css } from "lit";
export default css`
	:host { display: block; }
	:host([hidden]) { display: none; }

	.root.inactive { visibility: hidden; }

	/* Linear: indeterminate sliding bar */
	.linear {
		position: relative;
		overflow: hidden;
		width: 100%;
		height: var(--dj-loading-linear-height, 4px);
		background: var(--dj-color-primary-100, #dbeafe);
		border-radius: 9999px;
	}
	.linear .bar {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 40%;
		background: var(--dj-color-primary-600, #2563eb);
		border-radius: 9999px;
		animation: dj-linear 1.4s infinite ease-in-out;
	}
	@keyframes dj-linear {
		0% { left: -40%; }
		100% { left: 100%; }
	}

	/* Circular: rotating dashed ring */
	.circular { display: inline-flex; }
	.circular--small { width: var(--dj-input-height-small, 1.5rem); height: var(--dj-input-height-small, 1.5rem); }
	.circular--medium { width: var(--dj-input-height-medium, 2.5rem); height: var(--dj-input-height-medium, 2.5rem); }
	.circular--large { width: var(--dj-input-height-large, 3.5rem); height: var(--dj-input-height-large, 3.5rem); }
	.spinner { width: 100%; height: 100%; animation: dj-rotate 2s linear infinite; }
	.spinner .path {
		stroke: var(--dj-color-primary-600, #2563eb);
		stroke-linecap: round;
		animation: dj-dash 1.5s ease-in-out infinite;
	}
	@keyframes dj-rotate { 100% { transform: rotate(360deg); } }
	@keyframes dj-dash {
		0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
		50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
		100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
	}

	@media (prefers-reduced-motion: reduce) {
		.linear .bar, .spinner, .spinner .path { animation-duration: 4s; }
	}
`;
