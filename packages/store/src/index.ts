export { createStore } from "zustand/vanilla";
export { StoreController } from "./store-controller.js";
export type { ReadableStore } from "./types.js";

// Observable interop (websocket-spec.md T7 / rxjs-interop-note.md) — a bridge for callers who
// already have RxJS, zen-observable, or anything else speaking the Symbol.observable protocol.
// Not an endorsement of a reactive programming model for this library; nothing here requires or
// pulls in RxJS.
export { toObservable, fromObservable, observableSymbol, resolveObservable, toUnsubscribeFn } from "./observable.js";
export type { Observer, Subscription, ObservableLike, ObservableInput } from "./observable.js";
export { ObservableController } from "./observable-controller.js";
