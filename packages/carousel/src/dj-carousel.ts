import { html, nothing, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import DojoElement, { reducedMotion } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults, getDir } from "@dojo-ng/i18n";
import styles from "./dj-carousel.styles.js";

registerDefaults("dj", {
	carousel: "carousel",
	slide: "slide",
	slideOf: "{n} of {total}",
	prevSlide: "Previous slide",
	nextSlide: "Next slide",
});
const EN: Record<string, string> = {
	carousel: "carousel", slide: "slide", slideOf: "{n} of {total}",
	prevSlide: "Previous slide", nextSlide: "Next slide",
};

/**
 * `<dj-carousel>` — a slotted, swipeable carousel. Each top-level element in the default slot is
 * one item (cards, images, tiles — arbitrary content). The item strip is a native horizontal
 * scroll container with CSS scroll-snap, so touch and trackpad swiping is real scrolling: there
 * is no pointer/drag code and no WCAG 2.5.7 (dragging) concern — the prev/next buttons are the
 * non-drag path. `per-view` sizes items to show N at once (gap-adjusted); `dots` adds one dot per
 * item; `nav` (default on) shows prev/next buttons that disable at the ends (no looping in v1).
 *
 * The settled index is detected from element rects (not `scrollLeft`, which is RTL-inconsistent),
 * debounced after scrolling. `next`/`previous`/`goTo` smooth-scroll the target into view and,
 * because a headless environment has no layout, update `index` and emit optimistically; the scroll
 * listener reconciles in a real browser (guarded so an unchanged index does not re-emit). Under
 * `prefers-reduced-motion` navigation jumps instantly (the composed `reducedMotion` snippet forces
 * `scroll-behavior: auto`, and button navigation passes `behavior: "auto"`).
 *
 * ARIA follows the APG carousel pattern: the region carries `aria-roledescription="carousel"` and
 * the `label`; each slotted item gets `role="group"`, `aria-roledescription="slide"`, and an
 * "{n} of {total}" label, reconciled on every `slotchange` and locale change. Keyboard: with the
 * viewport focused, ArrowRight/ArrowLeft move forward/back in the reading direction (RTL-aware).
 *
 * Deferred (not built): `loop`, autoplay (an accessibility liability), and vertical orientation.
 *
 * Slots: default — each top-level element is one carousel item.
 * Parts: `viewport` (the scroller), `prev`, `next`, `dots`, `dot`.
 * Events: `dj-slide-change` (detail `{ index }`) when the settled index changes, from any cause.
 *
 * @cssprop [--dj-carousel-gap=1rem] - Gap between items (also subtracted from the per-view basis).
 */
export class DjCarousel extends DojoElement {
	static override styles = [styles, reducedMotion];
	static override version = "0.1.0";

	/** Items shown at once; each item gets `1/n` of the viewport, gap-adjusted. */
	@property({ attribute: "per-view", type: Number }) perView = 1;
	/** Show prev/next buttons (disabled at the ends). */
	@property({ type: Boolean }) nav = true;
	/** Show one navigation dot per item. */
	@property({ type: Boolean }) dots = false;
	/** Accessible name for the carousel region (recommended). */
	@property() label?: string;

	@state() private itemCount = 0;
	@state() private current = 0;

	#i18n = new LocaleController(this);
	#items: HTMLElement[] = [];
	#scrollTimer?: ReturnType<typeof setTimeout>;

	/** The current leading item index (read-only). */
	get index(): number {
		return this.current;
	}

	#msg(key: string, params?: Record<string, string | number>): string {
		return messages.resolve("dj", this.#i18n.locale, key, params) ?? EN[key] ?? key;
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		if (this.#scrollTimer) clearTimeout(this.#scrollTimer);
		this.#scrollTimer = undefined;
	}

	/** Per-item flex-basis: `1/n` of the viewport minus the gaps between items. Division is by a
	 * literal (`n`), never a var, so it works on the Safari 15 baseline. */
	#basis(): string {
		const n = Math.max(1, Math.floor(this.perView));
		return n === 1 ? "100%" : `calc((100% - ${n - 1} * var(--dj-carousel-gap, 1rem)) / ${n})`;
	}

	private items(): HTMLElement[] {
		const slot = this.renderRoot?.querySelector("slot") as HTMLSlotElement | null;
		if (!slot) return [];
		return slot.assignedElements({ flatten: true }) as HTMLElement[];
	}

	private viewport(): HTMLElement | null {
		return (this.renderRoot?.querySelector(".viewport") as HTMLElement | null) ?? null;
	}

	private onSlotChange() {
		const departed = this.#items;
		const items = this.items();
		// Strip our ARIA from items that left the slot.
		for (const el of departed) {
			if (!items.includes(el)) {
				el.removeAttribute("role");
				el.removeAttribute("aria-roledescription");
				el.removeAttribute("aria-label");
			}
		}
		this.#items = items;
		this.itemCount = items.length; // reactive: dots/buttons re-render
		if (this.current > items.length - 1) this.current = Math.max(0, items.length - 1);
		this.applyItemAria();
	}

	/** Set `role="group"` + "{n} of {total}" on each slotted item (idempotent; localized). */
	private applyItemAria() {
		const total = this.#items.length;
		this.#items.forEach((el, i) => {
			el.setAttribute("role", "group");
			el.setAttribute("aria-roledescription", this.#msg("slide"));
			el.setAttribute("aria-label", this.#msg("slideOf", { n: i + 1, total }));
		});
	}

	protected override firstUpdated() {
		// Capture items present at first render: an initial slot assignment of pre-existing
		// children does not always fire `slotchange`. Idempotent with the slotchange handler.
		this.onSlotChange();
	}

	protected override updated() {
		// Host-level custom prop cascades to slotted items (they are its light-DOM children).
		this.style.setProperty("--dj-carousel-basis", this.#basis());
		// Re-apply on locale change (LocaleController drove this update) and per-view change.
		this.applyItemAria();
	}

	/** Prefer instant scrolling under reduced motion (CSS scroll-behavior can't override a JS
	 * `behavior: "smooth"`, so decide it here). */
	#scrollBehavior(): ScrollBehavior {
		const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
		return reduce ? "auto" : "smooth";
	}

	/** Update the settled index and emit once; a repeat of the same index is a no-op (no re-emit). */
	private setIndex(i: number) {
		if (i === this.current) return;
		this.current = i;
		this.emit("dj-slide-change", { detail: { index: i } });
	}

	next() {
		this.goTo(this.current + 1);
	}
	previous() {
		this.goTo(this.current - 1);
	}
	goTo(index: number) {
		const total = this.#items.length;
		if (total === 0) return;
		const target = Math.max(0, Math.min(index, total - 1));
		const el = this.#items[target];
		if (el && typeof el.scrollIntoView === "function") {
			el.scrollIntoView({ behavior: this.#scrollBehavior(), inline: "start", block: "nearest" });
		}
		// Optimistic: set + emit now (headless has no layout so the scroll listener never fires).
		this.setIndex(target);
	}

	private onScroll = () => {
		if (this.#scrollTimer) clearTimeout(this.#scrollTimer);
		this.#scrollTimer = setTimeout(() => this.updateIndexFromRects(), 100);
	};

	/** Current index = the item whose leading edge is nearest the scroller's leading edge. Uses
	 * rects (not `scrollLeft`), and the reading direction for which edge is "leading". */
	private updateIndexFromRects() {
		const scroller = this.viewport();
		if (!scroller || this.#items.length === 0) return;
		const rtl = getDir(this) === "rtl";
		const sRect = scroller.getBoundingClientRect();
		const lead = rtl ? sRect.right : sRect.left;
		let best = 0;
		let bestDist = Infinity;
		this.#items.forEach((el, i) => {
			const r = el.getBoundingClientRect();
			const edge = rtl ? r.right : r.left;
			const dist = Math.abs(edge - lead);
			if (dist < bestDist) {
				bestDist = dist;
				best = i;
			}
		});
		this.setIndex(best);
	}

	private onKeydown = (e: KeyboardEvent) => {
		if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
		const rtl = getDir(this) === "rtl";
		const forward = rtl ? e.key === "ArrowLeft" : e.key === "ArrowRight";
		e.preventDefault();
		if (forward) this.next();
		else this.previous();
	};

	override render() {
		const total = this.itemCount;
		const atStart = this.current <= 0;
		const atEnd = this.current >= total - 1;
		return html`
			<div class="region" role="region" aria-roledescription=${this.#msg("carousel")} aria-label=${this.label ?? nothing}>
				<div class="track">
					${this.nav
						? html`<button type="button" part="prev" class="nav nav--prev" aria-label=${this.#msg("prevSlide")} ?disabled=${atStart || total === 0} @click=${() => this.previous()}>‹</button>`
						: nothing}
					<div class="viewport" part="viewport" tabindex="0" @scroll=${this.onScroll} @keydown=${this.onKeydown}>
						<slot @slotchange=${() => this.onSlotChange()}></slot>
					</div>
					${this.nav
						? html`<button type="button" part="next" class="nav nav--next" aria-label=${this.#msg("nextSlide")} ?disabled=${atEnd || total === 0} @click=${() => this.next()}>›</button>`
						: nothing}
				</div>
				${this.dots && total > 0
					? html`<div class="dots" part="dots">
							${Array.from({ length: total }, (_, i) => html`<button
										type="button"
										part="dot"
										class="dot ${i === this.current ? "dot--active" : ""}"
										aria-label=${this.#msg("slideOf", { n: i + 1, total })}
										aria-current=${i === this.current ? "true" : nothing}
										@click=${() => this.goTo(i)}
									></button>`)}
						</div>`
					: nothing}
			</div>
		`;
	}
}
export default DjCarousel;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-slide-change": CustomEvent<{ index: number }>;
	}
}
