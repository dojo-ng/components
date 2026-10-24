import type { CSSResultGroup } from "lit";
import { property } from "lit/decorators.js";
import DojoElement, { reducedMotion } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import type { NavigateDetail, TrailEntry } from "@dojo-ng/history/handle";
import { HistoryController } from "./history-controller.js";
import { renderArrowButton } from "./arrow-button.js";
import styles from "./arrow-button.styles.js";

registerDefaults("dj", { back: "Back", backTo: "Back to {title}" });

export type BackMode = "history" | "up";

/** The `detail` of `dj-back`. `mode` is what the button is about to do; `target` is the path it goes to in `up` mode. */
export interface BackDetail {
	mode: BackMode;
	target: string | undefined;
}

interface Parent {
	path: string;
	title: string | undefined;
	trail: TrailEntry[] | undefined;
}

/**
 * `<dj-back-button>` — a Back button that follows the app's navigation history.
 *
 * It is built on `<dj-button>`, so keyboard use, focus, and button semantics come from there.
 * Install `@dojo-ng/history` once at startup; the button finds it through `HistoryController`.
 *
 * #### Modes
 * - `history` (the default) does what the browser's Back button does, and is disabled when there
 *   is nowhere to go back to. With no history installed it calls `window.history.back()` and is
 *   never disabled.
 * - `up` goes to the parent of the current page instead, by dispatching `dj-navigate`. The parent
 *   is the second-to-last entry of the location's `trail` when it has one (a tracked `dj-tree`
 *   supplies it), otherwise the current path with its last segment removed. At the top level,
 *   a single-segment path or a trail of one, there is no parent, and the button behaves exactly
 *   as in `history` mode.
 *
 * #### Label
 * - In `up` mode with a parent, the label is "Back to {title}". The title is the trail entry's
 *   label, otherwise what `resolveTitle(parentPath)` returns. With no title, or in `history`
 *   mode, the label is "Back". Set `label` to replace the computed text.
 * - The label is recomputed on every location change, including when a trail arrives late, so it
 *   needs no timer.
 * - The accessible name always equals the visible label. With `icon-only`, only the arrow shows,
 *   the label becomes the accessible name, and a tooltip shows it on hover and focus.
 *
 * #### Taking over
 * - `dj-back` fires first and can be canceled. Call `preventDefault()` to do something else
 *   (confirm unsaved changes, close a panel); the button then does nothing further.
 *
 * Parts: `button` (the composed `<dj-button>`).
 * Events: `dj-back` (cancelable, detail `{ mode, target }`); `dj-navigate` (detail `{ path, label?, trail? }`)
 * in `up` mode, which `@dojo-ng/history` turns into a navigation.
 */
export class DjBackButton extends DojoElement {
	static override styles: CSSResultGroup = [styles, reducedMotion];
	static override version = "0.1.0";
	static override focusable = true;

	/** `history` calls Back. `up` goes to the parent page. */
	@property({ reflect: true }) mode: BackMode = "history";

	/** Replaces the computed label. */
	@property() label?: string;

	/** Show only the arrow. The label is still the accessible name, and a tooltip shows it. */
	@property({ attribute: "icon-only", type: Boolean, reflect: true }) iconOnly = false;

	/** Looks up the title of the parent page in `up` mode when the trail has none. JS only. */
	@property({ attribute: false }) resolveTitle?: (path: string) => string | undefined;

	#nav = new HistoryController(this);
	#i18n = new LocaleController(this);

	#parent(): Parent | undefined {
		const location = this.#nav.location;
		if (!location) return undefined;
		const trail = location.trail;
		if (trail) {
			if (trail.length < 2) return undefined;
			const entry = trail[trail.length - 2];
			return { path: entry.path, title: entry.label || this.resolveTitle?.(entry.path), trail: trail.slice(0, -1) };
		}
		const segments = location.path.split(/[?#]/)[0].split("/").filter(Boolean);
		if (segments.length < 2) return undefined;
		const path = `/${segments.slice(0, -1).join("/")}`;
		return { path, title: this.resolveTitle?.(path), trail: undefined };
	}

	#text(key: "back" | "backTo", title?: string): string {
		const fallback = key === "back" ? "Back" : `Back to ${title}`;
		return messages.resolve("dj", this.#i18n.locale, key, { title: title ?? "" }) ?? fallback;
	}

	#labelText(parent: Parent | undefined): string {
		if (this.label) return this.label;
		return this.mode === "up" && parent?.title ? this.#text("backTo", parent.title) : this.#text("back");
	}

	#onClick = (): void => {
		const parent = this.mode === "up" ? this.#parent() : undefined;
		const detail: BackDetail = { mode: parent ? "up" : "history", target: parent?.path };
		const event = this.emit("dj-back", { detail, cancelable: true });
		if (event.defaultPrevented) return;
		if (parent) {
			const go: NavigateDetail = { path: parent.path };
			if (parent.title) go.label = parent.title;
			if (parent.trail) go.trail = parent.trail;
			this.emit("dj-navigate", { detail: go });
		} else if (this.#nav.history) {
			this.#nav.history.back();
		} else {
			window.history.back();
		}
	};

	override focus(options?: FocusOptions): void {
		this.renderRoot?.querySelector<HTMLElement>("dj-button")?.focus(options);
	}

	override blur(): void {
		this.renderRoot?.querySelector<HTMLElement>("dj-button")?.blur();
	}

	override render() {
		const parent = this.mode === "up" ? this.#parent() : undefined;
		const label = this.#labelText(parent);
		const instance = this.#nav.history;
		const disabled = !parent && instance !== undefined && !instance.canGoBack;
		return renderArrowButton({
			direction: "back",
			label,
			disabled,
			iconOnly: this.iconOnly,
			rtl: this.#i18n.dir === "rtl",
			onClick: this.#onClick,
		});
	}
}
export default DjBackButton;

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-back": CustomEvent<BackDetail>;
		"dj-navigate": CustomEvent<NavigateDetail>;
	}
}
