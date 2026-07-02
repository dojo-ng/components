import { css } from "lit";
export default css`
	:host { display: contents; }
	.underlay {
		position: fixed; inset: 0; z-index: var(--dj-slide-pane-underlay-z-index, 930);
		background: transparent; transition: background var(--dj-transition-fast, 150ms);
	}
	.underlay--visible { background: var(--dj-overlay-background-color, rgb(0 0 0 / 0.45)); }
	.pane {
		position: fixed; z-index: var(--dj-slide-pane-z-index, 931);
		display: flex; flex-direction: column;
		background: var(--dj-color-background, #fff); color: var(--dj-color-text, #1f2937);
		box-shadow: 0 0 40px rgb(0 0 0 / 0.3);
		transition: transform var(--dj-transition-fast, 150ms) ease;
	}
	/* Edge placement + closed transform (open => translate to 0 via .pane--open) */
	.pane--left { top: 0; bottom: 0; left: 0; width: var(--dj-slide-pane-size, 320px); transform: translateX(-100%); }
	.pane--right { top: 0; bottom: 0; right: 0; width: var(--dj-slide-pane-size, 320px); transform: translateX(100%); }
	.pane--top { left: 0; right: 0; top: 0; height: var(--dj-slide-pane-size, 320px); transform: translateY(-100%); }
	.pane--bottom { left: 0; right: 0; bottom: 0; height: var(--dj-slide-pane-size, 320px); transform: translateY(100%); }
	.pane--open { transform: none; }
	.title { display: flex; align-items: center; justify-content: space-between; gap: var(--dj-spacing-small, 0.75rem); padding: var(--dj-spacing-medium, 1rem); border-bottom: 1px solid var(--dj-color-border, #d1d5db); }
	.title__text { font-weight: var(--dj-font-weight-semibold, 600); }
	.close { display: inline-flex; align-items: center; justify-content: center; border: none; background: transparent; cursor: pointer; color: var(--dj-color-text-muted, #6b7280); width: 1.75rem; height: 1.75rem; border-radius: var(--dj-input-border-radius-small, 0.1875rem); }
	.close:hover { background: var(--dj-color-neutral-100, #f3f4f6); color: var(--dj-color-text, #1f2937); }
	.close:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: var(--dj-focus-ring-offset, 2px); }
	.content { padding: var(--dj-spacing-medium, 1rem); overflow: auto; flex: 1 1 auto; }
	/* Forced colors: the scrim becomes opaque and the shadow vanishes, so border the pane to
	   separate it from the page behind. */
	@media (forced-colors: active) { .pane { border: 1px solid CanvasText; } }
`;
