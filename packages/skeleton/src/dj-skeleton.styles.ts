import { css } from "lit";
export default css`
	:host {
		display: block;
		/* Shape and size come from consumer CSS on the host; these are only defaults.
		   A circle avatar is border-radius: 50% on the host. */
		block-size: 1em;
		border-radius: var(--dj-skeleton-radius, var(--dj-input-border-radius-small, 0.1875rem));
		background: var(--dj-skeleton-color, var(--dj-color-neutral-200, #e5e7eb));
		overflow: hidden;
	}
	:host([hidden]) { display: none; }
	.base {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		position: relative;
		overflow: hidden;
		border-radius: inherit;
	}
	/* The sheen is a light band sweeping across the placeholder; only when effect=sheen. */
	:host([effect="sheen"]) .base::after {
		content: "";
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			transparent,
			var(--dj-skeleton-sheen-color, rgb(255 255 255 / 0.55)),
			transparent
		);
		transform: translateX(-100%);
		animation: dj-skeleton-sheen 1.5s ease-in-out infinite;
	}
	@keyframes dj-skeleton-sheen {
		100% { transform: translateX(100%); }
	}
`;
