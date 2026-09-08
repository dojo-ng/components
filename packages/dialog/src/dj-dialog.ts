import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import DojoElement, { collectFocusables, trapTabKey, firstFocusable, lockBodyScroll } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/icon";
import styles from "./dj-dialog.styles.js";

registerDefaults("dj", { close: "Close" });

/**
 * `<dj-dialog>` — a modal dialog. Slots: `title`, default (content), `actions`. Locks body
 * scroll while open, closes on Escape and the close button, and on underlay click unless
 * `modal`. `role="alertdialog"` is always modal. Restores focus to the previously focused
 * element on close. Emits `dj-close`. Parts: `underlay`, `dialog`, `title`, `close`, `content`, `actions`.
 *
 * @cssprop [--dj-dialog-z-index=941] - Stacking order of the dialog.
 * @cssprop [--dj-dialog-underlay-z-index=940] - Stacking order of the dialog underlay (scrim).
 */
export class DjDialog extends DojoElement {
	static override styles = styles;
	static override version = "0.1.1";

	@property({ type: Boolean, reflect: true }) open = false;
	@property({ type: Boolean }) closeable = true;
	@property({ type: Boolean }) modal = false;
	@property({ type: Boolean }) underlay = true;
	@property({ reflect: true }) role: "dialog" | "alertdialog" = "dialog";
	@property({ attribute: "close-text" }) closeText?: string;

	#i18n = new LocaleController(this);
	#releaseScroll?: () => void;
	#previousFocus: HTMLElement | null = null;

	private readonly onKeyDown = (event: KeyboardEvent) => {
		if (!this.open) return;
		if (event.key === "Escape" && this.closeable) {
			event.stopPropagation();
			this.close();
			return;
		}
		if (event.key === "Tab") trapTabKey(event, collectFocusables(this.renderRoot as ShadowRoot, this));
	};

	close() {
		if (!this.open || !this.closeable) return;
		this.open = false;
		this.emit("dj-close");
	}

	connectedCallback() { super.connectedCallback(); document.addEventListener("keydown", this.onKeyDown); }
	disconnectedCallback() { super.disconnectedCallback(); document.removeEventListener("keydown", this.onKeyDown); this.unlockScroll(); }

	private lockScroll() { if (!this.#releaseScroll) this.#releaseScroll = lockBodyScroll(); }
	private unlockScroll() { this.#releaseScroll?.(); this.#releaseScroll = undefined; }

	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (!changed.has("open")) return;
		if (this.open) {
			this.#previousFocus = (this.getRootNode() as Document).activeElement as HTMLElement | null;
			this.lockScroll();
			// Move focus into the dialog: first interactive content, else close button, else the dialog.
			const firstSlotted = firstFocusable(this);
			const close = this.renderRoot.querySelector<HTMLElement>("[part=close]");
			const main = this.renderRoot.querySelector<HTMLElement>(".main");
			(firstSlotted ?? close ?? main)?.focus();
		} else {
			this.unlockScroll();
			this.#previousFocus?.focus?.();
			this.#previousFocus = null;
		}
	}

	private isModal() { return this.role === "alertdialog" || this.modal; }

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
				aria-modal=${this.isModal() ? "true" : "false"}
				tabindex="-1"
			>
				<div part="title" class="title">
					<span class="title__text"><slot name="title"></slot></span>
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
