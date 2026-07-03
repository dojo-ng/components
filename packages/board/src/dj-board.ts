import { html, nothing, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import DojoElement, { reducedMotion } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import type { ListOption } from "@dojo-ng/list";
import "@dojo-ng/card";
import "@dojo-ng/popup";
import "@dojo-ng/list";
import styles from "./dj-board.styles.js";
import type { Card, CardMoveDetail } from "./apply-card-move.js";

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
 * appearance. The board is CONTROLLED: it never mutates `data` — every move emits
 * `dj-card-move` and the app applies it (the exported `applyCardMove` helper makes that one
 * line). Card content comes from `renderCard`, rendered inside the component-owned accessible
 * shell (so custom cards cannot regress accessibility), or defaults to a `dj-card` showing the
 * `card-title` field. Each card carries a move menu (Move up/down, Move to lane); WIP limits
 * are advisory (`n/limit` count plus an over-limit style hook, never blocking).
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

	@state() private menu: MenuContext | null = null;

	#i18n = new LocaleController(this);
	#menuAnchor?: HTMLElement;
	#warned = new Set<string>();

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

	#openMenu(anchor: HTMLElement, card: Card, laneValue: string, index: number, laneLen: number) {
		this.#menuAnchor = anchor;
		this.menu = { card, key: card[this.cardKey], laneValue, index, laneLen };
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
		let detail: CardMoveDetail | undefined;
		if (v === "__up" && m.index > 0) {
			detail = { card: m.card, key: m.key, from: m.laneValue, to: m.laneValue, fromIndex: m.index, toIndex: m.index - 1 };
		} else if (v === "__down" && m.index < m.laneLen - 1) {
			detail = { card: m.card, key: m.key, from: m.laneValue, to: m.laneValue, fromIndex: m.index, toIndex: m.index + 1 };
		} else if (v.startsWith("to:")) {
			const to = v.slice(3);
			detail = { card: m.card, key: m.key, from: m.laneValue, to, fromIndex: m.index, toIndex: this.#laneCards(to).length };
		}
		if (detail) this.emit("dj-card-move", { detail });
	}

	#cardShell(card: Card, laneValue: string, index: number, laneLen: number): TemplateResult {
		const key = card[this.cardKey];
		const title = String(card[this.cardTitle] ?? "");
		return html`<div part="card" class="card" role="listitem" data-key=${String(key)} aria-label=${title || nothing}>
			<div class="card-content" @click=${() => this.emit("dj-card-click", { detail: { card, key } })}>
				${this.renderCard ? this.renderCard(card) : html`<dj-card kind="outlined">${title}</dj-card>`}
			</div>
			<button
				part="move-button"
				class="move-btn"
				type="button"
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
		return html`
			<div part="board" class="board" role="group" aria-label=${this.label ?? nothing}>
				${lanes.map((lane) => {
					const cards = this.#laneCards(lane.value);
					const label = lane.label ?? lane.value;
					const over = lane.limit !== undefined && cards.length > lane.limit;
					return html`<div part="lane${over ? " lane-over" : ""}" class="lane ${over ? "lane--over" : ""}">
						<div part="lane-header" class="lane-header">
							<span part="lane-title" class="lane-title">${label}</span>
							<span part="lane-count" class="lane-count">${lane.limit !== undefined ? `${cards.length}/${lane.limit}` : cards.length}</span>
						</div>
						<div part="lane-body" class="lane-body" role="list" aria-label=${this.#msg("boardCards", { label, n: cards.length })}>
							${repeat(cards, (c) => String(c[this.cardKey]), (c, i) => this.#cardShell(c, lane.value, i, cards.length))}
						</div>
					</div>`;
				})}
			</div>
			<dj-popup .anchor=${this.#menuAnchor} .open=${this.menu !== null} .scrollLock=${false} @dj-close=${() => (this.menu = null)}>
				<dj-list menu .options=${this.#menuOptions()} .value=${""} @change=${(e: Event) => this.#onMenuSelect(e)}></dj-list>
			</dj-popup>
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
