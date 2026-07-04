import { css } from "lit";

export default css`
	:host {
		display: block;
	}
	.bar {
		display: flex;
		align-items: center;
		gap: var(--dj-spacing-small, 0.75rem);
		padding: var(--dj-spacing-x-small, 0.5rem);
	}
	.seek {
		flex: 1 1 auto;
		min-width: 4rem;
	}
	.time {
		flex: 0 0 auto;
		font-variant-numeric: tabular-nums;
		font-size: var(--dj-font-size-small, 0.875rem);
		color: var(--dj-color-text-secondary, currentColor);
		white-space: nowrap;
	}
	audio {
		display: none;
	}
`;
