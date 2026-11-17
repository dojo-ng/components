import { DjToaster } from "./dj-toaster.js";
import type { ToastHandle, ToastOptions, ToastUpdate } from "./queue.js";

/** The page's toaster: the first `<dj-toaster>` in the document, or a new one on `document.body`. */
export function getToaster(): DjToaster {
	if (!customElements.get("dj-toaster")) DjToaster.define("dj-toaster", DjToaster);
	const found = document.querySelector("dj-toaster");
	if (found) return found as DjToaster;
	const toaster = document.createElement("dj-toaster") as DjToaster;
	document.body.append(toaster);
	return toaster;
}

type Message<T> = string | ((value: T) => string);

export interface ToastPromiseMessages<T> {
	loading: string;
	success: Message<T>;
	error: Message<unknown>;
}

export interface ToastFunction {
	/** Show a toast. Returns a handle to close or change it. */
	(message: string, options?: ToastOptions): ToastHandle;
	/**
	 * Show a loading toast while `promise` runs, then turn it into a success or error toast in place.
	 * The success toast's timer starts when the promise settles. Returns the promise unchanged.
	 */
	promise<T>(promise: Promise<T>, messages: ToastPromiseMessages<T>, options?: Omit<ToastOptions, "type">): Promise<T>;
	/** Close one toast by id, or all of them. */
	dismiss(id?: string): void;
}

const text = <T>(message: Message<T>, value: T) => (typeof message === "function" ? message(value) : message);

/**
 * Show a toast from anywhere in the app. Needs no setup: the first call adds a `<dj-toaster>` to
 * `document.body` if the page has none.
 *
 * ```js
 * import { toast } from "@dojo-ng/toast";
 * toast("Saved", { type: "success" });
 * toast("Message deleted", { action: { label: "Undo", onClick: restore } });
 * ```
 */
export const toast: ToastFunction = Object.assign(
	(message: string, options: ToastOptions = {}): ToastHandle => getToaster().show(message, options),
	{
		promise<T>(promise: Promise<T>, messages: ToastPromiseMessages<T>, options: Omit<ToastOptions, "type"> = {}): Promise<T> {
			const handle = getToaster().show(messages.loading, { ...options, type: "loading" });
			const settle = (update: ToastUpdate) => handle.update({ duration: options.duration, ...update });
			promise.then(
				(value) => settle({ type: "success", message: text(messages.success, value) }),
				(reason) => settle({ type: "error", message: text(messages.error, reason) }),
			);
			return promise;
		},
		dismiss(id?: string): void {
			const found = document.querySelector("dj-toaster") as DjToaster | null;
			found?.dismiss?.(id);
		},
	},
);

export type { ToastUpdate };
