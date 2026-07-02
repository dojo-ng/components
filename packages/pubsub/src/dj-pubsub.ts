import { createStore } from "zustand/vanilla";
import type { ReadableStore } from "@dojo-ng/store";

interface Entry { value: unknown; seq: number; }
type Topics = Record<string, Entry>;

export interface SubscribeOptions {
	/** Deliver the topic's current (last published) value immediately on subscribe. Default true. */
	replay?: boolean;
}

/**
 * A familiar publish/subscribe facade backed by an external store. Most pub/sub usage is
 * really "last value wins" shared state, so this retains the last payload per topic and
 * replays it to late subscribers by default — which is what callers usually expect. Every
 * `publish` notifies current subscribers, even if the payload is unchanged.
 *
 * The underlying state lives in `store`, so the same data can also be read through the
 * store/context machinery (StoreController, the context registry) when wanted.
 */
export interface PubSub {
	publish<T = unknown>(topic: string, payload: T): void;
	subscribe<T = unknown>(topic: string, handler: (payload: T) => void, options?: SubscribeOptions): () => void;
	/** The last payload published to a topic, or undefined. */
	getLast<T = unknown>(topic: string): T | undefined;
	/** The backing store, for integration with StoreController/context. */
	readonly store: ReadableStore<Topics>;
}

export function createPubSub(): PubSub {
	const store = createStore<Topics>(() => ({}));
	const listeners = new Map<string, Set<(value: unknown) => void>>();
	let previous = store.getState();

	store.subscribe((state) => {
		for (const topic of Object.keys(state)) {
			if (state[topic] !== previous[topic]) {
				const set = listeners.get(topic);
				if (set) for (const handler of [...set]) handler(state[topic].value);
			}
		}
		previous = state;
	});

	return {
		store,
		publish(topic, payload) {
			store.setState((state) => ({
				...state,
				[topic]: { value: payload, seq: (state[topic]?.seq ?? 0) + 1 },
			}));
		},
		subscribe(topic, handler, options) {
			const replay = options?.replay ?? true;
			let set = listeners.get(topic);
			if (!set) listeners.set(topic, (set = new Set()));
			const h = handler as (value: unknown) => void;
			set.add(h);
			if (replay && topic in store.getState()) {
				h(store.getState()[topic].value);
			}
			return () => { set!.delete(h); };
		},
		getLast(topic) {
			return store.getState()[topic]?.value as never;
		},
	};
}
