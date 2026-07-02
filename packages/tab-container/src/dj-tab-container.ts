import { html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/icon";
import styles from "./dj-tab-container.styles.js";

registerDefaults("dj", { close: "Close" });

export interface TabItem { name: string; disabled?: boolean; closeable?: boolean; }

/**
 * `<dj-tab-container>` — tabbed interface. `tabs` describes the buttons; the panels are
 * slotted children in the same order (one per tab). The active panel is shown, the rest
 * hidden. ARIA tablist/tab/tabpanel with roving arrow/Home/End keyboard. Local
 * coordination of slotted panels — no store needed.
 *
 * Events: `change` (detail: active index), `dj-tab-close` (detail: index). Parts: `tablist`, `tab`, `panels`.
 */
export class DjTabContainer extends DojoElement {
	static override styles = styles;
	static override version = "0.1.0";
	static override focusable = true;

	@property({ type: Array }) tabs: TabItem[] = [];
	@property({ attribute: "active-index", type: Number, reflect: true }) activeIndex = 0;
	@property({ attribute: "align-buttons", reflect: true }) alignButtons: "top" | "bottom" | "left" | "right" = "top";

	#i18n = new LocaleController(this);
	@state() private panelSlot?: HTMLSlotElement;

	private setActive(index: number) {
		const tab = this.tabs[index];
		if (!tab || tab.disabled) return;
		this.activeIndex = index;
		this.updatePanels();
		this.emit("change", { detail: index } as CustomEventInit);
		const btn = this.renderRoot.querySelectorAll<HTMLElement>(".tab")[index];
		btn?.focus();
	}

	private closeTab(index: number) {
		this.emit("dj-tab-close", { detail: { index } });
	}

	private onKeyDown(event: KeyboardEvent, index: number) {
		const total = this.tabs.length;
		const move = (i: number) => { event.preventDefault(); let n = i; do { n = (n + total) % total; } while (this.tabs[n]?.disabled && n !== i); this.setActive(n); };
		switch (event.key) {
			case "ArrowLeft": case "ArrowUp": move(index - 1); break;
			case "ArrowRight": case "ArrowDown": move(index + 1); break;
			case "Home": move(0); break;
			case "End": move(total - 1); break;
			case "Escape": if (this.tabs[index]?.closeable) this.closeTab(index); break;
		}
	}

	private updatePanels() {
		const panels = this.panelSlot?.assignedElements({ flatten: true }) ?? [];
		panels.forEach((p, i) => {
			(p as HTMLElement).hidden = i !== this.activeIndex;
			p.setAttribute("role", "tabpanel");
		});
	}

	protected override firstUpdated() {
		this.panelSlot = this.renderRoot.querySelector("slot") ?? undefined;
		this.updatePanels();
	}
	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (changed.has("activeIndex") || changed.has("tabs")) this.updatePanels();
	}

	override render() {
		return html`
			<div part="tablist" class="tablist" role="tablist" aria-orientation=${this.alignButtons === "left" || this.alignButtons === "right" ? "vertical" : "horizontal"}>
				${this.tabs.map((tab, i) => {
					const active = i === this.activeIndex;
					return html`<button
						part="tab"
						class="tab ${active ? "tab--active" : ""} ${tab.disabled ? "tab--disabled" : ""}"
						role="tab"
						type="button"
						aria-selected=${active ? "true" : "false"}
						aria-disabled=${tab.disabled ? "true" : "false"}
						tabindex=${active ? 0 : -1}
						?disabled=${tab.disabled}
						@click=${() => this.setActive(i)}
						@keydown=${(e: KeyboardEvent) => this.onKeyDown(e, i)}
					>
						<span>${tab.name}</span>
						${tab.closeable
							? html`<span class="close" role="button" aria-label=${messages.resolve("dj", this.#i18n.locale, "close") ?? "Close"} @click=${(e: Event) => { e.stopPropagation(); this.closeTab(i); }}><dj-icon size="small"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" fill="none"/></svg></dj-icon></span>`
							: nothing}
					</button>`;
				})}
			</div>
			<div part="panels" class="panels"><slot @slotchange=${() => this.updatePanels()}></slot></div>
		`;
	}
}
export default DjTabContainer;

declare global { interface GlobalEventHandlersEventMap { "dj-tab-close": CustomEvent<{ index: number }>; } }
