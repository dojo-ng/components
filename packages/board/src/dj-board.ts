import { html, nothing, type TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import styles from "./dj-board.styles.js";
import type { Card } from "./apply-card-move.js";

/** A lane definition: the `group-by` value it collects, an optional header label (defaults to
 *  the value), and an optional advisory WIP limit. */
export interface BoardLane {
	value: string;
	label?: string;
	limit?: number;
}

/**
 * `<dj-board>` — a Kanban board over plain records. Lanes are the values of one field
 * (`group-by`); cards are the records of `data`, ordered within a lane by their order of
 * appearance. The board is CONTROLLED: it never mutates `data` — moves (menu, keyboard) emit
 * `dj-card-move` and the app applies them (the exported `applyCardMove` helper makes that one
 * line). Card content comes from `renderCard` (rendered inside the component-owned accessible
 * shell) or defaults to the `card-title` field.
 *
 * K1 SCAFFOLD: properties and container only. Lanes/cards render in K2; moves/menu in K3;
 * keyboard, focus-follow, and announcements in K4 (see dj-board-spec.md).
 */
export class DjBoard extends DojoElement {
	static override styles = styles;
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

	override render() {
		return html`<div part="board" class="board" role="group" aria-label=${this.label ?? nothing}></div>`;
	}
}
export default DjBoard;
