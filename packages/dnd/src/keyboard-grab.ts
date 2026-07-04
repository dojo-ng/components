import type { DragZoneConfig } from "./drag-zone-controller.js";
import { resolveMove } from "./core.js";

interface GrabState {
	key: string;
	fromZoneIndex: number;
	fromIndex: number;
	toZoneIndex: number;
	toIndex: number;
}

/** The deepest focused element, descending through shadow roots (Safari's `shadowRoot.activeElement`
 *  is unreliable, so start from the document and walk down). */
function deepActiveElement(): Element | null {
	let a: Element | null = document.activeElement;
	while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
	return a;
}

/** The currently focused draggable item across the given zones (supports the item itself having
 *  focus, or a listbox-style container exposing it via aria-activedescendant). */
function focusedItem(zones: DragZoneConfig[]): { zoneIndex: number; index: number; key: string } | null {
	const active = deepActiveElement();
	const adId = active?.getAttribute?.("aria-activedescendant") ?? null;
	for (let z = 0; z < zones.length; z++) {
		const items = zones[z].items();
		for (let i = 0; i < items.length; i++) {
			const it = items[i];
			if (it === active || it.contains(active) || (adId && it.id === adId)) {
				return { zoneIndex: z, index: i, key: it.dataset.key ?? "" };
			}
		}
	}
	return null;
}

/** Resolve the item to grab: prefer the consumer-supplied `current` (reliable — the component
 *  knows its own active item), else fall back to focus/aria detection. */
function resolveCurrent(
	current: (() => { zoneIndex: number; index: number } | null) | undefined,
	zones: DragZoneConfig[],
): { zoneIndex: number; index: number; key: string } | null {
	const c = current?.();
	if (c) {
		const it = zones[c.zoneIndex]?.items()[c.index];
		if (it) return { zoneIndex: c.zoneIndex, index: c.index, key: it.dataset.key ?? "" };
	}
	return focusedItem(zones);
}

/** Optional localized message builders. Defaults are English; consumers (e.g. dj-list) pass
 *  versions resolved from their i18n namespace so announcements are localizable. */
export interface GrabMessages {
	grabbed?: (key: string) => string;
	moved?: (key: string, zoneId: string, position: number) => string;
	dropped?: (key: string) => string;
	cancelled?: (key: string) => string;
}

const DEFAULT_MESSAGES: Required<GrabMessages> = {
	grabbed: (key) => `Grabbed ${key}. Use the arrow keys to move, space to drop, escape to cancel.`,
	moved: (key, zoneId, position) => `${key} at ${zoneId}, position ${position}.`,
	dropped: (key) => `Dropped ${key}.`,
	cancelled: (key) => `Cancelled moving ${key}.`,
};

/**
 * Shared keyboard "grab mode" for uniform 2.5.7 keyboard moves in consumers that lack their own
 * move UI (dj-list `reorderable` uses this; dj-board does not — its menu + shortcuts already
 * cover keyboard). Space/Enter grabs the focused item, arrows move it (and, with multiple zones,
 * cross between them), Space/Enter drops (→ `onMove`), Escape cancels with no move. Each step is
 * announced via the provided `announce` callback; pass `messages` to localize the strings.
 */
export function keyboardGrabMode(cfg: {
	zones: () => DragZoneConfig[];
	announce: (msg: string) => void;
	messages?: GrabMessages;
	/** Optional: the component's own notion of the active item, used to start a grab. More
	 *  reliable than focus detection across shadow DOM (especially Safari). */
	current?: () => { zoneIndex: number; index: number } | null;
	/** Optional: notified as the grab lifecycle changes so the consumer can render feedback
	 *  (e.g. mark the lifted item). Fires on grab, each move, and on drop/cancel (grabbed:false). */
	onGrabChange?: (state: { grabbed: boolean; key: string | null; zoneId: string | null; index: number | null }) => void;
}): (e: KeyboardEvent) => void {
	let grab: GrabState | null = null;
	const msg = { ...DEFAULT_MESSAGES, ...cfg.messages };
	const notify = (zones: DragZoneConfig[]) => {
		if (!cfg.onGrabChange) return;
		if (grab) cfg.onGrabChange({ grabbed: true, key: grab.key, zoneId: zones[grab.toZoneIndex]?.zoneId ?? null, index: grab.toIndex });
		else cfg.onGrabChange({ grabbed: false, key: null, zoneId: null, index: null });
	};

	return (e: KeyboardEvent) => {
		const zones = cfg.zones();
		const key = e.key;

		// Ignore auto-repeat on the grab/drop toggle so holding the key doesn't rapidly
		// grab-and-drop (which flashes the item); still consume it to prevent page scroll.
		if ((key === " " || key === "Enter") && e.repeat) { e.preventDefault(); return; }

		if (!grab) {
			if (key === " " || key === "Enter") {
				const cur = resolveCurrent(cfg.current, zones);
				if (!cur) return;
				grab = {
					key: cur.key,
					fromZoneIndex: cur.zoneIndex,
					fromIndex: cur.index,
					toZoneIndex: cur.zoneIndex,
					toIndex: cur.index,
				};
				e.preventDefault();
				cfg.announce(msg.grabbed(cur.key));
				notify(zones);
			}
			return;
		}

		// Grabbed.
		const toZone = zones[grab.toZoneIndex];
		const axis = toZone.axis ?? "y";
		const sameAsOrigin = grab.toZoneIndex === grab.fromZoneIndex;
		const count = toZone.items().length;
		const maxIndex = sameAsOrigin ? Math.max(0, count - 1) : count; // another zone can append

		const backKey = axis === "x" ? "ArrowLeft" : "ArrowUp";
		const fwdKey = axis === "x" ? "ArrowRight" : "ArrowDown";
		const prevZoneKey = axis === "x" ? "ArrowUp" : "ArrowLeft";
		const nextZoneKey = axis === "x" ? "ArrowDown" : "ArrowRight";

		const announcePos = () => {
			const z = zones[grab!.toZoneIndex];
			cfg.announce(msg.moved(grab!.key, z.zoneId, grab!.toIndex + 1));
			notify(zones);
		};

		if (key === backKey) {
			e.preventDefault();
			grab.toIndex = Math.max(0, grab.toIndex - 1);
			announcePos();
		} else if (key === fwdKey) {
			e.preventDefault();
			grab.toIndex = Math.min(maxIndex, grab.toIndex + 1);
			announcePos();
		} else if (key === prevZoneKey && zones.length > 1) {
			e.preventDefault();
			grab.toZoneIndex = Math.max(0, grab.toZoneIndex - 1);
			grab.toIndex = 0;
			announcePos();
		} else if (key === nextZoneKey && zones.length > 1) {
			e.preventDefault();
			grab.toZoneIndex = Math.min(zones.length - 1, grab.toZoneIndex + 1);
			grab.toIndex = 0;
			announcePos();
		} else if (key === " " || key === "Enter") {
			e.preventDefault();
			const from = zones[grab.fromZoneIndex].zoneId;
			const target = zones[grab.toZoneIndex];
			const payload = resolveMove({
				key: grab.key,
				from,
				to: target.zoneId,
				fromIndex: grab.fromIndex,
				toIndex: grab.toIndex,
			});
			cfg.announce(msg.dropped(grab.key));
			grab = null;
			notify(zones);
			if (payload) target.onMove(payload);
		} else if (key === "Escape") {
			e.preventDefault();
			cfg.announce(msg.cancelled(grab.key));
			grab = null;
			notify(zones);
		}
	};
}
