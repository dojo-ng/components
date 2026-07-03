import { css } from "lit";
export default css`
	:host { display: block; }
	:host([hidden]) { display: none; }
	.board {
		display: flex;
		align-items: flex-start;
		gap: var(--dj-board-gap, 1rem);
		overflow-x: auto;
		padding-block-end: var(--dj-spacing-x-small, .5rem);
	}
	.lane {
		flex: 0 0 var(--dj-board-lane-width, 18rem);
		display: flex;
		flex-direction: column;
		max-height: 100%;
		background: var(--dj-color-neutral-50, #f9fafb);
		border: 1px solid var(--dj-color-border, #d1d5db);
		border-radius: var(--dj-input-border-radius-medium, .25rem);
	}
	.lane-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--dj-spacing-x-small, .5rem);
		padding: var(--dj-spacing-x-small, .5rem) var(--dj-spacing-small, .75rem);
		font-weight: var(--dj-font-weight-semibold, 600);
		border-bottom: 1px solid var(--dj-color-border, #d1d5db);
	}
	.lane-count { color: var(--dj-color-text-muted, #6b7280); font-size: var(--dj-font-size-small, .875rem); }
	.lane--over .lane-count { color: var(--dj-color-danger-600, #dc2626); }
	.lane-body {
		display: flex;
		flex-direction: column;
		gap: var(--dj-spacing-x-small, .5rem);
		padding: var(--dj-spacing-x-small, .5rem);
		overflow-y: auto;
		min-height: 2.5rem;
	}
	.card { display: flex; align-items: flex-start; gap: .25rem; }
	.card-content { flex: 1; min-width: 0; }
	.move-btn {
		min-width: 24px;
		min-height: 24px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 0;
		background: none;
		cursor: pointer;
		padding: 0;
		font: inherit;
		color: var(--dj-color-text-muted, #6b7280);
		border-radius: var(--dj-input-border-radius-medium, .25rem);
	}
	.move-btn:hover { color: var(--dj-color-text, #1f2937); background: var(--dj-color-neutral-100, #f3f4f6); }
	.move-btn:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: var(--dj-focus-ring-offset, 1px); }
	.card { border-radius: var(--dj-input-border-radius-medium, .25rem); }
	.card:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: var(--dj-focus-ring-offset, 1px); }
	.announce {
		position: absolute;
		width: 1px; height: 1px;
		margin: -1px; padding: 0; border: 0;
		clip-path: inset(50%);
		overflow: hidden;
		white-space: nowrap;
	}
	@media (forced-colors: active) {
		.lane, .card { border: 1px solid CanvasText; }
		.move-btn:focus-visible { outline: 2px solid Highlight; }
	}
`;
