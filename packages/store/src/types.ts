/**
 * Minimal read contract the StoreController depends on. Any external store that exposes
 * `getState` and `subscribe` satisfies it (Zustand vanilla, Valtio, Nano Stores via a
 * tiny adapter), so the components are never tied to a specific store library.
 */
export interface ReadableStore<T> {
	getState(): T;
	subscribe(listener: (state: T, previous: T) => void): () => void;
}
