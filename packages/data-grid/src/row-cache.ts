import type { Row } from "./dj-data-grid.js";

/** An inclusive run of absolute row indices. */
export interface RowRun { start: number; end: number }

/**
 * The remote-mode row cache: rows stored in aligned blocks of `blockSize`, the blocks requested in
 * the current epoch, and the epoch itself. The grid owns one; hosts only ever see it through
 * `dj-rows-request` and `setRows`.
 */
export class RowCache {
	#blockSize = 100;
	#epoch = 0;
	#blocks = new Map<number, Row[]>();
	#requested = new Set<number>();

	get epoch(): number { return this.#epoch; }
	get blockSize(): number { return this.#blockSize; }

	/** Number of rows held. */
	get size(): number {
		let n = 0;
		for (const b of this.#blocks.values()) for (const r of b) if (r !== undefined) n++;
		return n;
	}

	/** Drop everything and start a new epoch, so answers to earlier requests are ignored. */
	clear(blockSize = this.#blockSize) {
		this.#blockSize = Math.max(1, Math.floor(blockSize));
		this.#blocks.clear();
		this.#requested.clear();
		this.#epoch++;
	}

	get(index: number): Row | undefined {
		const b = Math.floor(index / this.#blockSize);
		return this.#blocks.get(b)?.[index - b * this.#blockSize];
	}

	/** Blocks touching rows `first..last` that are neither cached nor requested in this epoch. */
	missing(first: number, last: number): number[] {
		const out: number[] = [];
		for (let b = Math.floor(first / this.#blockSize); b <= Math.floor(last / this.#blockSize); b++) {
			if (!this.#blocks.has(b) && !this.#requested.has(b)) out.push(b);
		}
		return out;
	}

	/** Mark blocks requested and return them as contiguous row runs, clamped to `rowCount`. */
	request(blocks: number[], rowCount: number): RowRun[] {
		const runs: RowRun[] = [];
		const bs = this.#blockSize;
		for (const b of blocks) {
			this.#requested.add(b);
			const start = b * bs;
			const end = Math.min(rowCount - 1, start + bs - 1);
			const last = runs[runs.length - 1];
			if (last && last.end + 1 === start) last.end = end;
			else runs.push({ start, end });
		}
		return runs;
	}

	/** Store rows from absolute index `start`. Rows outside `0..rowCount-1` are ignored. */
	put(start: number, rows: Row[], rowCount: number) {
		const bs = this.#blockSize;
		rows.forEach((row, i) => {
			const index = start + i;
			if (index < 0 || index >= rowCount) return;
			const b = Math.floor(index / bs);
			let block = this.#blocks.get(b);
			if (!block) this.#blocks.set(b, (block = []));
			block[index - b * bs] = row;
		});
	}

	/**
	 * While more than `limit` rows are held, drop the block farthest from rows `first..last`.
	 * Blocks inside that range are never dropped. A dropped block can be requested again.
	 */
	evict(limit: number, first: number, last: number) {
		const bs = this.#blockSize;
		const lo = first < 0 ? -1 : Math.floor(first / bs);
		const hi = last < 0 ? -1 : Math.floor(last / bs);
		const distance = (b: number) => (lo < 0 ? Infinity : b < lo ? lo - b : b > hi ? b - hi : 0);
		let size = this.size;
		while (size > limit) {
			let far = -1;
			let farDist = 0;
			for (const b of this.#blocks.keys()) {
				const d = distance(b);
				if (d > farDist) { far = b; farDist = d; }
			}
			if (far < 0) return;
			size -= this.#blocks.get(far)!.filter((r) => r !== undefined).length;
			this.#blocks.delete(far);
			this.#requested.delete(far);
		}
	}

	/** Cached rows in absolute order, with their indices. */
	entries(): { rows: Row[]; indices: number[] } {
		const rows: Row[] = [];
		const indices: number[] = [];
		const bs = this.#blockSize;
		for (const b of [...this.#blocks.keys()].sort((x, y) => x - y)) {
			this.#blocks.get(b)!.forEach((row, i) => {
				if (row === undefined) return;
				rows.push(row);
				indices.push(b * bs + i);
			});
		}
		return { rows, indices };
	}
}
