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
 * hidden. ARIA tablist/tab/tabpanel with roving arrow/Home/End keyboard; arrows, Home and End
 * skip disabled tabs. Delete closes a `closeable` tab (the tab advertises it with
 * `aria-keyshortcuts`); its close icon is for the pointer only, so no button sits inside a tab.
 * If `active-index` points at no tab or a disabled one, the first enabled tab keeps the Tab-key
 * stop. Each tab controls its panel (`aria-controls`, where the browser supports element
 * references) and each panel is labelled with its tab's name unless it has its own label.
 * Inactive panels stay hidden even when page CSS sets their `display`. Local coordination of
 * slotted panels — no store needed.
 *
 * Events: `change` (detail: active index), `dj-tab-close` (detail: index). Parts: `tablist`, `tab`, `panels`.
 */
export class DjTabContainer extends DojoElement {
	static override styles = styles;
	static override version = "0.1.1";
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

	/** The first enabled tab at or after `from`, stepping by `step` (wrapping); -1 if none. */
	#enabledFrom(from: number, step: 1 | -1): number {
		const total = this.tabs.length;
		for (let k = 0; k < total; k++) {
			const n = (((from + k * step) % total) + total) % total;
			if (!this.tabs[n]?.disabled) return n;
		}
		return -1;
	}

	/** The tab that holds the Tab-key stop: the active one, or the first enabled tab when
	 * `activeIndex` is out of range or disabled. */
	#stopIndex(): number {
		const t = this.tabs[this.activeIndex];
		if (t && !t.disabled) return this.activeIndex;
		return this.#enabledFrom(0, 1);
	}

	private onKeyDown(event: KeyboardEvent, index: number) {
		const go = (from: number, step: 1 | -1) => {
			event.preventDefault();
			const n = this.#enabledFrom(from, step);
			if (n >= 0) this.setActive(n);
		};
		switch (event.key) {
			case "ArrowLeft": case "ArrowUp": go(index - 1, -1); break;
			case "ArrowRight": case "ArrowDown": go(index + 1, 1); break;
			case "Home": go(0, 1); break;
			case "End": go(this.tabs.length - 1, -1); break;
			case "Delete": if (this.tabs[index]?.closeable) { event.preventDefault(); this.closeTab(index); } break;
		}
	}

	/** Panel labels this component wrote, so a later rename can replace them. */
	#ownLabels = new WeakMap<Element, string>();

	private updatePanels() {
		const panels = this.panelSlot?.assignedElements({ flatten: true }) ?? [];
		const buttons = this.renderRoot.querySelectorAll<HTMLElement>(".tab");
		panels.forEach((p, i) => {
			(p as HTMLElement).hidden = i !== this.activeIndex;
			p.setAttribute("role", "tabpanel");
			// The tab lives in this shadow root, so an id reference from the light-DOM panel cannot
			// reach it; label the panel with the tab's name instead, unless the page labelled it.
			const name = this.tabs[i]?.name;
			const current = p.getAttribute("aria-label");
			const ours = this.#ownLabels.get(p);
			const pageLabelled = p.hasAttribute("aria-labelledby") || (current !== null && current !== ours);
			if (name && !pageLabelled) { p.setAttribute("aria-label", name); this.#ownLabels.set(p, name); }
			const btn = buttons[i] as (HTMLElement & { ariaControlsElements?: Element[] | null }) | undefined;
			if (btn && "ariaControlsElements" in btn) btn.ariaControlsElements = [p];
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
					const stop = i === this.#stopIndex();
					return html`<button
						part="tab"
						class="tab ${active ? "tab--active" : ""} ${tab.disabled ? "tab--disabled" : ""}"
						role="tab"
						type="button"
						aria-selected=${active ? "true" : "false"}
						aria-disabled=${tab.disabled ? "true" : "false"}
						aria-keyshortcuts=${tab.closeable ? "Delete" : nothing}
						tabindex=${stop ? 0 : -1}
						?disabled=${tab.disabled}
						@click=${() => this.setActive(i)}
						@keydown=${(e: KeyboardEvent) => this.onKeyDown(e, i)}
					>
						<span>${tab.name}</span>
						${tab.closeable
							? html`<span class="close" aria-hidden="true" title=${messages.resolve("dj", this.#i18n.locale, "close") ?? "Close"} @click=${(e: Event) => { e.stopPropagation(); this.closeTab(i); }}><dj-icon size="small"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" fill="none"/></svg></dj-icon></span>`
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
