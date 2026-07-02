/**
 * Locale and direction resolution from the platform-native `lang`/`dir` attributes, plus a
 * shared change notifier. No provider element is required: a component reads the `lang` of its
 * nearest ancestor that sets one.
 */

let defaultLocale = "en";

/** Set the fallback locale used when no `lang` is found and as the end of the lookup chain. */
export function setDefaultLocale(locale: string): void {
	defaultLocale = locale || "en";
}

export function getDefaultLocale(): string {
	return defaultLocale;
}

/**
 * The effective locale for an element: the `lang` of the nearest ancestor that sets one,
 * climbing the composed tree (out of each shadow root via its host), then the document's
 * `lang`, then the configured default.
 */
export function getLocale(el?: Element | null): string {
	let node: Node | null = el ?? null;
	while (node) {
		if (node instanceof Element) {
			const lang = node.getAttribute("lang");
			if (lang) return lang;
		}
		const parent: Node | null = node.parentNode;
		node = parent instanceof ShadowRoot ? parent.host : parent;
	}
	const docLang = typeof document !== "undefined" ? document.documentElement.getAttribute("lang") : null;
	return docLang || defaultLocale;
}

/** The effective text direction for an element, climbing `dir` the same way as `getLocale`. */
export function getDir(el?: Element | null): "ltr" | "rtl" {
	let node: Node | null = el ?? null;
	while (node) {
		if (node instanceof Element) {
			const dir = node.getAttribute("dir");
			if (dir === "rtl" || dir === "ltr") return dir;
		}
		const parent: Node | null = node.parentNode;
		node = parent instanceof ShadowRoot ? parent.host : parent;
	}
	const docDir = typeof document !== "undefined" ? document.documentElement.getAttribute("dir") : null;
	return docDir === "rtl" ? "rtl" : "ltr";
}

/**
 * Ordered lookup chain for a locale: the locale, its base language, the default locale, the
 * default's base, and finally `en` (the language of every built-in component string). Values
 * are lower-cased and de-duplicated. Example: `fr-CA` with default `en` ->
 * ["fr-ca", "fr", "en"]; `en-US` -> ["en-us", "en"].
 */
export function localeChain(locale: string, fallback: string = defaultLocale): string[] {
	const chain: string[] = [];
	const add = (l: string) => {
		const n = l.toLowerCase();
		if (n && !chain.includes(n)) chain.push(n);
	};
	add(locale);
	add(locale.split("-")[0]);
	add(fallback);
	add(fallback.split("-")[0]);
	add("en");
	return chain;
}

// --- locale-change notification (one shared observer for all subscribers) ---

type Listener = () => void;
const listeners = new Set<Listener>();
let observer: MutationObserver | undefined;

function ensureObserver(): void {
	if (observer || typeof MutationObserver === "undefined" || typeof document === "undefined") return;
	observer = new MutationObserver(() => listeners.forEach((l) => l()));
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"], subtree: true });
}

/**
 * Subscribe to `lang`/`dir` changes in the light DOM. One shared `MutationObserver` serves
 * every subscriber. Returns an unsubscribe function. Changes to `lang`/`dir` set inside a
 * shadow root are not observed (observers do not cross shadow boundaries); set them in light
 * DOM, which is the common case.
 */
export function onLocaleChange(listener: Listener): () => void {
	ensureObserver();
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
		// Tear down the shared observer once nothing is listening; ensureObserver re-creates it
		// on the next subscribe.
		if (listeners.size === 0 && observer) {
			observer.disconnect();
			observer = undefined;
		}
	};
}
