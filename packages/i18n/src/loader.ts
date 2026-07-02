import type { Messages } from "./types.js";

/**
 * Source of message bundles. An app supplies an implementation to load translations however it
 * likes: bundled JSON, fetch, or an RPC service with its own cache. This is the decoupled
 * descendant of Holmes Corp's DYNLS: the library defines the contract, the app owns transport
 * and caching. Keep non-text data (config, flags, URLs) out of message bundles.
 */
export interface MessageLoader {
	/** Optional: the namespaces this loader can provide, for eager preloading. */
	namespaces?(): Promise<string[]>;
	/** Load one namespace for one locale. Resolve to `{}` when unavailable. */
	load(namespace: string, locale: string): Promise<Messages>;
}

/**
 * A loader backed by an in-memory map, for apps that bundle their messages at build time.
 * Shape: `{ [namespace]: { [locale]: Messages } }`.
 */
export function staticLoader(data: Record<string, Record<string, Messages>>): MessageLoader {
	return {
		async namespaces() {
			return Object.keys(data);
		},
		async load(namespace, locale) {
			return data[namespace]?.[locale] ?? {};
		},
	};
}

/**
 * A loader that fetches a JSON file per namespace and locale. `{ns}` and `{locale}` are
 * substituted into `pattern` (default `"/i18n/{ns}.{locale}.json"`). Caching and revalidation
 * are the app's concern: supply your own loader for DYNLS-style stale-while-revalidate.
 */
export function fetchLoader(pattern: string = "/i18n/{ns}.{locale}.json"): MessageLoader {
	return {
		async load(namespace, locale) {
			const url = pattern
				.replace("{ns}", encodeURIComponent(namespace))
				.replace("{locale}", encodeURIComponent(locale));
			const res = await fetch(url);
			if (!res.ok) return {};
			return (await res.json()) as Messages;
		},
	};
}
