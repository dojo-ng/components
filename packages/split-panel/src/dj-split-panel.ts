import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults, getDir } from "@dojo-ng/i18n";
import styles from "./dj-split-panel.styles.js";

registerDefaults("dj", { resize: "Resize" });
const EN: Record<string, string> = { resize: "Resize" };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * `<dj-split-panel>` — two resizable panes with a draggable divider between them.
 *
 * Put the panes in the `start` and `end` slots. `position` is the start pane's share of the space,
 * as a percent from 0 to 100. The host needs a size, because the panes fill it: for a horizontal
 * split, give it a height.
 *
 * #### Layout
 * - `orientation="horizontal"` (the default) puts the panes side by side with a vertical divider.
 *   `vertical` stacks them with a horizontal divider.
 * - The panes always divide in the ratio `position` : (100 − `position`).
 * - Minimum pane sizes come from CSS, not from properties: set `--dj-split-panel-min-start` and
 *   `--dj-split-panel-min-end` in any length unit, and dragging stops at that size.
 * - The order follows the writing direction, so in a right-to-left page the start pane is on the
 *   right with no extra work.
 * - The divider bar is drawn by the component. Put custom grip content in the optional `divider`
 *   slot.
 * - For three panes, nest a second `dj-split-panel` inside a slot of the first.
 *
 * #### Resizing
 * - Drag the divider with a mouse, a trackpad, or touch.
 * - Or focus the divider and use the keyboard, so resizing never requires dragging (WCAG 2.5.7):
 *   the arrow keys move it by 1 (Shift: by 10), Home moves it to 0, and End to 100. A horizontal
 *   split uses Left and Right in the reading direction; a vertical split uses Up and Down.
 * - `dj-reposition` fires when the split settles: once when a drag ends, and once per key press.
 *
 * #### Accessibility
 * - The divider has `role="separator"`, with `aria-valuenow`, `aria-valuemin`, and
 *   `aria-valuemax` tracking `position`.
 * - Its `aria-orientation` is the divider's own direction, so a horizontal split has a vertical
 *   separator.
 *
 * Slots: `start` — the first pane; `end` — the second pane; `divider` — optional custom grip
 * content (the divider bar itself stays shadow-side).
 * Parts: `start`, `end`, `divider`.
 * Events: `dj-reposition` (detail `{ position }`) when the split settles.
 *
 * @cssprop [--dj-split-panel-min-start=0] - Minimum size of the start pane (any length).
 * @cssprop [--dj-split-panel-min-end=0] - Minimum size of the end pane (any length).
 * @cssprop [--dj-split-panel-divider-width=4px] - Thickness of the divider bar.
 * @cssprop [--dj-split-panel-divider-color=var(--dj-color-border)] - Divider bar color.
 */
export class DjSplitPanel extends DojoElement {
	static override styles = styles;
	static override version = "0.1.1";
	/** The divider is a keyboard focus stop, so the focus trap counts it. */
	static override focusable = true;

	/** Layout axis. `horizontal` = panes side by side (vertical divider); `vertical` = stacked. */
	@property({ reflect: true }) orientation: "horizontal" | "vertical" = "horizontal";
	/** The start pane's share of the host, as a percent (0–100). */
	@property({ type: Number, reflect: true }) position = 50;
	/** When set, the divider is inert (no drag, no keyboard, not a tab stop). */
	@property({ type: Boolean, reflect: true }) disabled = false;

	#i18n = new LocaleController(this);
	#dragging = false;

	#msg(key: string, params?: Record<string, string | number>): string {
		return messages.resolve("dj", this.#i18n.locale, key, params) ?? EN[key] ?? key;
	}

	get #divider(): HTMLElement | null {
		return (this.renderRoot?.querySelector(".divider") as HTMLElement | null) ?? null;
	}

	/** Grid template for the current position + orientation. Start/end tracks are `position`fr and
	 * `(100 − position)`fr floored by the min-size tokens; the divider is its own fixed track.
	 * fr values are literals (no `calc()` with fr), so this holds on the Safari 15 baseline. */
	#template(): string {
		const p = clamp(this.position, 0, 100);
		const q = 100 - p;
		const dw = "var(--dj-split-panel-divider-width, 4px)";
		const start = `minmax(var(--dj-split-panel-min-start, 0), ${p}fr)`;
		const end = `minmax(var(--dj-split-panel-min-end, 0), ${q}fr)`;
		return this.orientation === "vertical"
			? `grid-template-rows: ${start} ${dw} ${end}; grid-template-columns: 1fr;`
			: `grid-template-columns: ${start} ${dw} ${end}; grid-template-rows: 1fr;`;
	}

	/** Set position from a pointer, mapping the offset within the host rect to a percent. */
	#applyPointer(e: PointerEvent) {
		const rect = this.getBoundingClientRect();
		let pct: number;
		if (this.orientation === "vertical") {
			pct = rect.height ? ((e.clientY - rect.top) / rect.height) * 100 : this.position;
		} else {
			pct = rect.width ? ((e.clientX - rect.left) / rect.width) * 100 : this.position;
			if (getDir(this) === "rtl") pct = 100 - pct;
		}
		this.position = clamp(pct, 0, 100);
	}

	#onPointerDown = (e: PointerEvent) => {
		if (this.disabled) return;
		this.#dragging = true;
		const d = this.#divider;
		if (d && typeof d.setPointerCapture === "function") {
			try { d.setPointerCapture(e.pointerId); } catch { /* capture unsupported */ }
		}
		e.preventDefault();
		this.#applyPointer(e);
	};
	#onPointerMove = (e: PointerEvent) => {
		if (this.#dragging) this.#applyPointer(e);
	};
	#onPointerUp = (e: PointerEvent) => {
		if (!this.#dragging) return;
		this.#dragging = false;
		const d = this.#divider;
		if (d && typeof d.releasePointerCapture === "function") {
			try { d.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
		}
		// Settle: emit once, at the end of the drag.
		this.emit("dj-reposition", { detail: { position: this.position } });
	};

	#onKeydown = (e: KeyboardEvent) => {
		if (this.disabled) return;
		const step = e.shiftKey ? 10 : 1;
		const horizontal = this.orientation !== "vertical";
		const rtl = horizontal && getDir(this) === "rtl";
		let next: number | undefined;
		switch (e.key) {
			case "ArrowRight": if (horizontal) next = this.position + (rtl ? -step : step); break;
			case "ArrowLeft": if (horizontal) next = this.position + (rtl ? step : -step); break;
			case "ArrowDown": if (!horizontal) next = this.position + step; break;
			case "ArrowUp": if (!horizontal) next = this.position - step; break;
			case "Home": next = 0; break;
			case "End": next = 100; break;
		}
		if (next === undefined) return;
		e.preventDefault();
		this.position = clamp(next, 0, 100);
		// Keyboard settles per keypress.
		this.emit("dj-reposition", { detail: { position: this.position } });
	};

	override render() {
		const horizontal = this.orientation !== "vertical";
		return html`
			<div class="grid" style=${this.#template()}>
				<div class="pane pane--start" part="start"><slot name="start"></slot></div>
				<div
					class="divider"
					part="divider"
					role="separator"
					tabindex=${this.disabled ? -1 : 0}
					aria-orientation=${horizontal ? "vertical" : "horizontal"}
					aria-valuenow=${Math.round(clamp(this.position, 0, 100))}
					aria-valuemin="0"
					aria-valuemax="100"
					aria-label=${this.#msg("resize")}
					aria-disabled=${this.disabled ? "true" : nothing}
					@pointerdown=${this.#onPointerDown}
					@pointermove=${this.#onPointerMove}
					@pointerup=${this.#onPointerUp}
					@keydown=${this.#onKeydown}
				>
					<slot name="divider"></slot>
				</div>
				<div class="pane pane--end" part="end"><slot name="end"></slot></div>
			</div>
		`;
	}
}
export default DjSplitPanel;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-reposition": CustomEvent<{ position: number }>;
	}
}
