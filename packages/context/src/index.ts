import { createContext } from "@lit/context";
import type { ReadableStore } from "@dojo-ng/store";

/** Re-export the Context Protocol primitives so consumers import them from one place. */
export { createContext, ContextProvider, ContextConsumer, consume, provide } from "@lit/context";

/**
 * The Dojo NG context-key registry: the single, typed source of truth for what can be
 * injected through the Context Protocol. Providers and consumers import the same key, so
 * they connect across packages. Keys use Symbol.for so identity is stable across bundles.
 */

/** The application's shared store handle. Consumers cast to their concrete state shape. */
export const storeContext = createContext<ReadableStore<unknown>>(Symbol.for("dj.store"));

/** Current BCP-47 locale string. */
export const localeContext = createContext<string>(Symbol.for("dj.locale"));
