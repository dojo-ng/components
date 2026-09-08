import type { ReactiveController, ReactiveControllerHost } from "lit";
import { type Axis, centerOf, insertionIndex, pointInRect, resolveMove } from "./core.js";

export interface DragZoneConfig {
	/** The scrollable container holding the items (may live in a shadow root). */
	container: () => HTMLElement;
	/** Current draggable item elements, in order. Each must carry data-key. */
	items: () => HTMLElement[];
	/** Zones sharing a group accept transfers from each other. */
	group?: string;
	/** Identifies this zone in move events (e.g. the lane value). */
	zoneId: string;
	axis?: "x" | "y";
	/** CONTROLLED: called on drop; the consumer applies the change to its data. */
	onMove(m: { key: string; from: string; to: string; fromIndex: number; toIndex: number }): void;
}

/** Zones registered per group so a drag can transfer between them. Ungrouped zones stand alone. */
const GROUPS = new Map<string, Set<DragZoneController>>();

/** One active pointer drag at a time across the whole page. */
interface ActiveDrag {
	origin: DragZoneController;
	key: string;
	item: HTMLElement;
	ghost: HTMLElement;
	pointerId: number;
	target: { zone: DragZoneController; index: number } | null;
	indicator: HTMLElement | null;
}
let active: ActiveDrag | null = null;

/**
 * A pointerdown on a draggable item, not yet a drag. Holds the item and the
 * pointer's start position; promoted to `active` (`#commit` below) the first
 * time a pointermove clears `DRAG_THRESHOLD`. Until then nothing about a drag
 * has started — no ghost, no `preventDefault()` — specifically so a plain
 * click (pointerdown, no meaningful movement, pointerup) synthesizes exactly
 * as it would with no drag zone installed at all. A consumer wiring a card's
 * own click handler alongside `draggable` (Track D's D4/W7 in NovelMaker,
 * the first real bug report this shape ever produced) depends on that: this
 * controller calling `preventDefault()` unconditionally on every pointerdown
 * suppressed the browser's click-event synthesis for every card, whether or
 * not the pointer ever moved — a real click could never fire at all.
 */
interface PendingDrag {
	origin: DragZoneController;
	key: string;
	item: HTMLElement;
	pointerId: number;
	startX: number;
	startY: number;
}
let pending: PendingDrag | null = null;

/** px of pointer movement before a pointerdown commits to a drag rather than
 *  staying a click. Matches the small, unnoticeable-while-dragging distance
 *  most pointer-based drag implementations use (large enough that a hand
 *  is not perfectly still between press and release, small enough that an
 *  intentional drag is never mistaken for a click). */
const DRAG_THRESHOLD = 5;

const EDGE = 32; // px from a container edge that triggers auto-scroll
const STEP = 16; // px nudged per pointermove while in the edge band

function prefersReducedMotion(): boolean {
	return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Registers a drag zone over a host's item container and runs a pointer-events drag: it works
 * inside shadow roots (pointer events compose; we hold references straight into the shadow root)
 * and on touch, mouse, and pen alike. On drop it calls the CONTROLLED `onMove` — it never mutates
 * the data. Renders a drag ghost (`part="drag-ghost"`, class `dj-drag-ghost`) and a drop indicator
 * (`part="drop-indicator"`, class `dj-drop-indicator`) that the host styles; marks the source item
 * `dj-drag-source`. Cleans up zones and any in-flight drag on host disconnect.
 */
export class DragZoneController implements ReactiveController {
	#config: DragZoneConfig;
	#listenEl: HTMLElement | null = null;
	#onDown = (e: PointerEvent) => this.#pointerDown(e);

	get zoneId(): string { return this.#config.zoneId; }
	get axis(): Axis { return this.#config.axis ?? "y"; }
	get config(): DragZoneConfig { return this.#config; }

	constructor(host: ReactiveControllerHost & HTMLElement, config: DragZoneConfig) {
		this.#config = config;
		host.addController(this);
	}

	hostConnected() {
		const g = this.#config.group;
		if (g) {
			let set = GROUPS.get(g);
			if (!set) GROUPS.set(g, (set = new Set()));
			set.add(this);
		}
		this.#bind();
	}

	hostUpdated() {
		// The container may only exist after the first render; (re)bind if it changed.
		this.#bind();
	}

	hostDisconnected() {
		const g = this.#config.group;
		if (g) {
			const set = GROUPS.get(g);
			set?.delete(this);
			if (set && set.size === 0) GROUPS.delete(g);
		}
		if (this.#listenEl) {
			this.#listenEl.removeEventListener("pointerdown", this.#onDown as EventListener);
			this.#listenEl = null;
		}
		if (active && (active.origin === this || active.target?.zone === this)) cancelActiveDrag();
		// A pending (pre-threshold) gesture never registered with `active` at
		// all, so the check above would miss it — a disconnect mid-click must
		// still drop it, or its stale pointerId lingers until some unrelated
		// later pointerup clears it.
		if (pending && pending.origin === this) cancelActiveDrag();
	}

	#bind() {
		let el: HTMLElement | null;
		try { el = this.#config.container(); } catch { el = null; }
		if (!el || el === this.#listenEl) return;
		if (this.#listenEl) this.#listenEl.removeEventListener("pointerdown", this.#onDown as EventListener);
		el.addEventListener("pointerdown", this.#onDown as EventListener);
		this.#listenEl = el;
	}

	/** Zones this one can drop into: itself plus grouped peers. */
	#peers(): DragZoneController[] {
		const g = this.#config.group;
		if (!g) return [this];
		return [...(GROUPS.get(g) ?? new Set([this]))];
	}

	#pointerDown(e: PointerEvent) {
		if (active || pending) return;
		const items = this.#config.items();
		const path = typeof e.composedPath === "function" ? e.composedPath() : [];
		const item = items.find((it) => it === e.target || path.includes(it) || it.contains(e.target as Node));
		if (!item) return;
		const key = item.dataset.key;
		if (key == null) return;
		// Deliberately no preventDefault() and nothing else about a drag
		// starts here — see PendingDrag's own comment above. #commit is what
		// turns this into a real drag, the first time onPointerMove sees the
		// pointer actually move past DRAG_THRESHOLD.
		pending = { origin: this, key, item, pointerId: e.pointerId ?? 0, startX: e.clientX, startY: e.clientY };
		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp, { once: true });
		window.addEventListener("pointercancel", onPointerCancel, { once: true });
	}

	/**
	 * Promote a pending pointerdown into a real drag: builds the ghost,
	 * captures the pointer, marks the source item. Called at most once per
	 * gesture, by the module-level `onPointerMove`, on whichever zone's
	 * pointerdown is pending — kept as a method (not free-standing) only
	 * because `#listenEl` is private to the instance that owns the capture.
	 */
	commitDrag(p: PendingDrag, e: PointerEvent) {
		const { key, item, pointerId } = p;
		const ghost = item.cloneNode(true) as HTMLElement;
		ghost.classList.add("dj-drag-ghost");
		ghost.setAttribute("part", "drag-ghost");
		Object.assign(ghost.style, {
			position: "fixed",
			margin: "0",
			pointerEvents: "none",
			width: `${item.offsetWidth}px`,
			left: `${e.clientX}px`,
			top: `${e.clientY}px`,
			zIndex: "10000",
		});
		const root = item.getRootNode();
		const parent = root instanceof ShadowRoot ? root : document.body;
		parent.appendChild(ghost);
		if (!prefersReducedMotion() && typeof ghost.animate === "function") {
			ghost.animate([{ transform: "scale(1)" }, { transform: "scale(1.03)" }], { duration: 120, fill: "forwards" });
		}
		item.classList.add("dj-drag-source");
		try { this.#listenEl?.setPointerCapture(pointerId); } catch { /* not supported */ }
		active = { origin: this, key, item, ghost, pointerId, target: null, indicator: null };
	}

	/** Compute the drop index in this zone for a pointer position; also (re)draw the indicator. */
	measureDrop(x: number, y: number, draggedKey: string): number {
		const axis = this.axis;
		const pointer = axis === "x" ? x : y;
		const domItems = this.#config.items();
		const filtered = domItems.filter((it) => it.dataset.key !== draggedKey);
		const centers = filtered.map((it) => centerOf(it.getBoundingClientRect(), axis));
		return insertionIndex(centers, pointer);
	}

	containerRectContains(x: number, y: number): boolean {
		let el: HTMLElement | null;
		try { el = this.#config.container(); } catch { return false; }
		if (!el) return false;
		return pointInRect(x, y, el.getBoundingClientRect());
	}

	drawIndicator(index: number, draggedKey: string): HTMLElement | null {
		let container: HTMLElement | null;
		try { container = this.#config.container(); } catch { return null; }
		if (!container) return null;
		const indicator = document.createElement("div");
		indicator.className = "dj-drop-indicator";
		indicator.setAttribute("part", "drop-indicator");
		const filtered = this.#config.items().filter((it) => it.dataset.key !== draggedKey);
		const before = filtered[index] ?? null;
		if (before) before.parentElement?.insertBefore(indicator, before);
		else container.appendChild(indicator);
		return indicator;
	}

	fromIndexOf(key: string): number {
		return this.#config.items().findIndex((it) => it.dataset.key === key);
	}

	autoScroll(x: number, y: number) {
		let el: HTMLElement | null;
		try { el = this.#config.container(); } catch { return; }
		while (el) {
			const canY = el.scrollHeight > el.clientHeight;
			const canX = el.scrollWidth > el.clientWidth;
			if (canY || canX) {
				const r = el.getBoundingClientRect();
				if (canY) {
					if (y < r.top + EDGE) el.scrollTop -= STEP;
					else if (y > r.bottom - EDGE) el.scrollTop += STEP;
				}
				if (canX) {
					if (x < r.left + EDGE) el.scrollLeft -= STEP;
					else if (x > r.right - EDGE) el.scrollLeft += STEP;
				}
			}
			let parent: HTMLElement | null = el.parentElement;
			if (!parent) {
				const root = el.getRootNode();
				parent = root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
			}
			el = parent && parent !== document.documentElement ? parent : null;
		}
	}

	// Peer lookup exposed to the module-level pointer handlers.
	peersForActive(): DragZoneController[] { return this.#peers(); }
}

function clearIndicator() {
	if (active?.indicator) { active.indicator.remove(); active.indicator = null; }
}

function onPointerMove(e: PointerEvent) {
	if (!active && pending) {
		if (Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY) < DRAG_THRESHOLD) return;
		const p = pending;
		pending = null;
		p.origin.commitDrag(p, e); // always sets `active`
	}
	if (!active) return;
	// Deferred from pointerdown to here, on purpose: calling it any earlier
	// is exactly what made every click a drag (see PendingDrag's own
	// comment). Once a drag is real, every further move of it still needs
	// this — a touch that started scrolling, or text selection extending
	// under the pointer, is the same wrong outcome mid-drag that a
	// suppressed click was pre-threshold.
	e.preventDefault();
	active.ghost.style.left = `${e.clientX}px`;
	active.ghost.style.top = `${e.clientY}px`;
	const zone = active.origin.peersForActive().find((z) => z.containerRectContains(e.clientX, e.clientY)) ?? null;
	clearIndicator();
	if (zone) {
		const index = zone.measureDrop(e.clientX, e.clientY, active.key);
		active.target = { zone, index };
		active.indicator = zone.drawIndicator(index, active.key);
		zone.autoScroll(e.clientX, e.clientY);
	} else {
		active.target = null;
	}
}

function finishActiveDrag(commit: boolean) {
	if (!active) return;
	const drag = active;
	active = null;
	// The pointermove listener itself is `endGesture`'s job — every caller of
	// this function calls that first, whether or not a drag was ever active.
	drag.ghost.remove();
	if (drag.indicator) drag.indicator.remove();
	drag.item.classList.remove("dj-drag-source");
	if (commit && drag.target) {
		const from = drag.origin.zoneId;
		const to = drag.target.zone.zoneId;
		const fromIndex = drag.origin.fromIndexOf(drag.key);
		const payload = resolveMove({ key: drag.key, from, to, fromIndex, toIndex: drag.target.index });
		if (payload) drag.target.zone.config.onMove(payload);
	}
}

/** Common teardown for both a real end-of-drag and a plain click that never
 *  crossed DRAG_THRESHOLD: the pointermove listener `#pointerDown` added is
 *  removed either way, and a still-pending (never promoted) gesture is
 *  cleared so it cannot be mistaken for a stale one on the next pointerdown. */
function endGesture() {
	window.removeEventListener("pointermove", onPointerMove);
	pending = null;
}

function onPointerUp() {
	endGesture();
	finishActiveDrag(true);
}
function onPointerCancel() {
	endGesture();
	finishActiveDrag(false);
}

/** Abort any in-flight drag (used when a participating zone's host disconnects). */
export function cancelActiveDrag() {
	window.removeEventListener("pointerup", onPointerUp);
	window.removeEventListener("pointercancel", onPointerCancel);
	endGesture();
	finishActiveDrag(false);
}
