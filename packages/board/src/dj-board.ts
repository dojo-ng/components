import { html, nothing, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import DojoElement, { reducedMotion } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import { DragZoneController } from "@dojo-ng/dnd";
import type { ListOption } from "@dojo-ng/list";
import "@dojo-ng/card";
import "@dojo-ng/popup";
import "@dojo-ng/list";
import styles from "./dj-board.styles.js";
import type { Card, CardMoveDetail } from "./apply-card-move.js";

let boardSeq = 0;

registerDefaults("dj", {
	boardMoveCard: "Move card",
	boardMoveUp: "Move up",
	boardMoveDown: "Move down",
	boardMoveTo: "Move to {lane}",
	boardMoved: "Moved to {lane}, position {pos} of {n}",
	boardCards: "{label}, {n} cards",
});
const EN: Record<string, string> = {
	boardMoveCard: "Move card", boardMoveUp: "Move up", boardMoveDown: "Move down",
	boardMoveTo: "Move to {lane}", boardMoved: "Moved to {lane}, position {pos} of {n}", boardCards: "{label}, {n} cards",
};

/** A lane definition: the `group-by` value it collects, an optional header label (defaults to
 *  the value), and an optional advisory WIP limit. */
export interface BoardLane {
	value: string;
	label?: string;
	limit?: number;
}

/** The move menu's context: which card it is open for, and where that card sits. */
interface MenuContext {
	card: Card;
	key: unknown;
	laneValue: string;
	index: number;
	laneLen: number;
}

/**
 * `<dj-board>` — a Kanban board over plain records. Lanes are the values of one field
 * (`group-by`); cards are the records of `data`, ordered within a lane by their order of
 * appearance. The board is CONTROLLED: it never mutates `data` — every move (menu, keyboard)
 * emits `dj-card-move` and the app applies it (the exported `applyCardMove` helper makes that
 * one line); focus then follows the moved card and the move is announced to assistive tech
 * once the app's data update lands. Card content comes from `renderCard`, rendered inside the
 * component-owned accessible shell (so custom cards cannot regress accessibility), or defaults
 * to a `dj-card` showing the `card-title` field. Keyboard: one tab stop (roving); arrows move
 * between cards and lanes, Home/End within a lane, Enter activates, Space or M opens the move
 * menu, and Ctrl/Cmd+arrows move the card itself. WIP limits are advisory (`n/limit` count and
 * an over-limit style hook, never blocking).
 *
 * Slots: none (cards come from `data`). Parts: `board`, `lane`, `lane-over`, `lane-header`,
 * `lane-title`, `lane-count`, `lane-body`, `card`, `move-button`.
 * Events: `dj-card-move` (detail `{ card, key, from, to, fromIndex, toIndex }`; the board never
 * applies it itself), `dj-card-click` (detail `{ card, key }`).
 *
 * @cssprop [--dj-board-lane-width=18rem] - Fixed width of each lane.
 * @cssprop [--dj-board-gap=1rem] - Gap between lanes.
 */
export class DjBoard extends DojoElement {
	static override styles = [styles, reducedMotion];
	static override version = "0.1.0";
	static override focusable = true;

	/** The cards (plain records). Lane order = order of appearance. Set in JavaScript. */
	@property({ attribute: false }) data: Card[] = [];
	/** Lane definitions in display order. Empty → lanes derive from distinct `group-by` values
	 *  in data order (explicit lanes recommended). Set in JavaScript. */
	@property({ attribute: false }) lanes: BoardLane[] = [];
	/** Field that assigns a card to a lane (compared as a string). */
	@property({ attribute: "group-by" }) groupBy = "status";
	/** Field giving a card's stable identity (must be unique across `data`). */
	@property({ attribute: "card-key" }) cardKey = "id";
	/** Field used for the default card content, the card's accessible name, and announcements. */
	@property({ attribute: "card-title" }) cardTitle = "title";
	/** Accessible name for the board. */
	@property() label?: string;
	/** Custom card content, rendered inside the component-owned shell. Set in JavaScript. */
	@property({ attribute: false }) renderCard?: (card: Card) => TemplateResult;
	/** Progressive enhancement: enable pointer drag of cards between lanes. The move menu and
	 *  keyboard shortcuts remain the accessibility contract (WCAG 2.5.7); drag never replaces them. */
	@property({ type: Boolean, reflect: true }) override draggable = false;

	@state() private menu: MenuContext | null = null;
	/** The card (by key, as a string) holding the roving tab stop. */
	@state() private activeKey: string | null = null;

	#i18n = new LocaleController(this);
	#menuAnchor?: HTMLElement;
	#warned = new Set<string>();
	/** A move we emitted and are waiting for the app to apply (controlled focus-follow). */
	#pending: { key: string; to: string } | null = null;
	/** One drag zone per lane while `draggable`; keyed by lane value. Group = this board only. */
	#zones = new Map<string, DragZoneController>();
	readonly #dndGroup = `dj-board-${++boardSeq}`;

	#msg(key: string, params?: Record<string, string | number>): string {
		return messages.resolve("dj", this.#i18n.locale, key, params) ?? EN[key] ?? key;
	}

	/** The lanes to display: the `lanes` property, or distinct `group-by` values in data order. */
	effectiveLanes(): BoardLane[] {
		if (this.lanes.length) return this.lanes;
		const out: BoardLane[] = [];
		const have = new Set<string>();
		for (const c of this.data) {
			const v = String(c[this.groupBy]);
			if (!have.has(v)) { have.add(v); out.push({ value: v }); }
		}
		return out;
	}

	#laneCards(laneValue: string): Card[] {
		return this.data.filter((c) => String(c[this.groupBy]) === laneValue);
	}

	/** Warn once per group-by value that matches no lane (those cards are not rendered). */
	#warnUnmatched(lanes: BoardLane[]) {
		const known = new Set(lanes.map((l) => l.value));
		for (const c of this.data) {
			const v = String(c[this.groupBy]);
			if (!known.has(v) && !this.#warned.has(v)) {
				this.#warned.add(v);
				console.warn(`<dj-board>: card ${this.groupBy}="${v}" matches no lane; those cards are not rendered.`);
			}
		}
	}

	// ------------------------------------------------------------------ focus

	#shellFor(key: string): HTMLElement | null {
		const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(key) : key;
		return this.renderRoot?.querySelector<HTMLElement>(`[data-key="${esc}"]`) ?? null;
	}

	#focusCard(key: string) {
		this.activeKey = key;
		const el = this.#shellFor(key);
		if (!el) return;
		// Focus without the browser's default scroll, then reveal the card ourselves. We do NOT
		// use scrollIntoView: Safari handles it unreliably here (the board scrolls horizontally,
		// the lane body vertically, and it often scrolls only one), and calling it before layout
		// settles races intermittently. Instead defer one frame, then walk the scrollable
		// ancestors and adjust each axis minimally, only when the card is actually out of view.
		el.focus({ preventScroll: true });
		this.#reveal(el);
	}

	/** Bring `el` into view, on both axes, one frame later so layout has settled. Walks the
	 *  scrollable ancestors — crossing the shadow boundary via the host and, last, the page
	 *  viewport — because the real scroller may live OUTSIDE this component (e.g. the demo lets
	 *  the page scroll horizontally, not the board). Re-reads the card's rect per container so
	 *  nested scrollers compose. Leaves a small MARGIN so a card that is partially clipped, or
	 *  sitting flush at an edge after Safari's own focus nudge, is pulled fully inside with
	 *  breathing room; a comfortably visible card is a no-op. */
	#reveal(el: HTMLElement) {
		const M = 12; // px of breathing room past the edge
		const scrollable = (v: string) => v === "auto" || v === "scroll" || v === "overlay";
		const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (fn: () => void) => fn();
		raf(() => {
			if (!el.isConnected) return;
			// 1. Element scroll containers, in-shadow and (after the host hop) in the light DOM,
			//    stopping before the root element — the page is handled as the viewport below.
			let node: Node | null = el.parentNode;
			while (node) {
				if (node instanceof ShadowRoot) { node = node.host; continue; }
				if (!(node instanceof HTMLElement)) break;
				if (node === document.documentElement || node === document.body) break;
				const st = getComputedStyle(node);
				const canY = scrollable(st.overflowY) && node.scrollHeight > node.clientHeight;
				const canX = scrollable(st.overflowX) && node.scrollWidth > node.clientWidth;
				if (canY || canX) {
					const er = el.getBoundingClientRect();
					const cr = node.getBoundingClientRect();
					if (canY) {
						if (er.top < cr.top + M) node.scrollTop -= cr.top + M - er.top;
						else if (er.bottom > cr.bottom - M) node.scrollTop += er.bottom - (cr.bottom - M);
					}
					if (canX) {
						if (er.left < cr.left + M) node.scrollLeft -= cr.left + M - er.left;
						else if (er.right > cr.right - M) node.scrollLeft += er.right - (cr.right - M);
					}
				}
				node = node.parentNode;
			}
			// 2. The page viewport (whichever of html/body scrolls). Re-read the rect after the
			//    in-shadow scrolls above so this only finishes what they didn't.
			if (typeof window === "undefined" || typeof window.scrollBy !== "function") return;
			const er = el.getBoundingClientRect();
			const vw = window.innerWidth, vh = window.innerHeight;
			let dx = 0, dy = 0;
			if (er.left < M) dx = er.left - M;
			else if (er.right > vw - M) dx = er.right - (vw - M);
			if (er.top < M) dy = er.top - M;
			else if (er.bottom > vh - M) dy = er.bottom - (vh - M);
			if (dx || dy) window.scrollBy(dx, dy);
		});
	}

	/** Where a card (by string key) sits: its lane list, lane index, and position. */
	#locate(key: string): { lanes: BoardLane[]; li: number; idx: number; cards: Card[] } | null {
		const lanes = this.effectiveLanes();
		for (let li = 0; li < lanes.length; li++) {
			const cards = this.#laneCards(lanes[li].value);
			const idx = cards.findIndex((c) => String(c[this.cardKey]) === key);
			if (idx !== -1) return { lanes, li, idx, cards };
		}
		return null;
	}

	#announce(msg: string) {
		const region = this.renderRoot?.querySelector(".announce");
		if (region) region.textContent = msg;
	}

	// ------------------------------------------------------------------ moves

	#emitMove(card: Card, from: string, to: string, fromIndex: number, toIndex: number) {
		const key = String(card[this.cardKey]);
		this.#pending = { key, to };
		this.emit("dj-card-move", { detail: { card, key: card[this.cardKey], from, to, fromIndex, toIndex } });
	}

	/** Controlled focus-follow: when the app applies the pending move (the card now sits in the
	 *  target lane), focus follows it and the move is announced. A data change that does NOT
	 *  apply the move clears the pending state silently — no announcement for a rejected move. */
	protected override updated(changed: Map<PropertyKey, unknown>) {
		this.#syncZones();
		if (!changed.has("data") || !this.#pending) return;
		const { key, to } = this.#pending;
		this.#pending = null;
		const card = this.data.find((c) => String(c[this.cardKey]) === key);
		if (!card || String(card[this.groupBy]) !== to) return;
		this.#focusCard(key);
		const laneCards = this.#laneCards(to);
		const lane = this.effectiveLanes().find((l) => l.value === to);
		this.#announce(this.#msg("boardMoved", { lane: lane?.label ?? to, pos: laneCards.indexOf(card) + 1, n: laneCards.length }));
	}

	// ------------------------------------------------------------------ drag (progressive)

	#laneBodyEl(value: string): HTMLElement | null {
		const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value;
		return this.renderRoot?.querySelector<HTMLElement>(`.lane-body[data-lane="${esc}"]`) ?? null;
	}

	#cardShellsIn(value: string): HTMLElement[] {
		const body = this.#laneBodyEl(value);
		return body ? [...body.querySelectorAll<HTMLElement>('[role="listitem"]')] : [];
	}

	/** A drag drop routes through the SAME emit path as the menu/keyboard moves, so focus-follow
	 *  and announcements are identical. */
	#applyDndMove(m: { key: string; from: string; to: string; fromIndex: number; toIndex: number }) {
		const card = this.data.find((c) => String(c[this.cardKey]) === m.key);
		if (!card) return;
		this.#emitMove(card, m.from, m.to, m.fromIndex, m.toIndex);
	}

	/** Keep one drag zone per lane while `draggable`; tear them down otherwise or as lanes change. */
	#syncZones() {
		const wanted = this.draggable ? new Set(this.effectiveLanes().map((l) => l.value)) : new Set<string>();
		for (const [value, ctrl] of this.#zones) {
			if (!wanted.has(value)) {
				ctrl.hostDisconnected();
				this.removeController(ctrl);
				this.#zones.delete(value);
			}
		}
		if (!this.draggable) return;
		for (const lane of this.effectiveLanes()) {
			const value = lane.value;
			if (this.#zones.has(value)) continue;
			const ctrl = new DragZoneController(this, {
				container: () => this.#laneBodyEl(value) as HTMLElement,
				items: () => this.#cardShellsIn(value),
				group: this.#dndGroup,
				zoneId: value,
				axis: "y",
				onMove: (mv) => this.#applyDndMove(mv),
			});
			this.#zones.set(value, ctrl);
		}
	}

	// ------------------------------------------------------------------ menu

	#openMenu(anchor: HTMLElement, card: Card, laneValue: string, index: number, laneLen: number) {
		this.#pending = null;
		this.#menuAnchor = anchor;
		this.menu = { card, key: card[this.cardKey], laneValue, index, laneLen };
		void this.updateComplete.then(() => this.renderRoot?.querySelector<HTMLElement & { focus(): void }>("dj-list")?.focus());
	}

	#menuOptions(): ListOption[] {
		const m = this.menu;
		if (!m) return [];
		const opts: ListOption[] = [
			{ value: "__up", label: this.#msg("boardMoveUp"), disabled: m.index === 0 },
			{ value: "__down", label: this.#msg("boardMoveDown"), disabled: m.index === m.laneLen - 1 },
		];
		for (const l of this.effectiveLanes()) {
			if (l.value !== m.laneValue) {
				opts.push({ value: `to:${l.value}`, label: this.#msg("boardMoveTo", { lane: l.label ?? l.value }) });
			}
		}
		return opts;
	}

	#onMenuSelect(e: Event) {
		const m = this.menu;
		this.menu = null;
		if (!m) return;
		const v = (e.target as HTMLElement & { value: string }).value;
		// Keyboard continuity: put focus back on the card now; a successful move re-focuses via
		// the pending mechanism once the app's data update lands.
		this.#focusCard(String(m.key));
		if (v === "__up" && m.index > 0) {
			this.#emitMove(m.card, m.laneValue, m.laneValue, m.index, m.index - 1);
		} else if (v === "__down" && m.index < m.laneLen - 1) {
			this.#emitMove(m.card, m.laneValue, m.laneValue, m.index, m.index + 1);
		} else if (v.startsWith("to:")) {
			const to = v.slice(3);
			this.#emitMove(m.card, m.laneValue, to, m.index, this.#laneCards(to).length);
		}
	}

	#onMenuClose() {
		this.menu = null;
		if (this.activeKey) this.#shellFor(this.activeKey)?.focus();
	}

	// ------------------------------------------------------------------ keyboard

	#onKeydown(e: KeyboardEvent) {
		const shell = (e.target as HTMLElement).closest?.('[role="listitem"]') as HTMLElement | null;
		if (!shell) return;
		const key = shell.getAttribute("data-key");
		if (key === null) return;
		const pos = this.#locate(key);
		if (!pos) return;
		const { lanes, li, idx, cards } = pos;
		const card = cards[idx];
		const laneValue = lanes[li].value;
		const mod = e.ctrlKey || e.metaKey;

		const focusInLane = (i: number) => {
			const target = cards[Math.min(Math.max(i, 0), cards.length - 1)];
			if (target) this.#focusCard(String(target[this.cardKey]));
		};
		const nearestLane = (dir: 1 | -1): { lane: BoardLane; cards: Card[] } | null => {
			for (let i = li + dir; i >= 0 && i < lanes.length; i += dir) {
				const c = this.#laneCards(lanes[i].value);
				if (c.length) return { lane: lanes[i], cards: c };
			}
			return null;
		};

		switch (e.key) {
			case "ArrowDown":
			case "ArrowUp": {
				const dir = e.key === "ArrowDown" ? 1 : -1;
				e.preventDefault();
				this.#pending = null;
				if (mod) {
					const to = idx + dir;
					if (to >= 0 && to < cards.length) this.#emitMove(card, laneValue, laneValue, idx, to);
				} else {
					focusInLane(idx + dir);
				}
				break;
			}
			case "ArrowRight":
			case "ArrowLeft": {
				const dir = e.key === "ArrowRight" ? (1 as const) : (-1 as const);
				e.preventDefault();
				this.#pending = null;
				if (mod) {
					// Move to the ADJACENT lane (empty lanes included), appended at the end.
					const target = lanes[li + dir];
					if (target) this.#emitMove(card, laneValue, target.value, idx, this.#laneCards(target.value).length);
				} else {
					// Navigate to the same (clamped) position in the nearest NON-empty lane.
					const t = nearestLane(dir);
					if (t) {
						const target = t.cards[Math.min(idx, t.cards.length - 1)];
						this.#focusCard(String(target[this.cardKey]));
					}
				}
				break;
			}
			case "Home":
				e.preventDefault();
				focusInLane(0);
				break;
			case "End":
				e.preventDefault();
				focusInLane(cards.length - 1);
				break;
			case "Enter":
				e.preventDefault();
				this.emit("dj-card-click", { detail: { card, key: card[this.cardKey] } });
				break;
			case " ":
			case "m":
			case "M": {
				e.preventDefault();
				const btn = shell.querySelector<HTMLElement>('[part="move-button"]');
				this.#openMenu(btn ?? shell, card, laneValue, idx, cards.length);
				break;
			}
		}
	}

	// ------------------------------------------------------------------ render

	#cardShell(card: Card, laneValue: string, index: number, laneLen: number, tabbable: boolean): TemplateResult {
		const key = card[this.cardKey];
		const title = String(card[this.cardTitle] ?? "");
		return html`<div
			part="card"
			class="card"
			role="listitem"
			data-key=${String(key)}
			tabindex=${tabbable ? "0" : "-1"}
			aria-label=${title || nothing}
		>
			<div class="card-content" @click=${() => this.emit("dj-card-click", { detail: { card, key } })}>
				${this.renderCard ? this.renderCard(card) : html`<dj-card kind="outlined">${title}</dj-card>`}
			</div>
			<button
				part="move-button"
				class="move-btn"
				type="button"
				tabindex="-1"
				aria-haspopup="menu"
				aria-expanded=${this.menu?.key === key ? "true" : "false"}
				aria-label=${this.#msg("boardMoveCard")}
				@click=${(e: Event) => this.#openMenu(e.currentTarget as HTMLElement, card, laneValue, index, laneLen)}
			><span aria-hidden="true">⋮</span></button>
		</div>`;
	}

	override render() {
		const lanes = this.effectiveLanes();
		this.#warnUnmatched(lanes);
		const cardsByLane = lanes.map((l) => this.#laneCards(l.value));
		const allKeys = cardsByLane.flat().map((c) => String(c[this.cardKey]));
		const roving = this.activeKey !== null && allKeys.includes(this.activeKey) ? this.activeKey : allKeys[0] ?? null;
		return html`
			<div
				part="board"
				class="board"
				role="group"
				aria-label=${this.label ?? nothing}
				tabindex=${allKeys.length ? nothing : "0"}
				@keydown=${(e: KeyboardEvent) => this.#onKeydown(e)}
			>
				${lanes.map((lane, li) => {
					const cards = cardsByLane[li];
					const label = lane.label ?? lane.value;
					const over = lane.limit !== undefined && cards.length > lane.limit;
					return html`<div part="lane${over ? " lane-over" : ""}" class="lane ${over ? "lane--over" : ""}">
						<div part="lane-header" class="lane-header">
							<span part="lane-title" class="lane-title">${label}</span>
							<span part="lane-count" class="lane-count">${lane.limit !== undefined ? `${cards.length}/${lane.limit}` : cards.length}</span>
						</div>
						<div part="lane-body" class="lane-body" data-lane=${lane.value} role="list" aria-label=${this.#msg("boardCards", { label, n: cards.length })}>
							${repeat(cards, (c) => String(c[this.cardKey]), (c, i) => this.#cardShell(c, lane.value, i, cards.length, String(c[this.cardKey]) === roving))}
						</div>
					</div>`;
				})}
			</div>
			<dj-popup .anchor=${this.#menuAnchor} .open=${this.menu !== null} .scrollLock=${false} @dj-close=${() => this.#onMenuClose()}>
				<dj-list menu .options=${this.#menuOptions()} .value=${""} @change=${(e: Event) => this.#onMenuSelect(e)}></dj-list>
			</dj-popup>
			<div class="announce" aria-live="polite"></div>
		`;
	}
}
export default DjBoard;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-card-move": CustomEvent<CardMoveDetail>;
		"dj-card-click": CustomEvent<{ card: Card; key: unknown }>;
	}
}
