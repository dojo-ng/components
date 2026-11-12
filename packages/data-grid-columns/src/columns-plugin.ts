import { html, nothing, type TemplateResult } from "lit";
import { live } from "lit/directives/live.js";
import { render } from "lit";
import type { Header as TableHeader } from "@tanstack/table-core";
import { defineDataGridPlugin, type DataGridContext, type DataGridPlugin, type GridColumn, type GridColumnState, type Row } from "@dojo-ng/data-grid";
import { insertionIndex, keyboardGrabMode, type DragZoneConfig } from "@dojo-ng/dnd";
import { getLocale, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/dropdown";
import "@dojo-ng/list";
import "@dojo-ng/dialog";
import "@dojo-ng/checkbox";
import "@dojo-ng/button";
import { canHide, clampWidth, moveGroup, moveWithin, pinColumn, resizeColumn, setVisible, stepMove } from "./column-moves.js";

const EN = {
	gridColumnMenu: "{label} column menu",
	gridColumnWider: "Wider",
	gridColumnNarrower: "Narrower",
	gridColumnMoveLeft: "Move left",
	gridColumnMoveRight: "Move right",
	gridColumnPinLeft: "Pin left",
	gridColumnPinRight: "Pin right",
	gridColumnUnpin: "Unpin",
	gridColumnHide: "Hide",
	gridColumnChooser: "Columns…",
	gridColumnChooserTitle: "Columns",
	gridColumnReset: "Reset",
	gridColumnDone: "Done",
};
registerDefaults("dj", EN);

/** Pointer movement before a press on a header becomes a drag (the dnd controller's value). */
const DRAG_THRESHOLD = 5;

export interface ColumnsPluginOptions {
	/** When the column menu button shows: `"hover"` (default) on header hover and keyboard
	 *  focus, and always on touch screens; `"always"` in every header. */
	menuButton?: "hover" | "always";
	/** Leave out the column menu (resize and drag to reorder stay). Default `true`. */
	menu?: boolean;
	/** Pixels the menu's "Wider" and "Narrower" change a width by. Default `20`. */
	resizeStep?: number;
	/** The narrowest a column without its own `minWidth` can get, in pixels. Default `48`. */
	minWidth?: number;
}

const STYLES = `
/* The controls float over the header's inline end, so a label keeps the whole cell until the
   menu button shows; the button then covers the label's tail on the header's own background. */
.hcell > .hextras:has(> .djc-controls) { position: absolute; inset-block: 0; inset-inline-end: 0; margin: 0; }
.djc-controls { display: inline-flex; align-items: center; block-size: 100%; }
.djc-menu-btn { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center;
	inline-size: 1.5rem; block-size: 1.5rem; margin-inline-end: .25rem; border-radius: var(--dj-input-border-radius-small, .2rem);
	cursor: pointer; color: inherit; opacity: 0; background: var(--dj-color-neutral-50, #f9fafb);
	box-shadow: -.5rem 0 .5rem -.25rem var(--dj-color-neutral-50, #f9fafb); }
:host(:dir(rtl)) .djc-menu-btn, .djc-menu-btn:dir(rtl) { box-shadow: .5rem 0 .5rem -.25rem var(--dj-color-neutral-50, #f9fafb); }
.djc-menu-btn:hover { background: var(--dj-color-neutral-100, #f3f4f6); }
.djc-menu-btn[aria-expanded="true"], .djc-menu-btn:hover { opacity: 1; }
.djc-menu-btn:focus-visible { opacity: 1; outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: -2px; }
.hcell:hover .djc-menu-btn, .grid:focus .hcell--active .djc-menu-btn, .djc-menu-btn[aria-expanded="true"], .djc-always .djc-menu-btn { opacity: 1; }
@media (hover: none) { .djc-menu-btn { opacity: 1; } }
.djc-resize { position: absolute; inset-block: 0; inset-inline-end: 0; inline-size: 7px; cursor: col-resize; touch-action: none; z-index: 1; }
.djc-resize::after { content: ""; position: absolute; inset-block: 25%; inset-inline-end: 3px; inline-size: 1px; background: var(--dj-color-border, #d1d5db); }
.djc-resize:hover::after, .djc-resizing::after { inset-block: 0; inline-size: 2px; inset-inline-end: 2px; background: var(--dj-color-primary-600, #2563eb); }
.hcell:has(.djc-movable) { cursor: grab; }
.hcell.djc-dragging, .hcell.djc-grabbed { opacity: .55; }
.hcell.djc-grabbed { outline: 2px solid var(--dj-color-primary-600, #2563eb); outline-offset: -2px; opacity: 1; }
.djc-drop { position: absolute; inset-block: 0; inline-size: 2px; margin-inline-start: -1px; background: var(--dj-color-primary-600, #2563eb); z-index: 3; pointer-events: none; }
.djc-live { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.djc-chooser-list { display: flex; flex-direction: column; gap: .5rem; min-inline-size: 14rem; max-block-size: 60vh; overflow: auto; }
@media (forced-colors: active) {
	.djc-drop, .djc-resize:hover::after, .djc-resizing::after { background: Highlight; }
	.hcell.djc-grabbed { outline-color: Highlight; }
}
`;

/**
 * `columnsPlugin(options?)` — let users resize, reorder, pin, and hide `<dj-data-grid>` columns.
 *
 * The layout itself lives in the grid (`columnState`, `dj-column-state-change`); this plugin is
 * the UI for it. An app that only restores a saved layout needs no plugin.
 *
 * - Resize: drag the handle at a header's inline-end edge (part `resize-handle`). Double-click
 *   it to fit the column to its widest rendered cell; only the rows on screen are measured.
 *   `minWidth` and `maxWidth` on a column limit both.
 * - Reorder: drag a header to a new place. From the keyboard, on the header row, Space grabs the
 *   column, Left and Right move it, Space drops it, and Escape cancels. Pinned columns move only
 *   among their own pinned group.
 * - Column menu (part `column-menu-button`): Wider, Narrower, Move left, Move right, Pin left,
 *   Pin right, Unpin, Hide, and Columns…, which opens the chooser: a checkbox per column and a
 *   Reset to the declared layout. The last visible column cannot be hidden. From the keyboard,
 *   Alt+ArrowDown (or Shift+F10, or the Menu key) on a header opens its menu.
 * - Per column: `resizable`, `reorderable`, and `hideable` (all default `true`). Columns added
 *   by other plugins (the checkbox column, the drag handle) get no controls.
 *
 * Works in remote mode (`rowCount`), since columns do not depend on which rows are loaded.
 */
export function columnsPlugin(options: ColumnsPluginOptions = {}): DataGridPlugin {
	const always = options.menuButton === "always";
	const withMenu = options.menu !== false;
	const step = options.resizeStep ?? 20;
	const floor = options.minWidth ?? 48;

	let grabId: string | null = null; // column under a keyboard grab
	let focusId: string | null = null; // header the current key arrived on
	let grab: ((e: KeyboardEvent) => void) | undefined;
	let liveRegion: HTMLElement | null = null;
	let dropEl: HTMLElement | null = null;
	let chooser: HTMLElement | null = null;

	const msg = (ctx: DataGridContext, key: keyof typeof EN | string, params?: Record<string, string | number>) =>
		messages.resolve("dj", getLocale(ctx.host), key, params) ?? (EN as Record<string, string>)[key] ?? key;
	const userCol = (ctx: DataGridContext, id: string): GridColumn | undefined => ctx.host.columns.find((c) => c.id === id);
	const userIds = (ctx: DataGridContext) => ctx.host.columns.map((c) => c.id);
	const labelOf = (ctx: DataGridContext, id: string) => userCol(ctx, id)?.header ?? id;
	const canMove = (ctx: DataGridContext) => (id: string) => { const c = userCol(ctx, id); return !!c && c.reorderable !== false; };
	const hideable = (ctx: DataGridContext) => (id: string) => { const c = userCol(ctx, id); return !!c && c.hideable !== false; };
	const isRtl = (ctx: DataGridContext) => getComputedStyle(ctx.host).direction === "rtl";
	const root = (ctx: DataGridContext) => ctx.host.renderRoot as ShadowRoot;
	/** Cells of a column, matched by `data-column` without building a selector from the id. */
	const cellsOf = (ctx: DataGridContext, scope: string, id: string) =>
		[...root(ctx).querySelectorAll<HTMLElement>(`${scope} [data-column]`)].filter((el) => el.dataset.column === id);
	const headerEl = (ctx: DataGridContext, id: string): HTMLElement | null => cellsOf(ctx, ".head", id)[0] ?? null;
	const minOf = (ctx: DataGridContext, id: string) => userCol(ctx, id)?.minWidth ?? floor;
	const maxOf = (ctx: DataGridContext, id: string) => userCol(ctx, id)?.maxWidth;
	const widthOf = (ctx: DataGridContext, id: string) =>
		ctx.host.columnState.sizing[id] ?? headerEl(ctx, id)?.getBoundingClientRect().width ?? floor;
	const announce = (text: string) => { if (liveRegion) liveRegion.textContent = text; };
	const apply = (ctx: DataGridContext, next: GridColumnState, emit = true) => ctx.setColumnState(next, { emit });

	// ---- Resize ----
	const startResize = (ctx: DataGridContext, id: string, e: PointerEvent) => {
		if (e.button !== 0) return;
		e.preventDefault();
		e.stopPropagation();
		const handle = e.currentTarget as HTMLElement;
		const startW = headerEl(ctx, id)?.getBoundingClientRect().width ?? widthOf(ctx, id);
		const x0 = e.clientX;
		const rtl = isRtl(ctx);
		const base = ctx.host.columnState;
		let moved = false;
		handle.classList.add("djc-resizing");
		try { handle.setPointerCapture(e.pointerId); } catch { /* not supported */ }
		const width = (ev: PointerEvent) => clampWidth(startW + (rtl ? x0 - ev.clientX : ev.clientX - x0), minOf(ctx, id), maxOf(ctx, id));
		const move = (ev: PointerEvent) => {
			// Only moves made with the button held drag the edge: Firefox can deliver stray
			// buttonless moves to the captured handle mid-drag.
			if (!(ev.buttons & 1)) return;
			if (!moved && Math.abs(ev.clientX - x0) < 1) return;
			moved = true;
			apply(ctx, resizeColumn(base, id, width(ev)), false);
		};
		const up = (ev: PointerEvent) => {
			handle.removeEventListener("pointermove", move);
			handle.removeEventListener("pointerup", up);
			handle.removeEventListener("pointercancel", up);
			handle.classList.remove("djc-resizing");
			if (moved) apply(ctx, resizeColumn(base, id, width(ev)));
		};
		handle.addEventListener("pointermove", move);
		handle.addEventListener("pointerup", up);
		handle.addEventListener("pointercancel", up);
	};
	/** Fit a column to its widest rendered cell, header included. Rows off screen are not
	 *  measured: they are not in the page (and in remote mode, may not be loaded at all). */
	const fit = (ctx: DataGridContext, id: string) => {
		let need = 0;
		for (const cell of cellsOf(ctx, ".head", id)) {
			const label = cell.querySelector<HTMLElement>(".label");
			need = Math.max(need, label ? cell.clientWidth - label.clientWidth + label.scrollWidth : cell.scrollWidth);
		}
		for (const cell of cellsOf(ctx, '[role="rowgroup"]', id)) {
			if (!cell.querySelector(".ph")) need = Math.max(need, cell.scrollWidth);
		}
		if (need <= 0) return;
		apply(ctx, resizeColumn(ctx.host.columnState, id, clampWidth(Math.ceil(need) + 1, minOf(ctx, id), maxOf(ctx, id))));
	};

	// ---- Reorder ----
	const showDrop = (ctx: DataGridContext, id: string | null, items: string[], toIndex: number) => {
		if (!dropEl) return;
		const gridEl = root(ctx).querySelector<HTMLElement>(".grid");
		if (id === null || !gridEl) { dropEl.hidden = true; return; }
		const rest = items.filter((x) => x !== id);
		const rtl = isRtl(ctx);
		const before = rest[toIndex] ? headerEl(ctx, rest[toIndex]) : null;
		const after = !before && rest.length ? headerEl(ctx, rest[rest.length - 1]) : null;
		const r = (before ?? after)?.getBoundingClientRect();
		if (!r) { dropEl.hidden = true; return; }
		const x = before ? (rtl ? r.right : r.left) : (rtl ? r.left : r.right);
		dropEl.style.left = `${x - gridEl.getBoundingClientRect().left}px`;
		dropEl.hidden = false;
		if (dropEl.parentElement !== gridEl) gridEl.appendChild(dropEl);
	};
	const dropIndex = (ctx: DataGridContext, id: string, items: string[], x: number) => {
		const rtl = isRtl(ctx);
		const centers = items.filter((c) => c !== id).map((c) => {
			const r = headerEl(ctx, c)?.getBoundingClientRect();
			const mid = r ? (r.left + r.right) / 2 : 0;
			return rtl ? -mid : mid;
		});
		return insertionIndex(centers, rtl ? -x : x);
	};
	const onHeaderPointerDown = (ctx: DataGridContext) => (e: Event) => {
		const pe = e as PointerEvent;
		if (pe.button !== 0 || grabId !== null) return;
		const path = pe.composedPath() as Element[];
		if (path.some((n) => n.classList?.contains("hextras"))) return;
		const cell = path.find((n) => n.classList?.contains("hcell")) as HTMLElement | undefined;
		const id = cell?.dataset.column;
		if (!cell || !id || !cell.closest(".head") || !canMove(ctx)(id)) return;
		const items = moveGroup(ctx.host.columnState, id, canMove(ctx));
		if (items.length < 2) return;
		const x0 = pe.clientX, y0 = pe.clientY;
		let dragging = false;
		let toIndex = items.indexOf(id);
		const move = (ev: PointerEvent) => {
			if (!dragging) {
				if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < DRAG_THRESHOLD) return;
				dragging = true;
				cell.classList.add("djc-dragging");
				try { cell.setPointerCapture(pe.pointerId); } catch { /* not supported */ }
			}
			ev.preventDefault();
			toIndex = dropIndex(ctx, id, items, ev.clientX);
			showDrop(ctx, id, items, toIndex);
		};
		const end = (commit: boolean) => () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", onUp);
			window.removeEventListener("pointercancel", onCancel);
			if (!dragging) return;
			cell.classList.remove("djc-dragging");
			showDrop(ctx, null, items, 0);
			// The click that ends a drag must not sort the column.
			const swallow = (c: Event) => { c.stopPropagation(); c.preventDefault(); };
			root(ctx).addEventListener("click", swallow, { capture: true, once: true });
			setTimeout(() => root(ctx).removeEventListener("click", swallow, { capture: true }), 0);
			if (commit && items.indexOf(id) !== toIndex) {
				const state = ctx.host.columnState;
				apply(ctx, { ...state, order: moveWithin(state.order, items, id, toIndex) });
			}
		};
		const onUp = end(true), onCancel = end(false);
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", onUp);
		window.addEventListener("pointercancel", onCancel);
	};

	/** The keyboard grab, from `@dojo-ng/dnd`: the same model and messages as `dj-list`. */
	const makeGrab = (ctx: DataGridContext) => {
		const items = () => {
			const id = grabId ?? focusId;
			return id ? moveGroup(ctx.host.columnState, id, canMove(ctx)) : [];
		};
		const zone: DragZoneConfig = {
			container: () => root(ctx).querySelector<HTMLElement>(".head")!,
			// The grab reads only `dataset.key` from an item once `current` names it.
			items: () => items().map((id) => ({ dataset: { key: id } }) as unknown as HTMLElement),
			zoneId: "columns",
			axis: "x",
			onMove: (m) => {
				const state = ctx.host.columnState;
				apply(ctx, { ...state, order: moveWithin(state.order, moveGroup(state, m.key, canMove(ctx)), m.key, m.toIndex) });
			},
		};
		return keyboardGrabMode({
			zones: () => [zone],
			announce,
			messages: {
				grabbed: (key) => msg(ctx, "listReorderGrabbed", { label: labelOf(ctx, key) }),
				moved: (key, _zone, pos) => msg(ctx, "listReorderMoved", { label: labelOf(ctx, key), pos }),
				dropped: (key) => msg(ctx, "listReorderDropped", { label: labelOf(ctx, key) }),
				cancelled: (key) => msg(ctx, "listReorderCancelled", { label: labelOf(ctx, key) }),
			},
			current: () => {
				const id = focusId;
				if (!id) return null;
				const i = items().indexOf(id);
				return i < 0 ? null : { zoneIndex: 0, index: i };
			},
			onGrabChange: (s) => {
				const prev = grabId;
				grabId = s.grabbed ? s.key : null;
				if (prev && prev !== grabId) headerEl(ctx, prev)?.classList.remove("djc-grabbed");
				if (grabId) {
					headerEl(ctx, grabId)?.classList.add("djc-grabbed");
					showDrop(ctx, grabId, items(), s.index ?? 0);
				} else showDrop(ctx, null, [], 0);
			},
		});
	};

	// ---- Menu ----
	const openMenu = (ctx: DataGridContext, id: string) => {
		const dd = headerEl(ctx, id)?.querySelector("dj-dropdown") as (HTMLElement & { open: boolean }) | null;
		if (dd) dd.open = true;
	};
	const act = (ctx: DataGridContext, id: string, action: string) => {
		const state = ctx.host.columnState;
		const rtl = isRtl(ctx);
		const pinTo = (side: "start" | "end") => {
			let next = state;
			// A pinned column needs a fixed width for its sticky offset: keep the one it has now.
			if (next.sizing[id] === undefined) next = resizeColumn(next, id, Math.round(widthOf(ctx, id)));
			apply(ctx, pinColumn(next, id, side));
		};
		switch (action) {
			case "wider": apply(ctx, resizeColumn(state, id, clampWidth(widthOf(ctx, id) + step, minOf(ctx, id), maxOf(ctx, id)))); break;
			case "narrower": apply(ctx, resizeColumn(state, id, clampWidth(widthOf(ctx, id) - step, minOf(ctx, id), maxOf(ctx, id)))); break;
			case "left":
			case "right": {
				const order = stepMove(state, id, (action === "left") !== rtl ? -1 : 1, canMove(ctx));
				if (order) apply(ctx, { ...state, order });
				break;
			}
			case "pin-left": pinTo(rtl ? "end" : "start"); break;
			case "pin-right": pinTo(rtl ? "start" : "end"); break;
			case "unpin": apply(ctx, pinColumn(state, id, null)); break;
			case "hide": if (canHide(state, id, userIds(ctx), hideable(ctx))) apply(ctx, setVisible(state, id, false, userIds(ctx))); break;
			case "chooser": openChooser(ctx); break;
		}
	};
	const menuOptions = (ctx: DataGridContext, id: string) => {
		const c = userCol(ctx, id)!;
		const state = ctx.host.columnState;
		const rtl = isRtl(ctx);
		const opts: Array<{ value: string; label: string; disabled?: boolean; divider?: boolean }> = [];
		if (c.resizable !== false) {
			const w = widthOf(ctx, id);
			opts.push({ value: "wider", label: msg(ctx, "gridColumnWider"), disabled: c.maxWidth !== undefined && w >= c.maxWidth });
			opts.push({ value: "narrower", label: msg(ctx, "gridColumnNarrower"), disabled: w <= minOf(ctx, id) });
		}
		if (c.reorderable !== false) {
			const toStart = stepMove(state, id, -1, canMove(ctx)) !== null;
			const toEnd = stepMove(state, id, 1, canMove(ctx)) !== null;
			opts.push({ value: "left", label: msg(ctx, "gridColumnMoveLeft"), disabled: !(rtl ? toEnd : toStart) });
			opts.push({ value: "right", label: msg(ctx, "gridColumnMoveRight"), disabled: !(rtl ? toStart : toEnd) });
		}
		const pinned = state.pinning.start.includes(id) ? "start" : state.pinning.end.includes(id) ? "end" : null;
		const leftSide = rtl ? "end" : "start";
		if (pinned !== leftSide) opts.push({ value: "pin-left", label: msg(ctx, "gridColumnPinLeft") });
		if (pinned !== (rtl ? "start" : "end")) opts.push({ value: "pin-right", label: msg(ctx, "gridColumnPinRight") });
		if (pinned) opts.push({ value: "unpin", label: msg(ctx, "gridColumnUnpin") });
		if (c.hideable !== false) opts.push({ value: "hide", label: msg(ctx, "gridColumnHide"), disabled: !canHide(state, id, userIds(ctx), hideable(ctx)) });
		opts.push({ value: "-", label: "", divider: true });
		opts.push({ value: "chooser", label: msg(ctx, "gridColumnChooser") });
		return opts;
	};
	const onMenuClose = (ctx: DataGridContext) => (e: Event) => {
		const trigger = (e.currentTarget as HTMLElement).querySelector(".djc-menu-btn");
		// The dropdown hands focus back to its trigger, which is not a tab stop: give it to the
		// grid, unless the menu opened something else (the chooser) that took it.
		requestAnimationFrame(() => {
			let a: Element | null = document.activeElement;
			while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
			if (a === trigger) ctx.host.focus();
		});
	};

	// ---- Chooser ----
	const renderChooser = (ctx: DataGridContext) => {
		if (!chooser) return;
		const state = ctx.host.columnState;
		const ids = state.order.filter((id) => userCol(ctx, id));
		const users = userIds(ctx);
		render(html`
			<span slot="title">${msg(ctx, "gridColumnChooserTitle")}</span>
			<div class="djc-chooser-list">
				${ids.map((id) => {
					const visible = state.visibility[id] !== false;
					const locked = visible ? !canHide(state, id, users, hideable(ctx)) : false;
					return html`<dj-checkbox part="column-chooser-item" .checked=${live(visible)} ?disabled=${locked}
						@change=${(e: Event) => apply(ctx, setVisible(ctx.host.columnState, id, (e.target as HTMLInputElement).checked, users))}>${labelOf(ctx, id)}</dj-checkbox>`;
				})}
			</div>
			<dj-button slot="actions" kind="outlined" @click=${() => apply(ctx, ctx.defaultColumnState())}>${msg(ctx, "gridColumnReset")}</dj-button>
			<dj-button slot="actions" @click=${() => { (chooser as HTMLElement & { open: boolean }).open = false; ctx.host.focus(); }}>${msg(ctx, "gridColumnDone")}</dj-button>
		`, chooser);
	};
	const openChooser = (ctx: DataGridContext) => {
		if (!chooser) return;
		renderChooser(ctx);
		(chooser as HTMLElement & { open: boolean }).open = true;
	};

	return defineDataGridPlugin({
		name: "columns",

		columns(cols: GridColumn[], ctx: DataGridContext): GridColumn[] {
			// App columns get a floor, so a flexible column never collapses to nothing when
			// others are widened; plugin columns are left as they are.
			const users = new Set(userIds(ctx));
			return cols.map((c) => (users.has(c.id) && c.minWidth === undefined ? { ...c, minWidth: floor } : c));
		},

		setup(ctx: DataGridContext) {
			const shadow = root(ctx);
			const style = document.createElement("style");
			style.textContent = STYLES;
			liveRegion = document.createElement("div");
			liveRegion.className = "djc-live";
			liveRegion.setAttribute("aria-live", "polite");
			dropEl = document.createElement("div");
			dropEl.className = "djc-drop";
			dropEl.setAttribute("part", "drop-indicator");
			dropEl.hidden = true;
			chooser = document.createElement("dj-dialog");
			chooser.setAttribute("part", "column-chooser");
			chooser.addEventListener("dj-close", () => ctx.host.focus());
			shadow.append(style, liveRegion, chooser);
			const onState = () => { if ((chooser as HTMLElement & { open?: boolean })?.open) renderChooser(ctx); };
			ctx.host.addEventListener("dj-column-state-change", onState);
			const down = onHeaderPointerDown(ctx);
			shadow.addEventListener("pointerdown", down);
			grab = makeGrab(ctx);
			return () => {
				ctx.host.removeEventListener("dj-column-state-change", onState);
				shadow.removeEventListener("pointerdown", down);
				style.remove();
				liveRegion?.remove();
				dropEl?.remove();
				chooser?.remove();
				liveRegion = dropEl = chooser = null;
				grab = undefined;
				grabId = null;
			};
		},

		headerControls(header: TableHeader<Row, unknown>, ctx: DataGridContext): TemplateResult | undefined {
			const id = header.column.id;
			const c = userCol(ctx, id);
			if (!c) return undefined;
			const label = labelOf(ctx, id);
			return html`<span class="djc-controls ${always ? "djc-always" : ""} ${canMove(ctx)(id) ? "djc-movable" : ""}">
				${withMenu ? html`<dj-dropdown class="djc-menu" @dj-close=${onMenuClose(ctx)}>
					<button slot="trigger" part="column-menu-button" class="djc-menu-btn" type="button" tabindex="-1"
						aria-label=${msg(ctx, "gridColumnMenu", { label })}><span aria-hidden="true">⋮</span></button>
					<dj-list label=${msg(ctx, "gridColumnMenu", { label })} .options=${menuOptions(ctx, id)} .value=${live("")}
						@change=${(e: Event) => act(ctx, id, (e.target as HTMLInputElement).value)}></dj-list>
				</dj-dropdown>` : nothing}
				${c.resizable !== false ? html`<span part="resize-handle" class="djc-resize" aria-hidden="true"
					@pointerdown=${(e: PointerEvent) => startResize(ctx, id, e)}
					@dblclick=${(e: MouseEvent) => { e.stopPropagation(); fit(ctx, id); }}></span>` : nothing}
			</span>`;
		},

		headerKey(e: KeyboardEvent, header: TableHeader<Row, unknown>, ctx: DataGridContext) {
			const id = header.column.id;
			focusId = id;
			const rtl = isRtl(ctx);
			if (grabId !== null && grab) {
				if (e.key === "Tab") { grab(new KeyboardEvent("keydown", { key: "Escape" })); return false; }
				// The grab moves along the item order; in RTL, Left is toward the end.
				const swap: Record<string, string> = { ArrowLeft: "ArrowRight", ArrowRight: "ArrowLeft" };
				const key = rtl && swap[e.key] ? swap[e.key] : e.key;
				grab({ key, repeat: e.repeat, preventDefault: () => e.preventDefault() } as KeyboardEvent);
				e.preventDefault();
				return true;
			}
			if (withMenu && userCol(ctx, id) && ((e.altKey && e.key === "ArrowDown") || (e.shiftKey && e.key === "F10") || e.key === "ContextMenu")) {
				e.preventDefault();
				openMenu(ctx, id);
				return true;
			}
			if (e.key === " " && grab && canMove(ctx)(id) && moveGroup(ctx.host.columnState, id, canMove(ctx)).length > 1) {
				grab(e);
				return e.defaultPrevented;
			}
			return false;
		},
	});
}
