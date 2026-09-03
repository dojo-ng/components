import { html } from "lit";
import { property, state } from "lit/decorators.js";
import DojoElement, { DojoFormControl, FormControl } from "@dojo-ng/dojo-element";
import { LocaleController, dateTimeFormat, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/icon";
import styles from "./dj-calendar.styles.js";

registerDefaults("dj", { prevMonth: "Previous month", nextMonth: "Next month" });

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s?: string): Date | undefined => {
	if (!s) return undefined;
	const [y, m, d] = s.split("-").map(Number);
	return y && m && d ? new Date(y, m - 1, d) : undefined;
};
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * `<dj-calendar>` — a form-associated month-grid date picker. `value` is an ISO date
 * (yyyy-mm-dd). Localizes month and weekday names via Intl (set `locale`). Keyboard:
 * arrows move by day/week, PageUp/PageDown change month, Enter/Space select. `min`/`max`
 * (ISO) bound selection. Composes `<dj-icon>` for navigation.
 *
 * Functional core; year-picker popup and range selection are deferred. Parts: `header`, `grid`, `day`.
 */
export class DjCalendar extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles = styles;
	static override version = "0.1.0";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;
	#i18n = new LocaleController(this);

	/** The locale used for formatting: the `locale` property if set, else the ambient locale. */
	private get loc() { return this.locale ?? this.#i18n.locale; }

	@property() value = "";
	@property({ reflect: true }) name?: string;
	@property() min?: string;
	@property() max?: string;
	@property() locale?: string;
	@property({ attribute: "first-day-of-week", type: Number }) firstDayOfWeek = 0;

	@state() private viewYear = new Date().getFullYear();
	@state() private viewMonth = new Date().getMonth();
	@state() private focused: Date = new Date();

	constructor() { super(); this.#internals = this.attachInternals(); }
	get validity(): ValidityState { return this.#internals.validity; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	formResetCallback() { this.value = this.getAttribute("value") ?? ""; this.sync(); }

	private sync() { this.#internals.setFormValue(this.value || null); }

	override connectedCallback() {
		super.connectedCallback();
		const v = parse(this.value);
		const start = v ?? new Date();
		this.viewYear = start.getFullYear();
		this.viewMonth = start.getMonth();
		this.focused = v ?? new Date();
	}
	protected override firstUpdated() { this.sync(); }
	protected override updated(c: Map<PropertyKey, unknown>) {
		if (c.has("value")) {
			const v = parse(this.value);
			if (v) { this.viewYear = v.getFullYear(); this.viewMonth = v.getMonth(); this.focused = v; }
			this.sync();
		}
	}

	private get min_() { return parse(this.min); }
	private get max_() { return parse(this.max); }
	private outOfRange(d: Date) {
		if (this.min_ && d < this.min_ && !sameDay(d, this.min_)) return true;
		if (this.max_ && d > this.max_ && !sameDay(d, this.max_)) return true;
		return false;
	}

	private monthNames() { return dateTimeFormat(this.loc, { month: "long", year: "numeric" }); }
	private weekdayNames() {
		const fmt = dateTimeFormat(this.loc, { weekday: "short" });
		const names: string[] = [];
		// 2023-01-01 is a Sunday; build 7 starting from firstDayOfWeek.
		for (let i = 0; i < 7; i++) names.push(fmt.format(new Date(2023, 0, 1 + ((this.firstDayOfWeek + i) % 7))));
		return names;
	}

	private select(d: Date) {
		if (this.outOfRange(d)) return;
		this.value = iso(d);
		this.focused = d;
		this.sync();
		this.emit("change");
	}

	private moveFocus(deltaDays: number) {
		const d = new Date(this.focused);
		d.setDate(d.getDate() + deltaDays);
		this.focused = d;
		this.viewYear = d.getFullYear();
		this.viewMonth = d.getMonth();
		void this.updateComplete.then(() => {
			this.renderRoot.querySelector<HTMLElement>(".day--focused")?.focus();
		});
	}

	private onGridKeyDown(e: KeyboardEvent) {
		switch (e.key) {
			case "ArrowLeft": e.preventDefault(); this.moveFocus(-1); break;
			case "ArrowRight": e.preventDefault(); this.moveFocus(1); break;
			case "ArrowUp": e.preventDefault(); this.moveFocus(-7); break;
			case "ArrowDown": e.preventDefault(); this.moveFocus(7); break;
			case "PageUp": e.preventDefault(); this.moveFocus(-28); break;
			case "PageDown": e.preventDefault(); this.moveFocus(28); break;
			case "Enter": case " ": e.preventDefault(); this.select(this.focused); break;
		}
	}

	private changeMonth(delta: number) {
		const d = new Date(this.viewYear, this.viewMonth + delta, 1);
		this.viewYear = d.getFullYear();
		this.viewMonth = d.getMonth();
	}

	override render() {
		const selected = parse(this.value);
		const today = new Date();
		const first = new Date(this.viewYear, this.viewMonth, 1);
		const offset = (first.getDay() - this.firstDayOfWeek + 7) % 7;
		const startGrid = new Date(this.viewYear, this.viewMonth, 1 - offset);
		const days: Date[] = [];
		for (let i = 0; i < 42; i++) { const d = new Date(startGrid); d.setDate(startGrid.getDate() + i); days.push(d); }

		return html`
			<div part="header" class="header">
				<button class="nav" type="button" aria-label=${messages.resolve("dj", this.loc, "prevMonth") ?? "Previous month"} @click=${() => this.changeMonth(-1)}>
					<dj-icon><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg></dj-icon>
				</button>
				<span class="month-label">${this.monthNames().format(first)}</span>
				<button class="nav" type="button" aria-label=${messages.resolve("dj", this.loc, "nextMonth") ?? "Next month"} @click=${() => this.changeMonth(1)}>
					<dj-icon><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg></dj-icon>
				</button>
			</div>
			<div part="grid" class="grid" role="grid" @keydown=${this.onGridKeyDown}>
				<div role="row" class="dj-cal-row">${this.weekdayNames().map((w) => html`<div class="weekday" role="columnheader">${w}</div>`)}</div>
				${[0, 1, 2, 3, 4, 5].map((wk) => html`<div role="row" class="dj-cal-row">${days.slice(wk * 7, wk * 7 + 7).map((d) => {
					const outside = d.getMonth() !== this.viewMonth;
					const isSel = selected ? sameDay(d, selected) : false;
					const isToday = sameDay(d, today);
					const isFocused = sameDay(d, this.focused);
					const disabled = this.outOfRange(d);
					return html`<button
						type="button"
						role="gridcell"
						part="day"
						class="day ${outside ? "day--outside" : ""} ${isToday ? "day--today" : ""} ${isSel ? "day--selected" : ""} ${isFocused ? "day--focused" : ""}"
						aria-selected=${isSel ? "true" : "false"}
						aria-label=${dateTimeFormat(this.loc, { dateStyle: "full" }).format(d)}
						tabindex=${isFocused ? 0 : -1}
						?disabled=${disabled}
						@click=${() => this.select(d)}
					>${d.getDate()}</button>`;})}</div>`)}
			</div>
		`;
	}
}
export default DjCalendar;
