import { html } from "lit";
import { property, state } from "lit/decorators.js";
import DojoElement, { pushOverlay } from "@dojo-ng/dojo-element";
import styles from "./dj-tooltip.styles.js";

export type TooltipOrientation = "top" | "right" | "bottom" | "left";

const OPPOSITE: Record<TooltipOrientation, TooltipOrientation> = { top: "bottom", bottom: "top", left: "right", right: "left" };
/** Gap between trigger and tip, in px (matches the 0.4rem CSS fallback at 16px). */
const GAP = 6;
let nextId = 0;

/**
 * `<dj-tooltip>` — shows tip content next to its trigger on hover/focus. The trigger goes
 * in the default slot, the tip in the `content` slot. Set `open` to force it shown. Escape hides
 * a tip that hover or focus showed, without moving the pointer or focus; entering or focusing the
 * trigger again shows it again. When a tooltip is open over a dialog, Escape hides the tip first
 * and leaves the dialog open.
 *
 * The tip describes its trigger: the slotted trigger element gets `aria-describedby` pointing at
 * the slotted tip (an `id` is generated for the tip when it has none). Put the tooltip around an
 * element that carries the role, such as a native `<button>`; a custom element whose focusable
 * part sits in its own shadow root cannot receive the reference.
 *
 * The tip renders in the browser top layer where the Popover API exists, so an `overflow: hidden`
 * or transformed ancestor cannot clip it. It sits on the `orientation` side and flips to the
 * opposite side when there is no room there, then stays inside the viewport.
 * Parts: `content`.
 *
 * @cssprop [--dj-tooltip-z-index=950] - Stacking order of the tooltip.
 */
export class DjTooltip extends DojoElement {
	static override styles = styles;
	static override version = "0.1.2";

	/** Force the tooltip open regardless of hover/focus. */
	@property({ type: Boolean }) open = false;
	@property({ reflect: true }) orientation: TooltipOrientation = "top";
	@state() private active = false;

	#releaseOverlay?: () => void;
	#overlay = { onEscape: () => this.hide() };
	#described: Element[] = [];
	#watching = false;

	connectedCallback() {
		super.connectedCallback();
		this.addEventListener("pointerenter", this.show);
		this.addEventListener("pointerleave", this.hide);
		this.addEventListener("focusin", this.show);
		this.addEventListener("focusout", this.hide);
	}
	disconnectedCallback() {
		super.disconnectedCallback();
		this.removeEventListener("pointerenter", this.show);
		this.removeEventListener("pointerleave", this.hide);
		this.removeEventListener("focusin", this.show);
		this.removeEventListener("focusout", this.hide);
		this.#releaseOverlay?.();
		this.#releaseOverlay = undefined;
		this.#stopWatch();
		this.#unlink();
	}
	private show = () => {
		this.active = true;
		// Escape goes through the shared overlay stack: the tip is the newest overlay, so it
		// hides first and a dialog around it stays open.
		this.#releaseOverlay ??= pushOverlay(this.#overlay);
	};
	/** Also the Escape handler: Escape dismisses the tip without moving the pointer or focus
	 * (WCAG 1.4.13). It stays dismissed until the trigger is entered or focused again. */
	private hide = () => {
		this.active = false;
		this.#releaseOverlay?.();
		this.#releaseOverlay = undefined;
	};

	/** Link the slotted trigger(s) to the slotted tip with `aria-describedby`. */
	#link = () => {
		this.#unlink();
		const triggers = this.#slotted("slot:not([name])");
		const tips = this.#slotted('slot[name="content"]');
		if (!tips.length) return;
		const ids = tips.map((tip) => {
			if (!tip.id) tip.id = `dj-tooltip-${++nextId}`;
			return tip.id;
		});
		for (const trigger of triggers) {
			const own = (trigger.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
			const add = ids.filter((id) => !own.includes(id));
			if (!add.length) continue;
			trigger.setAttribute("aria-describedby", [...own, ...add].join(" "));
			this.#described.push(trigger);
		}
		this.#describedIds = ids;
	};
	#describedIds: string[] = [];
	#unlink() {
		for (const trigger of this.#described) {
			const rest = (trigger.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id && !this.#describedIds.includes(id));
			if (rest.length) trigger.setAttribute("aria-describedby", rest.join(" "));
			else trigger.removeAttribute("aria-describedby");
		}
		this.#described = [];
		this.#describedIds = [];
	}
	#slotted(selector: string): Element[] {
		const slot = this.renderRoot?.querySelector<HTMLSlotElement>(selector);
		return slot ? slot.assignedElements({ flatten: true }) : [];
	}

	protected override firstUpdated() {
		this.#link();
	}

	protected override updated() {
		const tip = this.renderRoot.querySelector<HTMLElement>(".content");
		if (!tip) return;
		const visible = this.open || this.active;
		const popover = typeof (tip as { showPopover?: unknown }).showPopover === "function" && tip.hasAttribute("popover");
		if (!popover) return;
		if (visible) {
			if (!tip.matches(":popover-open")) {
				try { tip.showPopover(); } catch { tip.removeAttribute("popover"); return; }
			}
			this.#place();
			this.#startWatch();
		} else {
			this.#stopWatch();
			if (tip.matches(":popover-open")) tip.hidePopover();
		}
	}

	/** Position the top-layer tip beside the trigger, flipping when the preferred side has no room. */
	#place = () => {
		const tip = this.renderRoot.querySelector<HTMLElement>(".content");
		if (!tip || !tip.matches(":popover-open")) return;
		const a = this.getBoundingClientRect();
		const t = tip.getBoundingClientRect();
		const vw = document.documentElement.clientWidth;
		const vh = document.documentElement.clientHeight;
		const room: Record<TooltipOrientation, boolean> = {
			top: a.top - t.height - GAP >= 0,
			bottom: a.bottom + t.height + GAP <= vh,
			left: a.left - t.width - GAP >= 0,
			right: a.right + t.width + GAP <= vw,
		};
		let side = this.orientation;
		if (!room[side] && room[OPPOSITE[side]]) side = OPPOSITE[side];
		let top: number;
		let left: number;
		if (side === "top" || side === "bottom") {
			top = side === "top" ? a.top - t.height - GAP : a.bottom + GAP;
			left = a.left + a.width / 2 - t.width / 2;
		} else {
			left = side === "left" ? a.left - t.width - GAP : a.right + GAP;
			top = a.top + a.height / 2 - t.height / 2;
		}
		left = Math.min(Math.max(left, 0), Math.max(vw - t.width, 0));
		top = Math.min(Math.max(top, 0), Math.max(vh - t.height, 0));
		tip.style.top = `${Math.round(top)}px`;
		tip.style.left = `${Math.round(left)}px`;
		tip.dataset.placement = side;
	};
	#onScroll = () => this.#place();
	#startWatch() {
		if (this.#watching) return;
		this.#watching = true;
		window.addEventListener("scroll", this.#onScroll, { capture: true, passive: true });
		window.addEventListener("resize", this.#onScroll, { passive: true });
	}
	#stopWatch() {
		if (!this.#watching) return;
		this.#watching = false;
		window.removeEventListener("scroll", this.#onScroll, true);
		window.removeEventListener("resize", this.#onScroll);
	}

	override render() {
		const visible = this.open || this.active;
		// `popover="manual"` lifts the tip into the top layer (see updated()). Without the
		// Popover API the attribute is ignored and the CSS orientation classes place it.
		return html`
			<slot @slotchange=${this.#link}></slot>
			<div part="content" class="content content--${this.orientation}" role="tooltip" popover="manual" ?hidden=${!visible}>
				<slot name="content" @slotchange=${this.#link}></slot>
			</div>
		`;
	}
}
export default DjTooltip;
