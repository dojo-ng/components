import { html } from "lit";
import type { CSSResultGroup } from "lit";
import { property } from "lit/decorators.js";
import DojoElement, { baseStyles, reducedMotion } from "@dojo-ng/dojo-element";
import styles from "./dj-skeleton.styles.js";

export type SkeletonEffect = "sheen" | "none";

/**
 * `<dj-skeleton>` — a loading placeholder that stands in for content while it loads.
 *
 * #### Size and shape
 * - Style the host with CSS; there are no shape properties. It is `display: block`, `1em` high by
 *   default, with the theme's border radius.
 * - For a line of text, give it a short height and a width. For an avatar, make it square and add
 *   `border-radius: 50%`.
 * - `effect="sheen"` (the default) shows a moving sheen; `effect="none"` shows a still surface.
 *
 * #### Accessibility
 * - The skeleton is always `aria-hidden="true"`, because it is decoration.
 * - Mark the region that is loading with `aria-busy="true"` until the real content arrives. Screen
 *   readers then announce the loading state once for the region, not once per placeholder.
 * - Under `prefers-reduced-motion`, the sheen does not move, whatever `effect` says.
 *
 * Parts: `base` (the placeholder surface).
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
