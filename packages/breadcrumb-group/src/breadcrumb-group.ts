import { html, css, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import { getHistory, whenHistory, type NavigateDetail, type NavLocation, type TrailEntry } from "@dojo-ng/history/handle";

registerDefaults("dj", { breadcrumb: "Breadcrumb" });

export interface Crumb { label: string; href?: string; current?: boolean; }

/** A crumb derived from the location: its app path, for the click. */
interface TrackedCrumb extends Crumb { path: string; }

/**
 * `<dj-breadcrumb-group>` — a breadcrumb trail.
 *
 * Give it `items` for a trail you control. Or set `track` and it follows the app's navigation
 * history, with no list to maintain:
 * - With a trail on the location (a tracked `dj-tree` or a `dj-navigate` that carried one), there is
 *   one crumb per trail entry and the last is the current page.
 * - Without one, the path is split into segments and each crumb is `resolveTitle(prefix)`, or the
 *   decoded segment when that returns nothing.
 * - `items` is ignored while `track` is on and history is installed. With no history installed,
 *   `track` does nothing and `items` is shown as plain links.
 * - A plain click on a crumb dispatches `dj-navigate` with that crumb's path and the trail up to it,
 *   so Back and a tracked tree follow. Ctrl-, Cmd- and middle-click keep the browser's link behavior.
 *
 * The landmark's name is "Breadcrumb", translated. The separator is a CSS custom property, not text
 * a screen reader reads.
 *
 * Needs `@dojo-ng/history` installed for `track`; without it nothing throws.
 *
 * @cssprop [--dj-breadcrumb-separator="/"] - The text drawn between crumbs, for example `"›"`.
 *
 * Part: `list`.
 * Events: `dj-navigate` (detail `{ path, label, trail }`) on a plain click of a tracked crumb.
 */
export class DjBreadcrumbGroup extends DojoElement {
	static override version = "0.1.1";
	static override styles = css`
		:host{display:block;} ol{list-style:none;display:flex;flex-wrap:wrap;align-items:center;gap:var(--dj-spacing-2x-small,.25rem);margin:0;padding:0;}
		a{color:var(--dj-color-primary-600,#2563eb);text-decoration:none;border-radius:2px;} a:hover{text-decoration:underline;}
		a:focus-visible{outline:var(--dj-focus-ring,2px solid currentColor);outline-offset:2px;}
		.sep{color:var(--dj-color-text-muted,#6b7280);} .sep::before{content:var(--dj-breadcrumb-separator,"/");}
		[aria-current]{color:var(--dj-color-text,#1f2937);font-weight:var(--dj-font-weight-semibold,600);}
	`;

	@property({ type: Array }) items: Crumb[] = [];

	/** Derive the crumbs from the navigation location instead of `items`. Needs `@dojo-ng/history` installed. */
	@property({ type: Boolean }) track = false;

	/** Names a path in the no-trail case. Returns `undefined` to fall back to the path segment. JS only. */
	@property({ attribute: false }) resolveTitle?: (path: string) => string | undefined;

	@state() private location?: NavLocation;
	#i18n = new LocaleController(this);
	#unsubscribe?: () => void;

	override connectedCallback() {
		super.connectedCallback();
		this.#follow();
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		this.#stop();
	}

	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (changed.has("track")) {
			if (this.track) this.#follow();
			else this.#stop();
		}
	}

	/** Follow the location if tracking and history is (or later becomes) installed. */
	#follow() {
		if (!this.isConnected || !this.track || this.#unsubscribe) return;
		const instance = getHistory();
		if (instance) {
			this.#unsubscribe = instance.subscribe((location) => { this.location = location; });
		} else {
			// A WeakRef, so a group removed before history is installed (it may never be) is not kept alive.
			const self = new WeakRef(this);
			void whenHistory().then(() => { const group = self.deref(); if (group) group.#follow(); });
		}
	}

	#stop() {
		this.#unsubscribe?.();
		this.#unsubscribe = undefined;
		this.location = undefined;
	}

	/** The crumbs for the current location, or `undefined` when not tracking (or nothing to track yet). */
	#tracked(): TrackedCrumb[] | undefined {
		const instance = getHistory();
		if (!this.track || !instance || !this.location) return undefined;
		const entries: TrailEntry[] = this.location.trail ?? this.#fromPath(this.location.path);
		return entries.map((entry, i) => ({
			label: entry.label,
			path: entry.path,
			href: instance.href(entry.path),
			current: i === entries.length - 1,
		}));
	}

	#fromPath(path: string): TrailEntry[] {
		const segments = path.split(/[?#]/)[0].split("/").filter(Boolean);
		return segments.map((segment, i) => {
			const prefix = `/${segments.slice(0, i + 1).join("/")}`;
			return { path: prefix, label: this.resolveTitle?.(prefix) ?? decode(segment) };
		});
	}

	#onClick(event: MouseEvent, crumbs: TrackedCrumb[], index: number) {
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		const crumb = crumbs[index];
		const detail: NavigateDetail = {
			path: crumb.path,
			label: crumb.label,
			trail: crumbs.slice(0, index + 1).map(({ path, label }) => ({ path, label })),
		};
		this.emit("dj-navigate", { detail });
	}

	override render() {
		const tracked = this.#tracked();
		const crumbs: Crumb[] = tracked ?? this.items;
		const name = messages.resolve("dj", this.#i18n.locale, "breadcrumb") ?? "Breadcrumb";
		return html`<nav aria-label=${name}><ol part="list">${crumbs.map((c, i) => html`<li>${i > 0 ? html`<span class="sep" aria-hidden="true"></span> ` : nothing}${c.current || !c.href ? html`<span aria-current=${c.current ? "page" : nothing}>${c.label}</span>` : html`<a href=${c.href} @click=${tracked ? (event: MouseEvent) => this.#onClick(event, tracked, i) : nothing}>${c.label}</a>`}</li>`)}</ol></nav>`;
	}
}
export default DjBreadcrumbGroup;

function decode(segment: string): string {
	try {
		return decodeURIComponent(segment);
	} catch {
		return segment;
	}
}

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-navigate": CustomEvent<NavigateDetail>;
	}
}
