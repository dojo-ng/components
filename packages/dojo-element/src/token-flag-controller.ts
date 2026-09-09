import type { ReactiveController, ReactiveControllerHost } from "lit";

/**
 * Reads a boolean flag off a `--dj-*` custom property and keeps it current.
 * The property's computed value trims to `"1"` for true — anything else,
 * including an unregistered read of `""`, is false. Re-reads on host resize
 * via `ResizeObserver`; call `refresh()` for a flip that comes with no
 * resize (a runtime pin, a theme switch, a viewport media query crossing
 * while the host's own width is unchanged), since `ResizeObserver` only
 * sees size changes.
 *
 * Two reads, in order, and the order is the contract:
 *
 * 1. The HOST's own computed value. Non-empty means a consumer set the token —
 *    a pin on the element, a `:root` theme token inherited down, or a consumer's
 *    own `@container`/`@media` rule targeting the element. That value wins
 *    unconditionally.
 * 2. Otherwise the host's `::before` pseudo-element, where the component's OWN
 *    default and self-referential `@container` override live.
 *
 * Why `::before` (confirmed 2026-09-09, 3-browser repro): the CSS Containment spec
 * forbids a container query from being satisfied by the container it evaluates
 * against, even from inside that element's shadow tree, so `@container (…) { :host
 * {…} }` never matches when `:host` is the container. `::before` is a real descendant
 * box for containment, so the same rule on `:host::before` resolves.
 *
 * Why two reads instead of one: once the component's rules live on `::before`, a
 * consumer's pin on the host cannot beat them there — the pseudo-element's own
 * declaration always wins over anything it would inherit, and no cascade
 * arrangement makes an unconditional rule from the outer tree beat a conditional
 * one on a different element. Reading the host first restores "a pin always wins".
 * The host read is only honest if an unset token really reads `""`, which is why the
 * token must NOT be registered with `@property` — a registered `initial-value` makes
 * "unset" and "set to the default" indistinguishable.
 *
 * A component using this controller therefore: declares its default and its
 * `@container` override on `:host::before` (with `content: ""` so the pseudo-element
 * exists; `display: none` is fine), leaves the token unregistered, and never
 * declares the token on `:host` itself.
 */
export class TokenFlagController implements ReactiveController {
	private host: ReactiveControllerHost & HTMLElement;
	private property: string;
	private observer?: ResizeObserver;
	private frame = 0;

	value = false;

	constructor(host: ReactiveControllerHost & HTMLElement, property: string) {
		this.host = host;
		this.property = property;
		host.addController(this);
	}

	hostConnected(): void {
		this.value = this.read();
		// Deferred by one frame, deliberately. A flip re-renders the host, and the new
		// arrangement usually has a different BLOCK size; ResizeObserver observes the whole
		// content box, so a render committed inside its own delivery (Lit updates in a
		// microtask, which runs before the observer loop finishes) queues a new observation
		// at the same depth and the browser reports "ResizeObserver loop completed with
		// undelivered notifications" — benign, but a real error event that a test runner's
		// window.onerror turns into a failure. Re-reading in the next animation frame keeps
		// the render out of the observer's delivery loop. The synchronous read above is what
		// makes the FIRST render correct; this only paces later flips.
		this.observer = new ResizeObserver(() => {
			if (this.frame) return;
			this.frame = requestAnimationFrame(() => {
				this.frame = 0;
				this.refresh();
			});
		});
		this.observer.observe(this.host);
	}

	hostDisconnected(): void {
		this.observer?.disconnect();
		this.observer = undefined;
		if (this.frame) cancelAnimationFrame(this.frame);
		this.frame = 0;
	}

	/**
	 * Re-read the token now and request an update if the value flipped.
	 * Documented and public because `ResizeObserver` cannot see a property
	 * change that comes with no resize.
	 */
	refresh(): void {
		const next = this.read();
		if (next !== this.value) {
			this.value = next;
			this.host.requestUpdate();
		}
	}

	private read(): boolean {
		const own = getComputedStyle(this.host).getPropertyValue(this.property).trim();
		if (own !== "") return own === "1";
		return getComputedStyle(this.host, "::before").getPropertyValue(this.property).trim() === "1";
	}
}
