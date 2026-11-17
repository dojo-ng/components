/** A timer that can pause and resume, for a toast's time on screen. */

export interface Clock {
	now(): number;
	setTimeout(callback: () => void, ms: number): unknown;
	clearTimeout(handle: unknown): void;
}

export const realClock: Clock = {
	now: () => Date.now(),
	setTimeout: (callback, ms) => setTimeout(callback, ms),
	clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class Countdown {
	#remaining: number;
	#startedAt = 0;
	#handle: unknown = undefined;
	#running = false;

	constructor(
		private readonly clock: Clock,
		ms: number,
		private readonly onDone: () => void,
	) {
		this.#remaining = ms;
	}

	get running(): boolean { return this.#running; }
	get remaining(): number { return this.#running ? this.#remaining - (this.clock.now() - this.#startedAt) : this.#remaining; }

	/** Start or resume. Does nothing for an infinite time or when already running. */
	resume(): void {
		if (this.#running || !Number.isFinite(this.#remaining)) return;
		this.#running = true;
		this.#startedAt = this.clock.now();
		this.#handle = this.clock.setTimeout(() => {
			this.#running = false;
			this.#remaining = 0;
			this.onDone();
		}, Math.max(0, this.#remaining));
	}

	pause(): void {
		if (!this.#running) return;
		this.#remaining -= this.clock.now() - this.#startedAt;
		this.clock.clearTimeout(this.#handle);
		this.#running = false;
	}

	stop(): void {
		this.pause();
		this.#remaining = Infinity;
	}
}
