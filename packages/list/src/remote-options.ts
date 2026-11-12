import type { ListOption } from "./dj-list.js";

/** Detail of `dj-options-request`: the text to match, the index of the first option wanted, and the
 *  epoch to pass back to `setOptions`. */
export interface OptionsRequestDetail { query: string; offset: number; epoch: number; }

/** Second argument of `setOptions`: the request's `epoch`, the total number of matching options
 *  when known, and whether these options follow the ones already loaded. */
export interface SetOptionsInit { epoch: number; total?: number; append?: boolean; }

interface RemoteHost {
	options: ListOption[];
	requestDelay?: number;
	requestUpdate(): void;
	dispatchEvent(e: Event): boolean;
}

/**
 * The options-from-a-server contract shared by `dj-select` and `dj-typeahead`.
 *
 * The component emits `dj-options-request` and the app answers with `setOptions(options, init)`.
 * A new query starts a new epoch; an answer carrying an older epoch is dropped, so the app never
 * has to cancel a request. Paging (`more`) stays in the current epoch and asks from the number of
 * options already loaded. Typing is debounced by the host's `requestDelay`.
 */
export class RemoteOptions {
	epoch = 0;
	loading = false;
	/** Matching options on the server, when the app said; undefined means "unknown". */
	total?: number;
	#query = "";
	#exhausted = false;
	#pendingOffset = -1;
	#timer?: ReturnType<typeof setTimeout>;

	constructor(private host: RemoteHost) {}

	/** True once the loaded options reach `total`, or a page came back empty. */
	get complete(): boolean {
		return this.#exhausted || (this.total !== undefined && this.host.options.length >= this.total);
	}

	/** Start a new epoch for `query`. Debounced unless `now`. */
	request(query: string, now = false) {
		clearTimeout(this.#timer);
		this.epoch++;
		this.#query = query;
		this.#exhausted = false;
		this.total = undefined;
		this.loading = true;
		this.host.requestUpdate();
		const send = () => this.#send(0);
		const delay = this.host.requestDelay ?? 0;
		if (now || delay <= 0) send();
		else this.#timer = setTimeout(send, delay);
	}

	/** Ask for the next page, if there may be one and none is on its way. */
	more() {
		const offset = this.host.options.length;
		if (this.loading || this.complete || offset === 0 || this.#pendingOffset === offset) return;
		this.loading = true;
		this.host.requestUpdate();
		this.#send(offset);
	}

	/** Apply an answer. Returns the options to show, or null when the epoch is stale. */
	accept(options: ListOption[], init: SetOptionsInit): ListOption[] | null {
		if (init.epoch !== this.epoch) return null;
		const list = Array.isArray(options) ? options : [];
		this.loading = false;
		this.#pendingOffset = -1;
		this.total = init.total;
		if (init.append && list.length === 0) this.#exhausted = true;
		return init.append ? [...this.host.options, ...list] : list;
	}

	dispose() { clearTimeout(this.#timer); }

	#send(offset: number) {
		this.#pendingOffset = offset;
		const detail: OptionsRequestDetail = { query: this.#query, offset, epoch: this.epoch };
		this.host.dispatchEvent(new CustomEvent("dj-options-request", { detail, bubbles: true, composed: true }));
	}
}

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-options-request": CustomEvent<OptionsRequestDetail>;
	}
}
