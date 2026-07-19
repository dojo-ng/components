import { html } from "lit";
import type { CSSResultGroup } from "lit";
import { property, query } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import "@dojo-ng/popup";
import type { PopupPosition } from "@dojo-ng/popup";
import styles from "./dj-dropdown.styles.js";

/** The slice of `<dj-list>`'s public API dj-dropdown steers. */
interface DjListLike extends HTMLElement {
	menu: boolean;
	activateFirst(): void;
}

/**
 * `<dj-dropdown>` — the APG menu-button glue over the existing `<dj-popup>` and `<dj-list>`.
 * Put the trigger (usually a `<dj-button>`) in the `trigger` slot and the content — typically
 * one `<dj-list>` — in the default slot; the content renders in a `<dj-popup>` anchored to the
 * trigger.
 *
 * Behavior: clicking the trigger toggles it. ArrowDown / Enter / Space open it; on open, if the
 * content is a `<dj-list>`, its `menu` mode is switched on, it is focused, and its first item is
 * activated. Escape closes and returns focus to the trigger; choosing an item (the list's
 * `change` event) closes and refocuses too — the `change` event still reaches the consumer
 * untouched. Non-list content is allowed as an arbitrary panel: then dj-dropdown only does
 * open/close/Escape/focus-return, with no list steering.
 *
 * Slots: `trigger` (the button), default (the menu list or panel).
 * Parts: `panel` (the content wrapper inside the popup).
 * Events: `dj-open`, `dj-close`.
 */
export class DjDropdown extends DojoElement {
	static override styles: CSSResultGroup = styles;
	static override version = "0.1.0";

	/** Whether the menu is open. Reflected so page CSS can target `:host([open])`. */
	@property({ type: Boolean, reflect: true }) open = false;
	/** Popup placement (pass-through to `<dj-popup>`). */
	@property({ reflect: true }) position: PopupPosition = "below";
	/** Size the panel to the trigger's width. Off by default — menus are content-sized. */
	@property({ attribute: "match-width", type: Boolean }) matchWidth = false;

	@query(".trigger") private triggerEl!: HTMLElement;

	/** The slotted trigger element, kept for ARIA syncing and focus return. */
	#trigger: HTMLElement | null = null;

	#onTriggerClick = (): void => this.#toggle();
	#onTriggerKey = (event: KeyboardEvent): void => {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			if (this.open) this.#steerList();
			else this.#openMenu();
		}
		// Enter/Space fire a native click on a button trigger, which #onTriggerClick handles.
	};
	#onContentChange = (): void => {
		// A selection from the slotted list closes the menu and returns focus; the `change`
		// event itself keeps propagating to the consumer untouched (no re-emit).
		this.#closeMenu(true);
	};

	override connectedCallback(): void {
		super.connectedCallback();
		// The list is a light-DOM child, so its composed `change` bubbles here directly —
		// more robust than crossing the popup's slot.
		this.addEventListener("change", this.#onContentChange);
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.removeEventListener("change", this.#onContentChange);
		this.#bindTrigger(null);
	}

	#openMenu(): void {
		if (this.open) return;
		this.open = true;
		this.emit("dj-open");
	}

	#closeMenu(refocus = false): void {
		if (!this.open) return;
		this.open = false;
		this.emit("dj-close");
		if (refocus) this.#trigger?.focus?.();
	}

	#toggle(): void {
		if (this.open) this.#closeMenu();
		else this.#openMenu();
	}

	/** Resolve content from light-DOM children (robust; no reliance on slot assignment timing). */
	#contentList(): DjListLike | null {
		for (const el of Array.from(this.children)) {
			if (el.getAttribute("slot") === "trigger") continue;
			if (el.tagName === "DJ-LIST") return el as unknown as DjListLike;
			const inner = el.querySelector?.("dj-list");
			if (inner) return inner as unknown as DjListLike;
		}
		return null;
	}

	#steerList(): void {
		const list = this.#contentList();
		if (!list) return;
		if (!list.menu) list.menu = true;
		// Focus + activate the first item once the popup has rendered.
		requestAnimationFrame(() => {
			list.focus?.();
			list.activateFirst?.();
		});
	}

	/** Resolve the trigger from light-DOM children and (re)bind its listeners + ARIA. */
	#resolveTrigger(): void {
		const next =
			(Array.from(this.children).find((c) => c.getAttribute("slot") === "trigger") as HTMLElement) ??
			null;
		this.#bindTrigger(next);
	}

	#bindTrigger(next: HTMLElement | null): void {
		if (next === this.#trigger) {
			this.#syncTriggerAria();
			return;
		}
		if (this.#trigger) {
			this.#trigger.removeEventListener("click", this.#onTriggerClick);
			this.#trigger.removeEventListener("keydown", this.#onTriggerKey);
			this.#trigger.removeAttribute("aria-haspopup");
			this.#trigger.removeAttribute("aria-expanded");
		}
		this.#trigger = next;
		if (next) {
			next.addEventListener("click", this.#onTriggerClick);
			next.addEventListener("keydown", this.#onTriggerKey);
		}
		this.#syncTriggerAria();
	}

	#syncTriggerAria(): void {
		const el = this.#trigger;
		if (!el) return;
		el.setAttribute("aria-haspopup", this.#contentList() ? "menu" : "true");
		el.setAttribute("aria-expanded", this.open ? "true" : "false");
	}

	protected override firstUpdated(): void {
		this.#resolveTrigger();
	}

	protected override updated(changed: Map<PropertyKey, unknown>): void {
		if (changed.has("open")) {
			this.#syncTriggerAria();
			if (this.open) this.#steerList();
		}
	}

	override render() {
		const width = this.matchWidth && this.triggerEl ? `${this.triggerEl.offsetWidth}px` : "auto";
		return html`
			<span class="trigger">
				<slot name="trigger" @slotchange=${() => this.#resolveTrigger()}></slot>
			</span>
			<dj-popup
				.anchor=${this.triggerEl}
				.open=${this.open}
				position=${this.position}
				.scrollLock=${false}
				@dj-close=${() => this.#closeMenu(true)}
			>
				<div part="panel" class="panel" style=${`width:${width}`}>
					<slot @slotchange=${() => this.#syncTriggerAria()}></slot>
				</div>
			</dj-popup>
		`;
	}
}
export default DjDropdown;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-open": CustomEvent<Record<string, never>>;
		"dj-close": CustomEvent<Record<string, never>>;
	}
}
