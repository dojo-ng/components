import { html, css } from "lit"; import { property } from "lit/decorators.js"; import DojoElement from "@dojo-ng/dojo-element";
/**
 * `<dj-form>` — a layout wrapper that gathers values from its named child controls and emits
 * `dj-submit` with a `{ name: value }` object. `column` stacks fields. Because slotted fields
 * live in light DOM (outside any shadow `<form>`), values are read from each named child's
 * `value`. For full native form semantics, the controls are form-associated, so wrapping them
 * in a real `<form>` also works.
 */
export class DjForm extends DojoElement {
	static override version="0.1.0";
	static override styles=css`:host{display:flex;flex-wrap:wrap;gap:var(--dj-spacing-medium,1rem);} :host([column]){flex-direction:column;}`;
	@property({type:Boolean,reflect:true}) column=false;

	private fields(): (Element & { name?: string; value?: unknown })[] {
		return Array.from(this.querySelectorAll("[name]")) as (Element & { name?: string; value?: unknown })[];
	}
	submit() {
		const data: Record<string, unknown> = {};
		for (const el of this.fields()) { const name = el.getAttribute("name"); if (name) data[name] = (el as { value?: unknown }).value; }
		this.emit("dj-submit", { detail: { data } });
	}
	reset() {
		for (const el of this.fields()) {
			const anyEl = el as { formResetCallback?: () => void; value?: unknown };
			if (typeof anyEl.formResetCallback === "function") anyEl.formResetCallback();
			else if ("value" in anyEl) anyEl.value = "";
		}
		this.emit("dj-reset");
	}
	override render() { return html`<slot @keydown=${(e: KeyboardEvent) => { if (e.key === "Enter" && (e.target as HTMLElement)?.tagName !== "TEXTAREA") this.submit(); }}></slot>`; }
}
export default DjForm;
declare global { interface GlobalEventHandlersEventMap { "dj-submit": CustomEvent<{ data: Record<string, unknown> }>; "dj-reset": CustomEvent<Record<string,never>>; } }
