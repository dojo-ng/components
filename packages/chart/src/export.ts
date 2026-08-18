import { resolveVar } from "./core.js";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Mirrors dj-chart.styles.ts's presentational rules for the elements a STANDALONE export needs:
 * color, stroke-width, opacity, and font-size for parts styled entirely through the adopted
 * stylesheet's class selectors — never present as attributes on the live DOM, since they come from
 * CSS, not the template. A bare `outerHTML` grab of the live SVG would render these black/default
 * (axes, grid, text) or, worse, solid (`.hit`'s hit-band rects have no `fill` attribute at all and
 * rely entirely on `.hit { fill: transparent }` — omitting this rule paints an opaque rectangle
 * over the whole plot in the export). Series colors (`fill`/`stroke` set directly as attributes by
 * `dj-chart.ts`'s `color()`/`sliceColor()`) are handled separately below, not through this table.
 * Keep this list in sync with dj-chart.styles.ts if that file's presentational rules change.
 */
const EXPORT_STYLE_RULES: ReadonlyArray<readonly [string, Readonly<Record<string, string>>]> = [
	[".axis line, .axis path", { stroke: "var(--dj-color-border, #d1d5db)" }],
	[".axis text", { fill: "var(--dj-color-text-muted, #6b7280)", "font-size": "0.75rem" }],
	[".grid line", { stroke: "var(--dj-color-neutral-200, #e5e7eb)" }],
	[".axis-title", { fill: "var(--dj-color-text, #1f2937)", "font-size": "0.8125rem" }],
	[".series-line", { fill: "none", "stroke-width": "2" }],
	[".series-area", { opacity: "0.25", stroke: "none" }],
	["rect.bar", { stroke: "var(--dj-color-background, #fff)", "stroke-width": "0.5" }],
	[".marker", { stroke: "var(--dj-color-background, #fff)", "stroke-width": "1.5" }],
	[".point-mark", { stroke: "var(--dj-color-background, #fff)", "stroke-width": "1" }],
	[".slice", { stroke: "var(--dj-color-background, #fff)", "stroke-width": "1.5" }],
	[".center-label", { fill: "var(--dj-color-text, #1f2937)", "font-weight": "600" }],
	[".center-sub-label", { fill: "var(--dj-color-text-muted, #6b7280)", "font-weight": "400" }],
	[".hit", { fill: "transparent" }],
];

/**
 * Adds inline `style` declarations to every element in `root` matching one of
 * {@link EXPORT_STYLE_RULES}'s selectors, and resolves any `var(--...)` left in a `fill`/`stroke`
 * ATTRIBUTE (dj-chart.ts sets those directly — `this.color()`/`this.sliceColor()` — not through the
 * stylesheet, so the rule table above doesn't touch them). Mutates `root` in place; callers pass a
 * detached clone, never the live DOM.
 *
 * A `fill`/`stroke` value that is NOT a `var()` reference — e.g. `"transparent"`, canvas mode's
 * invisible per-point scatter hit targets (dj-chart.ts's `renderXY`) — is left completely
 * untouched. That is deliberate and is what keeps those circles invisible in the export instead of
 * resolving them to a visible series color (the SCATTER TRAP the E3 spec entry warns about).
 */
export function inlinePresentationalStyles(root: SVGElement, tokens: Record<string, string>): void {
	for (const [selector, props] of EXPORT_STYLE_RULES) {
		for (const el of Array.from(root.querySelectorAll(selector))) {
			const existing = el.getAttribute("style");
			const additions = Object.entries(props).map(([prop, val]) => `${prop}:${resolveVar(val, tokens)}`).join(";");
			el.setAttribute("style", existing ? `${existing};${additions}` : additions);
		}
	}
	for (const el of Array.from(root.querySelectorAll("[fill],[stroke]"))) {
		for (const attr of ["fill", "stroke"] as const) {
			const v = el.getAttribute(attr);
			if (v && v.includes("var(")) el.setAttribute(attr, resolveVar(v, tokens));
		}
	}
}

export interface SerializeOptions {
	width: number;
	height: number;
	/** A `data:` URL for the canvas renderer's drawn bitmap, composited as an `<image>` appended
	 * last (same top-of-stack position `.plot-canvas` occupies live) — omit for the plain SVG
	 * renderer, or when `effectiveRendererNow` isn't `"canvas"` even though `renderer` requested it
	 * (the caller is responsible for that branch — see dj-chart.ts's `toSvg()`). */
	canvasImage?: string;
}

/**
 * Serializes `svgEl` (the live plot `<svg part="plot">`) as a standalone SVG string: geometry as
 * already rendered, presentational styles inlined via {@link inlinePresentationalStyles} so the
 * output needs no external stylesheet or theme tokens, explicit `width`/`height` so it has
 * intrinsic size outside its original layout context (the live element is sized entirely by CSS —
 * `width:100%;height:100%` off its `.plot` ancestor — which a standalone document doesn't have),
 * and — when `options.canvasImage` is given — the canvas renderer's bitmap composited in.
 *
 * Uses `Element.outerHTML`, not `XMLSerializer` (unavailable in this workspace's happy-dom test
 * harness, and `outerHTML` is exactly as reliable for well-formed SVG markup like this).
 */
export function serializeChartSvg(svgEl: SVGSVGElement, tokens: Record<string, string>, options: SerializeOptions): string {
	const clone = svgEl.cloneNode(true) as SVGSVGElement;
	inlinePresentationalStyles(clone, tokens);
	clone.setAttribute("xmlns", SVG_NS);
	clone.setAttribute("width", String(options.width));
	clone.setAttribute("height", String(options.height));
	// Matches the live `svg { overflow: visible }` rule (dj-chart.styles.ts) — rotated axis-title
	// text and markers near the plot edge can sit slightly outside the nominal viewBox.
	const existingStyle = clone.getAttribute("style");
	clone.setAttribute("style", existingStyle ? `${existingStyle};overflow:visible` : "overflow:visible");
	if (options.canvasImage) {
		const img = (svgEl.ownerDocument ?? document).createElementNS(SVG_NS, "image");
		img.setAttribute("x", "0");
		img.setAttribute("y", "0");
		img.setAttribute("width", String(options.width));
		img.setAttribute("height", String(options.height));
		img.setAttribute("href", options.canvasImage);
		clone.appendChild(img);
	}
	return clone.outerHTML;
}

/**
 * Rasterizes an SVG string to a PNG `Blob` at `scale`× (default 2, for retina and for print), via
 * an `Image` decode into an offscreen `<canvas>`. NOT testable in happy-dom: this workspace's
 * harness has no `Image` constructor and no real 2D canvas context (confirmed directly — both are
 * simply absent, not just limited). See dj-chart.ts's `toPng()` and the E3 spec entry's BILL RUNS
 * note; this is real-browser-only, same as the CV canvas-renderer track's drawn-pixel checks.
 */
export function rasterizeSvg(svgString: string, width: number, height: number, scale: number): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = Math.max(1, Math.round(width * scale));
			canvas.height = Math.max(1, Math.round(height * scale));
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("dj-chart: toPng() — 2D canvas context unavailable"));
				return;
			}
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			canvas.toBlob((blob) => {
				if (blob) resolve(blob);
				else reject(new Error("dj-chart: toPng() — canvas.toBlob() produced no blob"));
			}, "image/png");
		};
		img.onerror = () => reject(new Error("dj-chart: toPng() — failed to load the serialized SVG as an Image"));
		img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
	});
}
