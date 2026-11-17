/**
 * The toast model: plain entries in arrival order, and the rules for timing and for which entries
 * are shown. No DOM here, so the node tests can drive it directly.
 */

export type ToastType = "info" | "success" | "warning" | "error" | "loading";

/** A button on the toast. The toast closes after `onClick` runs. */
export interface ToastAction {
	label: string;
	onClick?: (toast: ToastHandle) => void;
}

export interface ToastOptions {
	/** Tint and announcement. `error` is announced assertively; everything else politely. Default `info`. */
	type?: ToastType;
	/** Milliseconds before the toast closes on its own. `Infinity`, 0, or a negative number keeps it open. */
	duration?: number;
	/** One button, such as Undo. A toast with an action stays at least 8 seconds. */
	action?: ToastAction;
	/** Show a close button and let Escape close it. Default true. */
	dismissible?: boolean;
	/** Reuse an id to update that toast in place instead of adding one. */
	id?: string;
}

/** What `update()` takes: any option, plus a new message. */
export interface ToastUpdate extends Omit<ToastOptions, "id"> {
	message?: string;
}

/** What `toast()` returns. */
export interface ToastHandle {
	readonly id: string;
	dismiss(): void;
	update(options: ToastUpdate): void;
}

export interface ToastEntry {
	id: string;
	message: string;
	type: ToastType;
	/** As given; undefined means the type's default. */
	duration?: number;
	action?: ToastAction;
	dismissible: boolean;
	/** Set when the exit effect has started; the entry no longer holds a visible slot. */
	leaving: boolean;
}

export const DEFAULT_DURATION = 5000;
/** WCAG 2.2.1: time to reach the action button. */
export const ACTION_MIN_DURATION = 8000;

/** How long `entry` stays before closing itself, in milliseconds. `Infinity` means it stays. */
export function effectiveDuration(entry: Pick<ToastEntry, "type" | "duration" | "action">): number {
	const sticky = entry.type === "error" || entry.type === "loading";
	const base = entry.duration ?? (sticky ? Infinity : DEFAULT_DURATION);
	if (!(base > 0)) return Infinity;
	if (entry.action && Number.isFinite(base)) return Math.max(base, ACTION_MIN_DURATION);
	return base;
}

let counter = 0;
/** A fresh id for a toast added without one. */
export function nextId(): string {
	return `dj-toast-${++counter}`;
}

/**
 * Add a toast, or update the one with the same id. Returns the new list and the entry.
 * An update keeps the entry's place in the queue and cancels a leave in progress.
 */
export function upsert(
	entries: readonly ToastEntry[],
	message: string | undefined,
	options: ToastOptions & { message?: string },
): { entries: ToastEntry[]; entry: ToastEntry; added: boolean } {
	const index = options.id === undefined ? -1 : entries.findIndex((e) => e.id === options.id);
	if (index === -1) {
		const entry: ToastEntry = {
			id: options.id ?? nextId(),
			message: message ?? options.message ?? "",
			type: options.type ?? "info",
			duration: options.duration,
			action: options.action,
			dismissible: options.dismissible ?? true,
			leaving: false,
		};
		return { entries: [...entries, entry], entry, added: true };
	}
	const old = entries[index];
	const entry: ToastEntry = { ...old, leaving: false };
	const text = message ?? options.message;
	if (text !== undefined) entry.message = text;
	if (options.type !== undefined) entry.type = options.type;
	if ("duration" in options) entry.duration = options.duration;
	if ("action" in options) entry.action = options.action;
	if (options.dismissible !== undefined) entry.dismissible = options.dismissible;
	const next = entries.slice();
	next[index] = entry;
	return { entries: next, entry, added: false };
}

/**
 * The ids to show: the first `max` entries that are not leaving, in arrival order, plus every
 * leaving entry so its exit effect can play. The rest wait in the queue.
 */
export function shownIds(entries: readonly ToastEntry[], max: number): Set<string> {
	const shown = new Set<string>();
	let slots = Math.max(1, Math.floor(max) || 1);
	for (const entry of entries) {
		if (entry.leaving) shown.add(entry.id);
		else if (slots > 0) { shown.add(entry.id); slots--; }
	}
	return shown;
}
