import { css } from "lit";
export default css`
	:host {
		display: block;
		color: var(--dj-color-text, #1f2937);
		font-family: var(--dj-font-family, system-ui, sans-serif);
	}
	:host([hidden]) { display: none; }
	.region { display: block; }
	.track { display: flex; align-items: center; gap: 0.25rem; }
	/* The item strip: a native horizontal scroller with mandatory x snap. Touch/trackpad
	   swiping is real scrolling; the reducedMotion snippet flips scroll-behavior to auto. */
	.viewport {
		display: flex;
		flex: 1 1 auto;
		min-inline-size: 0;
		gap: var(--dj-carousel-gap, 1rem);
		overflow-x: auto;
		overflow-y: hidden;
		scroll-snap-type: x mandatory;
		scroll-behavior: smooth;
		scrollbar-width: none;
	}
	.viewport::-webkit-scrollbar { display: none; }
	.viewport:focus-visible { outline: var(--dj-focus-ring, 2px solid); outline-offset: 2px; }
	/* Each slotted item takes 1/per-view of the viewport (gap-adjusted) and snaps at its start.
	   --dj-carousel-basis is set on the host, whose light-DOM children the items are. */
	::slotted(*) {
		flex: 0 0 var(--dj-carousel-basis, 100%);
		min-inline-size: 0;
		scroll-snap-align: start;
	}
	.nav {
		flex: 0 0 auto;
		min-inline-size: 24px;
		min-block-size: 24px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--dj-color-border, #d1d5db);
		border-radius: var(--dj-input-border-radius, 0.25rem);
		background: var(--dj-color-background, #fff);
		color: inherit;
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
	}
	.nav:disabled { opacity: 0.4; cursor: not-allowed; }
	.nav:focus-visible { outline: var(--dj-focus-ring, 2px solid); outline-offset: 2px; }
	.dots { display: flex; justify-content: center; gap: 0.4rem; padding-block-start: 0.5rem; }
	.dot {
		inline-size: 0.6rem;
		block-size: 0.6rem;
		padding: 0;
		border: 1px solid var(--dj-color-border, #9ca3af);
		border-radius: 50%;
		background: transparent;
		cursor: pointer;
	}
	.dot--active { background: var(--dj-color-primary-600, #2563eb); border-color: var(--dj-color-primary-600, #2563eb); }
	.dot:focus-visible { outline: var(--dj-focus-ring, 2px solid); outline-offset: 2px; }
	/* Forced colors: keep controls perceivable; the active dot uses the system highlight. */
	@media (forced-colors: active) {
		.nav { border-color: ButtonText; }
		.nav:disabled { opacity: 1; color: GrayText; border-color: GrayText; }
		.dot { border-color: ButtonText; }
		.dot--active { background: Highlight; border-color: Highlight; }
	}
`;
