import type { Messages, FormatParams } from "./types.js";
import type { MessageLoader } from "./loader.js";
import { format } from "./format.js";
import { localeChain, loadChain, getDefaultLocale } from "./locale.js";

/**
 * A registry of message bundles keyed by namespace then locale, with locale-fallback
 * resolution and an optional async loader. Components register their built-in English defaults;
 * apps register or lazily load translations for other locales.
 */
export class MessageStore {
	#bundles = new Map<string, Map<string, Messages>>(); // namespace -> locale (lowercased) -> messages
	#loader?: MessageLoader;
	#inflight = new Map<string, Promise<void>>();
	#version = 0;
	#listeners = new Set<() => void>();
	#notifyQueued = false;

	constructor(loader?: MessageLoader) {
		this.#loader = loader;
	}

	setLoader(loader: MessageLoader | undefined): void {
		this.#loader = loader;
	}

	/** A counter that increments whenever bundles change, for cheap change detection. */
	get version(): number {
		return this.#version;
	}

	/**
	 * Call `listener` after bundles change. Changes made in the same task are batched into one
	 * call. Returns an unsubscribe function. `LocaleController` uses this to re-render
	 * components when translations arrive after they first rendered.
	 */
	subscribe(listener: () => void): () => void {
		this.#listeners.add(listener);
		return () => {
			this.#listeners.delete(listener);
		};
	}

	#changed(): void {
		this.#version++;
		if (this.#notifyQueued || this.#listeners.size === 0) return;
		this.#notifyQueued = true;
		queueMicrotask(() => {
			this.#notifyQueued = false;
			for (const l of [...this.#listeners]) l();
		});
	}

	/** Add or merge messages for a namespace and locale. */
	register(namespace: string, locale: string, messages: Messages): void {
		let byLocale = this.#bundles.get(namespace);
		if (!byLocale) {
			byLocale = new Map();
			this.#bundles.set(namespace, byLocale);
		}
		const key = locale.toLowerCase();
		byLocale.set(key, { ...byLocale.get(key), ...messages });
		this.#changed();
	}

	has(namespace: string, locale: string): boolean {
		return this.#bundles.get(namespace)?.has(locale.toLowerCase()) ?? false;
	}

	/** Look up a key through the locale fallback chain. Returns undefined when not found. */
	get(namespace: string, locale: string, key: string): string | undefined {
		const byLocale = this.#bundles.get(namespace);
		if (!byLocale) return undefined;
		for (const l of localeChain(locale, getDefaultLocale())) {
			const msg = byLocale.get(l);
			if (msg && key in msg) return msg[key];
		}
		return undefined;
	}

	/** `get` plus `{placeholder}` interpolation. */
	resolve(namespace: string, locale: string, key: string, params?: FormatParams): string | undefined {
		const template = this.get(namespace, locale, key);
		return template === undefined ? undefined : format(template, params);
	}

	/**
	 * Lazily load a namespace through the loader for every locale in the fallback chain that is
	 * not registered yet, then register each one. `load("dj", "fr-CA")` asks the loader for
	 * `fr-CA`, then `fr`, then the default locale and `en` if they are missing. Each request is
	 * de-duplicated.
	 */
	async load(namespace: string, locale: string): Promise<void> {
		if (!this.#loader) return;
		const pending = loadChain(locale, getDefaultLocale())
			.filter((l) => !this.has(namespace, l))
			.map((l) => this.#loadOne(namespace, l));
		await Promise.all(pending);
	}

	#loadOne(namespace: string, locale: string): Promise<void> {
		const key = `${namespace}|${locale.toLowerCase()}`;
		let p = this.#inflight.get(key);
		if (!p && this.#loader) {
			p = this.#loader
				.load(namespace, locale)
				.then((messages) => {
					this.register(namespace, locale, messages);
				})
				.finally(() => {
					this.#inflight.delete(key);
				});
			this.#inflight.set(key, p);
		}
		return p ?? Promise.resolve();
	}
}

/** The default shared store. Components register their defaults here. */
export const messages = new MessageStore();

/**
 * Register a component's built-in default strings. They are stored under `en`, which is the
 * end of every lookup chain, so a component is always fully labeled even with no translations
 * loaded.
 */
export function registerDefaults(namespace: string, defaults: Messages): void {
	messages.register(namespace, "en", defaults);
}
