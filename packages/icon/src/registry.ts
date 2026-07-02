/**
 * A tiny SVG icon registry for `<dj-icon type="name">`.
 *
 * The app registers named inline SVGs once (typically at startup); any `<dj-icon>`
 * with a matching `type` then renders that SVG inside its shadow root. This
 * replaces the old icon-font `class` approach, which could never work because the
 * class lived in the shadow root where page `@font-face`/`::before` CSS can't
 * reach. Inline `<svg>` slotted into `<dj-icon>` still works and needs no registry.
 *
 * The registered SVG is author-provided and trusted (it is rendered with Lit's
 * `unsafeHTML`), exactly like a hand-written inline `<svg>`. Do not register
 * SVG strings from untrusted sources.
 */
const registry = new Map<string, string>();
const listeners = new Set<() => void>();

/** Register (or replace) one named icon with an inline SVG string. */
export function registerIcon(name: string, svg: string): void {
	registry.set(name, svg);
	listeners.forEach((l) => l());
}

/** Register several icons at once: `{ name: "<svg>…</svg>" }`. */
export function registerIcons(icons: Record<string, string>): void {
	for (const [name, svg] of Object.entries(icons)) registry.set(name, svg);
	listeners.forEach((l) => l());
}

/** The registered SVG string for `name`, or undefined. */
export function getIcon(name: string): string | undefined {
	return registry.get(name);
}

/** Whether `name` is registered. */
export function hasIcon(name: string): boolean {
	return registry.has(name);
}

/** Subscribe to registry changes (so already-rendered icons pick up a late
 *  registration). Returns an unsubscribe function. */
export function onIconsChanged(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}
