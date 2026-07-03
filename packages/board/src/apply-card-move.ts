/** A card is a plain record; the board never wraps or mutates it. */
export type Card = Record<string, unknown>;

/** Detail payload of the `dj-card-move` event. `toIndex` is the card's position within the
 *  TARGET lane after the move. */
export interface CardMoveDetail {
	card: Card;
	key: unknown;
	from: string;
	to: string;
	fromIndex: number;
	toIndex: number;
}

/**
 * Apply a `dj-card-move` to a data array: pure — returns a NEW array with a shallow-copied
 * card whose `groupBy` field is set to the target lane, re-inserted so it sits at
 * `detail.toIndex` within that lane (lane order = order of appearance in the array). Neither
 * the input array nor the original card is mutated. The typical consumer handler is one line:
 * `board.data = applyCardMove(board.data, e.detail, board.groupBy)`.
 */
export function applyCardMove(data: Card[], detail: CardMoveDetail, groupBy: string): Card[] {
	const i = data.indexOf(detail.card);
	if (i === -1) return data;
	const moved = { ...detail.card, [groupBy]: detail.to };
	const rest = data.filter((_, idx) => idx !== i);
	// Insert so `moved` becomes the toIndex-th member of its lane; past the lane's end (or an
	// empty lane) appends at the array end, which is still last-in-lane by appearance order.
	let insertAt = rest.length;
	let seen = 0;
	for (let idx = 0; idx < rest.length; idx++) {
		if (String(rest[idx][groupBy]) === detail.to) {
			if (seen === detail.toIndex) { insertAt = idx; break; }
			seen++;
		}
	}
	return [...rest.slice(0, insertAt), moved, ...rest.slice(insertAt)];
}
