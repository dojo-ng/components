import { html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import { getHistory, whenHistory, type NavigateDetail } from "@dojo-ng/history/handle";
import styles from "./dj-card.styles.js";
/**
 * `<dj-card>` — content container. Slots: `header`, default (content), `actions`. Optional
 * `title`/`subtitle`/`media-src`. `clickable` makes the body a button. Parts: `root`, `media`, `body`, `actions`.
 *
 * #### Navigation
 * - Set `path` to make the card a link to an app path. The body becomes a real `<a href>`, so
 *   Ctrl/Cmd-click, middle-click, and "open in new tab" work, and a screen reader announces a link.
 *   Keep buttons and other controls out of the default slot of such a card, because they would sit
 *   inside a link; put them in the `actions` slot, which is outside it.
 * - A plain click is turned into `dj-navigate` (detail `{ path, label }`, `label` being the title),
 *   which `@dojo-ng/history` turns into a navigation. A click with a modifier key, or one that is
 *   already prevented, is left to the browser. With no history installed, the link navigates
 *   normally, as a full page load.
 * - The `href` is the path with the history `base` added, so it stays correct under a prefix.
 * - `path` wins over `clickable`: with both set, the body is the link and not a button.
 * - Set `track` to follow the location: the link gets `aria-current="page"` while the location is
 *   this card's `path`. The package is only read when history is installed.
 *
 * Events: `dj-navigate` (detail `{ path, label }`).
 */
export class DjCard extends DojoElement {
	static override styles = styles;
	static override version = "0.1.1";
	@property({ reflect: true }) kind: "elevated" | "outlined" = "elevated";
	@property({ type: Boolean }) square = false;
	@property() title = "";
	@property() subtitle = "";
	@property({ attribute: "media-src" }) mediaSrc?: string;
	@property({ attribute: "media-title" }) mediaTitle?: string;
	@property({ type: Boolean }) clickable = false;
	/** An app path. Makes the body a link to it. Wins over `clickable`. */
	@property() path?: string;
	/** Mark the link `aria-current="page"` while the navigation location is `path`. Needs `@dojo-ng/history` installed. */
	@property({ type: Boolean }) track = false;

	/** The path of the current navigation location, while tracking. */
	@state() private current?: string;
	#unsubscribe?: () => void;

	override connectedCallback() {
		super.connectedCallback();
		this.#follow();
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		this.#stop();
	}

	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (changed.has("track")) {
			if (this.track) this.#follow();
			else this.#stop();
		}
	}

	/** Follow the location if tracking and history is (or later becomes) installed. */
	#follow() {
		if (!this.isConnected || this.#unsubscribe) return;
		const instance = getHistory();
		if (instance) {
			if (this.track) this.#unsubscribe = instance.subscribe((location) => { this.current = location.path; });
			else this.requestUpdate(); // the href may now need the base
		} else if (this.track || this.path) {
			// A WeakRef, so a card that is removed before history is installed (it may never be) is not kept alive.
			const self = new WeakRef(this);
			void whenHistory().then(() => { const card = self.deref(); if (card) card.#follow(); });
		}
	}

	#stop() {
		this.#unsubscribe?.();
		this.#unsubscribe = undefined;
		this.current = undefined;
	}

	#onLinkClick(event: MouseEvent) {
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		if (!getHistory() || !this.path) return;
		event.preventDefault();
		const detail: NavigateDetail = { path: this.path, label: this.title };
		this.emit("dj-navigate", { detail });
	}

	#renderBody() {
		const content = html`
				<slot name="header"></slot>
				${this.mediaSrc ? html`<div part="media" class="media ${this.square ? "media--square" : "media--16x9"}" title=${this.mediaTitle ?? nothing} style=${`background-image:url("${this.mediaSrc}")`}></div>` : nothing}
				${this.title ? html`<div class="title-wrap"><h2 class="title">${this.title}</h2>${this.subtitle ? html`<h3 class="subtitle">${this.subtitle}</h3>` : nothing}</div>` : nothing}
				<slot></slot>`;
		if (this.path) {
			const current = this.track && this.current === this.path;
			return html`<a part="body" class="body link" href=${getHistory()?.href(this.path) ?? this.path} aria-current=${current ? "page" : nothing} @click=${this.#onLinkClick}>${content}</a>`;
		}
		return html`<div part="body" class="body ${this.clickable ? "clickable" : ""}" role=${this.clickable ? "button" : nothing} tabindex=${this.clickable ? 0 : nothing}>${content}</div>`;
	}

	override render() {
		return html`<div part="root" class="root">
			${this.#renderBody()}
			<slot name="actions" part="actions" class="actions"></slot>
		</div>`;
	}
}
export default DjCard;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-navigate": CustomEvent<NavigateDetail>;
	}
}
