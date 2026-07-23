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
const warnedNoViewBox = new Set<string>();

// A registered `<svg>` is stretched to fill the icon box, but an svg only scales
// its artwork when it carries a `viewBox`. One without gets a correctly-sized box
// with clipped or unscaled artwork. Match the opening `<svg>` tag and test it for
// the attribute — a string test, no DOM parse (the registry stores strings).
const SVG_OPEN_TAG = /<svg\b[^>]*>/i;
function hasViewBox(svg: string): boolean {
	const open = SVG_OPEN_TAG.exec(svg);
	return open ? /\bviewBox\s*=/i.test(open[0]) : false;
}

// Warn once per name when a registered icon lacks a viewBox. Warn only: the SVG is
// author-provided and trusted, so silently rewriting or auto-deriving a viewBox
// would be worse than telling the author.
function checkViewBox(name: string, svg: string): void {
	if (warnedNoViewBox.has(name) || hasViewBox(svg)) return;
	warnedNoViewBox.add(name);
	console.warn(`dj-icon: registered icon "${name}" has no viewBox; it will not scale`);
}

/** Register (or replace) one named icon with an inline SVG string. */
export function registerIcon(name: string, svg: string): void {
	checkViewBox(name, svg);
	registry.set(name, svg);
	listeners.forEach((l) => l());
}

/** Register several icons at once: `{ name: "<svg>…</svg>" }`. */
export function registerIcons(icons: Record<string, string>): void {
	for (const [name, svg] of Object.entries(icons)) {
		checkViewBox(name, svg);
		registry.set(name, svg);
	}
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
