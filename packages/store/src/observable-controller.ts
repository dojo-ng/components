import type { ReactiveController, ReactiveControllerHost } from "lit";
import { resolveObservable, toUnsubscribeFn, type ObservableInput } from "./observable.js";

/**
 * A Lit reactive controller that re-renders its host on every value from a protocol-observable —
 * RxJS, zen-observable, or `toObservable`'s own output. Same lifecycle shape as `StoreController`
 * and `LocaleController`: subscribes on `hostConnected`, unsubscribes on `hostDisconnected`.
 * Interop, like the rest of this module — using it doesn't require, or endorse, RxJS or any other
 * reactive library.
 *
 * ```ts
 * #position = new ObservableController(this, fromEvent(el, "pointermove"), { x: 0, y: 0 });
 * render() { return html`${this.#position.value.x}, ${this.#position.value.y}`; }
 * ```
 */
export class ObservableController<T> implements ReactiveController {
	private host: ReactiveControllerHost;
	private input: ObservableInput<T>;
	private unsubscribe?: () => void;

	value: T;

	constructor(host: ReactiveControllerHost, input: ObservableInput<T>, initial: T) {
		this.host = host;
		this.input = input;
		this.value = initial;
		host.addController(this);
	}

	hostConnected(): void {
		const result = resolveObservable(this.input).subscribe({
			next: (value: T) => {
				this.value = value;
				this.host.requestUpdate();
			},
		});
		this.unsubscribe = toUnsubscribeFn(result);
	}

	hostDisconnected(): void {
		this.unsubscribe?.();
		this.unsubscribe = undefined;
	}
}
