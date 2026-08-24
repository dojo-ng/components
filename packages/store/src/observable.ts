// Observable interop (websocket-spec.md T7 / rxjs-interop-note.md). Written against the observable
// PROTOCOL — anything tagged `[Symbol.observable]` returning a `.subscribe(observer)` — not against
// RxJS itself. No RxJS dependency anywhere here; the whole point is that RxJS, zen-observable, and
// anything else speaking the protocol all interop for free, and nothing using none of them pays a
// cost. Document these as interop, explicitly: this is not an endorsement of a reactive programming
// model for the library, just a bridge for callers who already have one.
//
// `Symbol.observable` was never added to JS's own `Symbol` object — it stayed a de-facto interop
// convention from the withdrawn tc39 proposal. RxJS itself falls back to the string key
// `"@@observable"` when `Symbol.observable` isn't present on the global `Symbol`, and this matches
// that fallback exactly (verified against a real RxJS `from()` in test/observable.test.js) — using
// anything else here would silently break interop with the one library this exists to interop with.
import type { ReadableStore } from "./types.js";

export const observableSymbol: symbol | string =
	(typeof Symbol === "function" && (Symbol as { observable?: symbol }).observable) || "@@observable";

export interface Observer<T> {
	next?(value: T): void;
	error?(err: unknown): void;
	complete?(): void;
}

export interface Subscription {
	unsubscribe(): void;
}

export interface ObservableLike<T> {
	subscribe(observer: Observer<T> | ((value: T) => void)): Subscription | (() => void);
}

/**
 * Anything speaking the protocol directly, or tagged at the observable-symbol key. TypeScript
 * can't express "has a property at exactly this runtime-computed key" precisely (the key is a
 * `string | symbol` union, not a `unique symbol` literal, since it may not exist on the real
 * `Symbol` object) — this is the same loose-typing-at-the-interop-boundary tradeoff RxJS's own
 * source makes for the identical reason, confined to this one type and `resolveObservable` below.
 */
export type ObservableInput<T> = ObservableLike<T> | Record<string | symbol, unknown>;

/** Unwraps the observable-symbol tag if present, otherwise assumes `input` already speaks the protocol directly. */
export function resolveObservable<T>(input: ObservableInput<T>): ObservableLike<T> {
	const getter = (input as Record<string | symbol, unknown>)[observableSymbol];
	return typeof getter === "function" ? (getter.call(input) as ObservableLike<T>) : (input as ObservableLike<T>);
}

/** Normalizes a subscribe() return value (a plain cleanup function or a `{unsubscribe}` object) to a call. */
export function toUnsubscribeFn(result: Subscription | (() => void)): () => void {
	return typeof result === "function" ? result : () => result.unsubscribe();
}

/**
 * A protocol-tagged observable view of `store`: emits the current state immediately on subscribe
 * (a store is current state, not a bare event stream — same "replay latest" expectation as
 * `StoreController`), then every subsequent state change. Consumable by any protocol-aware
 * library's `from()` (RxJS's included) with no adapter, since this only implements the protocol.
 */
export function toObservable<T>(store: ReadableStore<T>): ObservableLike<T> {
	const observable: ObservableLike<T> & Record<string | symbol, unknown> = {
		subscribe(observerOrNext: Observer<T> | ((value: T) => void)): Subscription {
			const observer: Observer<T> = typeof observerOrNext === "function" ? { next: observerOrNext } : observerOrNext;
			observer.next?.(store.getState());
			const unsubscribe = store.subscribe((state) => observer.next?.(state));
			return { unsubscribe };
		},
	};
	observable[observableSymbol] = () => observable;
	return observable;
}

/**
 * A `ReadableStore` kept in sync with any protocol-observable `input` — RxJS, zen-observable, or
 * `toObservable`'s own output. `initial` is required: a bare Observable has no synchronous "current
 * value" until it emits at least once, and `ReadableStore.getState()` must always return something.
 * The result plugs directly into `StoreController` and the context registry, same as any other
 * `ReadableStore`.
 */
export function fromObservable<T>(input: ObservableInput<T>, initial: T): ReadableStore<T> {
	let state = initial;
	const subscribers = new Set<(state: T, previous: T) => void>();

	resolveObservable(input).subscribe({
		next(value) {
			const previous = state;
			state = value;
			for (const listener of [...subscribers]) listener(state, previous);
		},
	});

	return {
		getState() {
			return state;
		},
		subscribe(listener) {
			subscribers.add(listener);
			return () => {
				subscribers.delete(listener);
			};
		},
	};
}
