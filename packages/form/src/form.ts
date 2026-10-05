import { html, css } from "lit"; import { property } from "lit/decorators.js"; import DojoElement from "@dojo-ng/dojo-element";
/** A named control, as dj-form sees it: only what it reads or calls. */
type Field = HTMLElement & {
	name?: string;
	value?: unknown;
	checked?: boolean;
	disabled?: boolean;
	isDisabled?: boolean;
	checkValidity?: () => boolean;
	reportValidity?: () => boolean;
	formResetCallback?: () => void;
};

/**
 * `<dj-form>` — a layout wrapper that gathers values from its named child controls and emits
 * `dj-submit` with a `{ name: value }` object. `column` stacks fields.
 *
 * #### Submitting
 * - `submit()` checks every named control first. When one is invalid, the browser shows its
 *   message on the first invalid control, `dj-submit` is not emitted, and `submit()` returns
 *   false. Set `novalidate` to skip the check.
 * - Values follow the rules of a native form: a checkbox or switch counts only when it is
 *   checked, disabled controls are left out, and a name used by several checked controls
 *   gives an array.
 * - Enter in a field submits, except in a text area or other multi-line editor, where Enter
 *   adds a new line.
 *
 * #### A native form instead
 * - The controls are form-associated, so they also work in a native `<form>`, which adds
 *   posting to a URL, `FormData`, and reset buttons. A native form can sit inside
 *   `dj-form` for its layout.
 *
 * Events: `dj-submit` (`{ data }`), `dj-reset`.
 * Methods: `submit()`, `reset()`.
 */

export class DjForm extends DojoElement {
	static override version="0.1.2";
	static override styles=css`:host{display:flex;flex-wrap:wrap;gap:var(--dj-spacing-medium,1rem);} :host([column]){flex-direction:column;}`;
	@property({type:Boolean,reflect:true}) column=false;
	/** Skip the validity check in `submit()`, like a native form's `novalidate`. */
	@property({type:Boolean,reflect:true,attribute:"novalidate"}) noValidate=false;

	private fields(): Field[] {
		return Array.from(this.querySelectorAll("[name]")) as Field[];
	}

	/** Check the named controls, then emit `dj-submit`. Returns false when a control is invalid. */
	submit(): boolean {
		const fields = this.fields().filter((el) => !(el.isDisabled ?? el.disabled));
		if (!this.noValidate) {
			// checkValidity() on every field (not just until the first failure), so each invalid
			// control receives its `invalid` event and shows as user-invalid.
			const invalid = fields.filter((el) => typeof el.checkValidity === "function" && !el.checkValidity());
			if (invalid.length) {
				invalid[0].reportValidity?.();
				return false;
			}
		}
		const data: Record<string, unknown> = {};
		for (const el of fields) {
			const name = el.getAttribute("name");
			if (!name) continue;
			if (typeof el.checked === "boolean" && !el.checked) continue;
			const value = el.value;
			if (!(name in data)) data[name] = value;
			else if (Array.isArray(data[name])) (data[name] as unknown[]).push(value);
			else data[name] = [data[name], value];
		}
		this.emit("dj-submit", { detail: { data } });
		return true;
	}

	reset() {
		for (const el of this.fields()) {
			if (typeof el.formResetCallback === "function") el.formResetCallback();
			else if ("value" in el) el.value = "";
		}
		this.emit("dj-reset");
	}

	#onKeydown = (e: KeyboardEvent) => {
		if (e.key !== "Enter" || e.defaultPrevented || e.isComposing) return;
		// The event is retargeted to the slotted control, so look at the element the key
		// actually went to, inside the control's shadow root.
		const origin = e.composedPath()[0] as HTMLElement | undefined;
		if (!origin) return;
		if (origin.localName === "textarea" || origin.localName === "button" || origin.isContentEditable) return;
		this.submit();
	};

	override render() { return html`<slot @keydown=${this.#onKeydown}></slot>`; }
}
export default DjForm;
declare global { interface GlobalEventHandlersEventMap { "dj-submit": CustomEvent<{ data: Record<string, unknown> }>; "dj-reset": CustomEvent<Record<string,never>>; } }
