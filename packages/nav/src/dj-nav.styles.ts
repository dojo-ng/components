import { css } from "lit";

/* --dj-nav-collapsed is deliberately NOT registered with @property. TokenFlagController reads the
   host first and falls back to ::before only when the host reads "" (unset); a registered
   initial-value would make the host always read "0" and the component's own container query
   below would never be consulted. See token-flag-controller.ts. */

export default css`
	:host {
		display: block;
		position: relative;
		container-type: inline-size;
		color: var(--dj-color-text, #1f2937);
		font-family: var(--dj-font-family, system-ui, sans-serif);
	}
	/* The component's OWN default and container-query override live on ::before, not on :host:
	   the CSS Containment spec forbids a container query from being satisfied by the container
	   it evaluates against, even from within that container's own shadow tree, so a rule
	   targeting ":host" can never read the size ":host" itself established (confirmed
	   2026-09-09 across Chromium/Firefox/Webkit). ::before is a genuine descendant box for
	   containment purposes, so it reads :host's container correctly.
	   A consumer's value — a pin on the element, a :root token, or the consumer's own
	   @container/@media rule targeting <dj-nav> — lands on the HOST, and TokenFlagController
	   reads the host first, so it always wins over these rules. Never declare
	   --dj-nav-collapsed on :host here: that would read as a consumer value and pin every
	   instance. */
	:host::before {
		content: "";
		display: none;
		--dj-nav-collapsed: 1;
	}
	@container (min-width: 45rem) {
		:host::before { --dj-nav-collapsed: 0; }
	}
	@supports not (container-type: inline-size) {
		@media (min-width: 45rem) {
			:host::before { --dj-nav-collapsed: 0; }
		}
	}
	:host([hidden]) { display: none; }
	/* Structural only — a template with two bare root-level dynamic children and no static
	   wrapper fails to commit under this Lit/happy-dom combination, so this wrapper exists
	   purely to work around that; contents keeps it out of layout. */
	.collapsed { display: contents; }
	.nav {
		display: flex;
		align-items: center;
		gap: var(--dj-nav-gap, 1rem);
	}
	.trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-inline-size: 24px;
		min-block-size: 24px;
		padding: 0;
		border: none;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}
	.trigger svg { fill: currentColor; }
	.trigger:focus-visible {
		outline: var(--dj-focus-ring, 2px solid);
		outline-offset: 2px;
	}
	/* dropdown/overlay: no dedicated sub-component, so the positioning lives here. Neither
	   needs dj-popup/dj-dropdown — there is no anchor-tracking problem for a panel that spans
	   the host's inline size. */
	.panel--dropdown {
		position: absolute;
		inset-inline: 0;
		top: 100%;
		z-index: 20;
		background: var(--dj-color-background, #fff);
		border: 1px solid var(--dj-color-border, #d1d5db);
	}
	.panel--overlay {
		position: fixed;
		inset: 0;
		z-index: 20;
		background: var(--dj-color-background, #fff);
	}
	.panel--dropdown .nav,
	.panel--overlay .nav {
		flex-direction: column;
		align-items: stretch;
		padding: 1rem;
	}
	@media (forced-colors: active) {
		.trigger { outline: 1px solid ButtonText; }
		.panel--dropdown { border-color: CanvasText; }
	}
`;
