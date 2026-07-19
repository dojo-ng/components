import { html } from "lit";
import type { CSSResultGroup } from "lit";
import { property } from "lit/decorators.js";
import DojoElement, { baseStyles, reducedMotion } from "@dojo-ng/dojo-element";
import styles from "./dj-skeleton.styles.js";

export type SkeletonEffect = "sheen" | "none";

/**
 * `<dj-skeleton>` — a loading placeholder that stands in for content while it loads.
 *
 * Shape and size come from consumer CSS on the host: it is `display: block` with a
 * default height of `1em` and a token border-radius. Style the host to size each
 * placeholder — a circular avatar is `border-radius: 50%`, a text line is a short
 * height with a width. No shape prop is needed.
 *
 * Always `aria-hidden="true"`: the placeholder itself is decorative. Mark the region
 * that is loading with `aria-busy="true"` until the real content lands, so assistive
 * tech announces the loading state once for the whole region.
 *
 * `prefers-reduced-motion` disables the sheen regardless of `effect` (the shared
 * reducedMotion snippet collapses the animation).
 *
 * Parts: `base` (the placeholder surface).
 * @cssprop [--dj-skeleton-color=var(--dj-color-neutral-200)] - Placeholder fill.
 * @cssprop [--dj-skeleton-sheen-color=rgb(255 255 255 / 0.55)] - Color of the sweeping sheen band.
 * @cssprop [--dj-skeleton-radius=var(--dj-input-border-radius-small)] - Corner radius.
 */
export class DjSkeleton extends DojoElement {
	static override styles: CSSResultGroup = [baseStyles, styles, reducedMotion];
	static override version = "0.1.0";

	/** Loading animation: a sweeping `sheen`, or `none` for a static placeholder. */
	@property({ reflect: true }) effect: SkeletonEffect = "sheen";

	override connectedCallback(): void {
		super.connectedCallback();
		// Decorative by definition; announce the loading state on the container, not here.
		this.setAttribute("aria-hidden", "true");
	}

	override render() {
		return html`<span part="base" class="base"></span>`;
	}
}
export default DjSkeleton;
