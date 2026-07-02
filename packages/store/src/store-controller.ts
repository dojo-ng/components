import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { ReadableStore } from "./types.js";

/**
 * A Lit reactive controller that re-renders its host when a slice of an external store
 * changes. Pass a selector to subscribe to just the slice you need; the host updates only
 * when the selected value changes (compared with Object.is).
 *
 * ```ts
 * #count = new StoreController(this, store, (s) => s.count);
 * render() { return html`${this.#count.value}`; }
 * ```
 */
export class StoreController<T, S = T> implements ReactiveController {
	private host: ReactiveControllerHost;
	private store: ReadableStore<T>;
	private selector: (state: T) => S;
	private unsubscribe?: () => void;
	private last: S;

	value: S;

	constructor(
		host: ReactiveControllerHost,
		store: ReadableStore<T>,
		selector: (state: T) => S = (state) => state as unknown as S,
	) {
		this.host = host;
		this.store = store;
		this.selector = selector;
		this.value = selector(store.getState());
		this.last = this.value;
		host.addController(this);
	}

	hostConnected() {
		this.value = this.selector(this.store.getState());
		this.last = this.value;
		this.unsubscribe = this.store.subscribe(() => {
			const next = this.selector(this.store.getState());
			if (!Object.is(next, this.last)) {
				this.last = next;
				this.value = next;
				this.host.requestUpdate();
			}
		});
	}

	hostDisconnected() {
		this.unsubscribe?.();
		this.unsubscribe = undefined;
	}
}
