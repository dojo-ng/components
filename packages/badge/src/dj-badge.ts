import { html } from "lit";
import type { CSSResultGroup } from "lit";
import { property } from "lit/decorators.js";
import DojoElement, { baseStyles } from "@dojo-ng/dojo-element";
import styles from "./dj-badge.styles.js";

export type BadgeVariant = "neutral" | "info" | "success" | "warning" | "danger";

/**
 * `<dj-badge>` — a small count or status label that decorates other content.
 *
 * Presentational: it carries no ARIA role. When a badge shows a count for a control
 * (e.g. an unread count on a button), put the accessible name on the CONTROL —
 * `aria-label="Notifications, 4 unread"` — not on the badge, so assistive tech reads
 * the meaning rather than a bare number.
 *
 * Content is the default slot.
 * Parts: `base` (the badge box).
 * @cssprop [--dj-badge-background=per-variant semantic color] - Background fill; defaults to the variant's `--dj-color-*-600` scale.
 * @cssprop [--dj-badge-color=var(--dj-color-neutral-0)] - Text color.
 * @cssprop [--dj-badge-radius=var(--dj-input-border-radius-small)] - Corner radius (ignored when `pill` is set).
 * @cssprop [--dj-badge-font-size=0.75rem] - Badge text size.
 */
export class DjBadge extends DojoElement {
	static override styles: CSSResultGroup = [baseStyles, styles];
	static override version = "0.1.0";

	/** Semantic color. Reflected so `:host([variant="…"])` and page CSS can target it. */
	@property({ reflect: true }) variant: BadgeVariant = "neutral";
	/** Fully rounded (pill) shape instead of the default small radius. */
	@property({ type: Boolean, reflect: true }) pill = false;

	override render() {
		return html`<span part="base" class="base"><slot></slot></span>`;
	}
}
export default DjBadge;
