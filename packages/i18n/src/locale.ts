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

const normalized = new Map<string, string | undefined>();

/**
 * Clean up a locale tag so `Intl` accepts it: trims it, turns `_` into `-` (`en_US` ->
 * `en-US`), and canonicalizes the case. Returns `undefined` for an empty or invalid tag.
 */
export function normalizeLocale(tag: string | null | undefined): string | undefined {
	if (!tag) return undefined;
	if (normalized.has(tag)) return normalized.get(tag);
	let out: string | undefined;
	try {
		out = Intl.getCanonicalLocales(tag.trim().replace(/_/g, "-"))[0];
	} catch {
		out = undefined;
	}
	normalized.set(tag, out);
	return out;
}

/**
 * The effective locale for an element: the `lang` of the nearest ancestor that sets one,
 * climbing the composed tree (out of each shadow root via its host), then the document's
 * `lang`, then the configured default. The tag is normalized (`en_US` -> `en-US`); an invalid
 * `lang` is skipped as if it were not set.
 */
export function getLocale(el?: Element | null): string {
	let node: Node | null = el ?? null;
	while (node) {
		if (node instanceof Element) {
			const lang = normalizeLocale(node.getAttribute("lang"));
			if (lang) return lang;
		}
		const parent: Node | null = node.parentNode;
		node = parent instanceof ShadowRoot ? parent.host : parent;
	}
	const docLang = typeof document !== "undefined" ? normalizeLocale(document.documentElement.getAttribute("lang")) : undefined;
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

/** A tag and its shorter prefixes, stopping before any extension: `zh-Hant-TW` -> `zh-Hant-TW`, `zh-Hant`, `zh`. */
function prefixes(locale: string): string[] {
	const parts = locale.replace(/_/g, "-").split("-");
	const ext = parts.findIndex((p, i) => i > 0 && p.length === 1);
	const base = ext === -1 ? parts : parts.slice(0, ext);
	const out: string[] = [];
	for (let i = base.length; i > 0; i--) out.push(base.slice(0, i).join("-"));
	return out;
}

/**
 * The lookup chain with the original case kept, for loaders whose file names are
 * case-sensitive. De-duplicated case-insensitively.
 */
export function loadChain(locale: string, fallback: string = defaultLocale): string[] {
	const chain: string[] = [];
	const seen = new Set<string>();
	for (const l of [...prefixes(locale), ...prefixes(fallback), "en"]) {
		const n = l.toLowerCase();
		if (n && !seen.has(n)) {
			seen.add(n);
			chain.push(l);
		}
	}
	return chain;
}

/**
 * Ordered lookup chain for a locale: the locale and each shorter prefix of it, then the same for
 * the default locale, and finally `en` (the language of every built-in component string). Values
 * are lower-cased and de-duplicated. Example: `fr-CA` with default `en` -> ["fr-ca", "fr", "en"];
 * `zh-Hant-TW` -> ["zh-hant-tw", "zh-hant", "zh", "en"].
 */
export function localeChain(locale: string, fallback: string = defaultLocale): string[] {
	return loadChain(locale, fallback).map((l) => l.toLowerCase());
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
