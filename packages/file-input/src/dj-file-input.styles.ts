import { css } from "lit";

export default css`
	:host { display: block; }
	:host([hidden]) { display: none; }
	.label { margin-bottom: var(--dj-spacing-2x-small, 0.25rem); }
	.dropzone {
		display: flex;
		align-items: center;
		gap: var(--dj-spacing-small, 0.75rem);
		padding: var(--dj-spacing-medium, 1rem);
		border: 1px dashed var(--dj-color-border, #d1d5db);
		border-radius: var(--dj-input-border-radius-medium, 0.25rem);
		background: var(--dj-color-background, #fff);
		transition: border-color var(--dj-transition-x-fast, 100ms), background var(--dj-transition-x-fast, 100ms);
	}
	.dropzone.is-drag {
		border-color: var(--dj-color-primary-600, #2563eb);
		background: var(--dj-color-primary-50, #eff6ff);
	}
	.dropzone:focus { outline: none; }
	.dropzone:focus-visible {
		outline: var(--dj-focus-ring, 2px solid currentColor);
		outline-offset: var(--dj-focus-ring-offset, 2px);
	}
	.hint { color: var(--dj-color-text-muted, #6b7280); font-size: var(--dj-font-size-small, 0.875rem); }
	.native { display: none; }

	.list { list-style: none; margin: var(--dj-spacing-small, 0.75rem) 0 0; padding: 0; }
	.item {
		display: flex;
		align-items: center;
		gap: var(--dj-spacing-x-small, 0.5rem);
		padding: var(--dj-spacing-2x-small, 0.25rem) 0;
	}
	.name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.size { color: var(--dj-color-text-muted, #6b7280); font-size: var(--dj-font-size-small, 0.875rem); }

	:host([disabled]) .dropzone { opacity: 0.5; pointer-events: none; }

	@media (forced-colors: active) {
		.dropzone.is-drag { outline: 2px solid Highlight; }
	}
`;
