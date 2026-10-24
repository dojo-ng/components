import type { ReactiveController, ReactiveControllerHost } from "lit";
import { getHistory, whenHistory, type HistoryInstance, type NavLocation } from "@dojo-ng/history/handle";

/**
 * A Lit reactive controller that follows the app's navigation location and re-renders its host on
 * every change. Use it in a view that wants the location as data, such as a custom component that
 * highlights the current page.
 *
 * ```ts
 * #nav = new HistoryController(this);
 * render() { return html`${this.#nav.location?.path ?? "loading"}`; }
 * ```
 *
 * It reads the instance `installHistory` registered, through `@dojo-ng/history/handle`, so it
 * imports none of the install code and needs no instance passed in.
 * - `location` is the current `NavLocation`, or `undefined` before one exists.
 * - `history` is the instance, or `undefined` while nothing is installed.
 * - If nothing is installed when the host connects, the controller waits for the install and then
 *   starts following. Nothing throws and nothing is shown in the meantime.
 * - On disconnect it unsubscribes. An install that finishes after the host disconnected does not
 *   subscribe it.
 */
export class HistoryController implements ReactiveController {
	#host: ReactiveControllerHost;
	#connected = false;
	#unsubscribe?: () => void;

	/** The current location, or `undefined` until history is installed and has published one. */
	location: NavLocation | undefined;
	/** The installed instance, or `undefined` while none is installed. */
	history: HistoryInstance | undefined;

	constructor(host: ReactiveControllerHost) {
		this.#host = host;
		host.addController(this);
	}

	hostConnected(): void {
		this.#connected = true;
		const installed = getHistory();
		if (installed) this.#follow(installed);
		else {
			// A WeakRef, so a host that disconnects while nothing is installed (and may never be
			// installed) is not kept alive by the promise waiting for it.
			const self = new WeakRef(this);
			void whenHistory().then((instance) => { const controller = self.deref(); if (controller) controller.#follow(instance); });
		}
	}

	hostDisconnected(): void {
		this.#connected = false;
		this.#unsubscribe?.();
		this.#unsubscribe = undefined;
		this.history = undefined;
		this.location = undefined;
	}

	#follow(instance: HistoryInstance): void {
		if (!this.#connected || this.#unsubscribe) return;
		this.history = instance;
		this.#unsubscribe = instance.subscribe((location) => {
			this.location = location;
			this.#host.requestUpdate();
		});
		this.#host.requestUpdate();
	}
}
