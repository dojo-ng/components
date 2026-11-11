import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import DojoElement, { collectFocusables, trapTabKey, firstFocusable, lockBodyScroll, defaultTrueBoolean, deepActiveElement, pushOverlay } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/icon";
import styles from "./dj-dialog.styles.js";

registerDefaults("dj", { close: "Close" });

/**
 * `<dj-dialog>` — a modal dialog. Slots: `title`, default (content), `actions`. Locks body
 * scroll while open, closes on Escape and the close button, and on underlay click unless
 * `modal`. `role="alertdialog"` is always modal. Restores focus to the previously focused
 * element on close. Emits `dj-close` on the dialog itself; it does not bubble, so a listener on
 * an outer element never hears an inner overlay close.
 *
 * Escape closes only the overlay opened last: a select's list open inside the dialog closes
 * first, and the dialog stays open until the next Escape. The dialog always traps focus and is
 * announced as modal (`aria-modal="true"`); `modal` only stops an underlay click from closing it.
 *
 * Accessible name: the `title` slot names the dialog. With no title, put `aria-label` on
 * `<dj-dialog>` and it is passed to the inner dialog element.
 *
 * `role` picks `dialog` or `alertdialog` for the inner dialog element. A `role` attribute
 * written on `<dj-dialog>` is read into the property and then removed from the host, so
 * assistive tech sees one dialog, not two nested ones.
 *
 * Parts: `underlay`, `dialog`, `title`, `close`, `content`, `actions`.
 *
 * @cssprop [--dj-dialog-z-index=941] - Stacking order of the dialog.
 * @cssprop [--dj-dialog-underlay-z-index=940] - Stacking order of the dialog underlay (scrim).
 */
export class DjDialog extends DojoElement {
	static override styles = styles;
	static override version = "0.1.2";

	@property({ type: Boolean, reflect: true }) open = false;
	@property({ type: Boolean, converter: defaultTrueBoolean }) closeable = true;
	@property({ type: Boolean }) modal = false;
	@property({ type: Boolean, converter: defaultTrueBoolean }) underlay = true;
	/** `dialog` or `alertdialog`. Applied to the inner dialog element, never to the host. */
	@property() override role: "dialog" | "alertdialog" = "dialog";
	/** Accessible name used when the `title` slot is empty. Mirrors the host's `aria-label`. */
	@property({ attribute: "aria-label" }) override ariaLabel: string | null = null;
	@property({ attribute: "close-text" }) closeText?: string;

	#i18n = new LocaleController(this);
	#releaseScroll?: () => void;
	#previousFocus: HTMLElement | null = null;
	#releaseOverlay?: () => void;
	#hasTitle = false;

	// Escape and Tab arrive through the shared overlay stack, and only while this dialog is the
	// top overlay. A non-closeable dialog still takes Escape, so the page behind it stays put.
	#overlay = {
		onEscape: () => this.close(),
		onTab: (event: KeyboardEvent) => trapTabKey(event, collectFocusables(this.renderRoot as ShadowRoot, this)),
	};

	close() {
		if (!this.open || !this.closeable) return;
		this.open = false;
		this.emit("dj-close", { bubbles: false, composed: false });
	}

	override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
		// A host role would wrap the inner dialog in a second dialog in the accessibility tree.
		// Take the value, then drop the attribute; the removal itself is ignored.
		if (name === "role") {
			if (newValue === null) return;
			this.role = newValue === "alertdialog" ? "alertdialog" : "dialog";
			this.removeAttribute("role");
			return;
		}
		super.attributeChangedCallback(name, oldValue, newValue);
	}

	override connectedCallback() {
		super.connectedCallback();
		if (this.open) this.#registerOverlay();
	}
	override disconnectedCallback() {
		super.disconnectedCallback();
		this.#releaseOverlay?.();
		this.#releaseOverlay = undefined;
		this.unlockScroll();
	}

	#registerOverlay() { if (!this.#releaseOverlay) this.#releaseOverlay = pushOverlay(this.#overlay); }

	private lockScroll() { if (!this.#releaseScroll) this.#releaseScroll = lockBodyScroll(); }
	private unlockScroll() { this.#releaseScroll?.(); this.#releaseScroll = undefined; }

	protected override willUpdate(changed: Map<PropertyKey, unknown>) {
		super.willUpdate(changed);
		// Remember the real focused element (inside any shadow roots) before render moves focus.
		if (changed.has("open") && this.open) this.#previousFocus = deepActiveElement() as HTMLElement | null;
	}

	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (!changed.has("open")) return;
		if (this.open) {
			this.#registerOverlay();
			this.lockScroll();
			// Move focus into the dialog: first interactive content, else close button, else the dialog.
			const firstSlotted = firstFocusable(this);
			const close = this.renderRoot.querySelector<HTMLElement>("[part=close]");
			const main = this.renderRoot.querySelector<HTMLElement>(".main");
			(firstSlotted ?? close ?? main)?.focus();
		} else {
			this.#releaseOverlay?.();
			this.#releaseOverlay = undefined;
			this.unlockScroll();
			if (this.#previousFocus?.isConnected) this.#previousFocus.focus?.();
			this.#previousFocus = null;
		}
	}

	private isModal() { return this.role === "alertdialog" || this.modal; }

	#onTitleSlotChange = (event: Event) => {
		const has = (event.target as HTMLSlotElement).assignedNodes({ flatten: true })
			.some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? "").trim() !== "");
		if (has !== this.#hasTitle) { this.#hasTitle = has; this.requestUpdate(); }
	};

	override render() {
		if (!this.open) return nothing;
		return html`
			<div
				part="underlay"
				class="underlay ${this.underlay ? "underlay--visible" : ""}"
				@click=${() => { if (!this.isModal()) this.close(); }}
			></div>
			<div
				part="dialog"
				class="main"
				role=${this.role}
				aria-modal="true"
				aria-labelledby=${this.#hasTitle ? "title" : nothing}
				aria-label=${!this.#hasTitle && this.ariaLabel ? this.ariaLabel : nothing}
				tabindex="-1"
			>
				<div part="title" class="title">
					<span class="title__text" id="title"><slot name="title" @slotchange=${this.#onTitleSlotChange}></slot></span>
					${this.closeable
						? html`<button part="close" class="close" type="button" aria-label=${this.closeText ?? messages.resolve("dj", this.#i18n.locale, "close") ?? "Close"} @click=${() => this.close()}>
								<dj-icon><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" fill="none"/></svg></dj-icon>
							</button>`
						: nothing}
				</div>
				<div part="content" class="content"><slot></slot></div>
				<div part="actions" class="actions"><slot name="actions"></slot></div>
			</div>
		`;
	}
}
export default DjDialog;

declare global { interface GlobalEventHandlersEventMap { "dj-close": CustomEvent<Record<string, never>>; } }
