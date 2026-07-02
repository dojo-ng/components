import { html } from "lit"; import { property } from "lit/decorators.js"; import DojoElement from "@dojo-ng/dojo-element";
type Listeners = Record<string, (e: Event) => void>;
/**
 * `<dj-global-event>` — non-visual; attaches listeners to window/document for its lifetime.
 * Set `windowListeners` / `documentListeners` (maps of event name → handler) as properties.
 */
export class DjGlobalEvent extends DojoElement {
	static override version="0.1.0";
	@property({attribute:false}) windowListeners: Listeners = {};
	@property({attribute:false}) documentListeners: Listeners = {};
	#win: Listeners = {}; #doc: Listeners = {};
	override connectedCallback(){ super.connectedCallback(); this.attach(); }
	override disconnectedCallback(){ super.disconnectedCallback(); this.detach(); }
	protected override updated(){ this.detach(); this.attach(); }
	private attach(){
		this.#win = { ...this.windowListeners }; this.#doc = { ...this.documentListeners };
		for (const [k,fn] of Object.entries(this.#win)) window.addEventListener(k, fn);
		for (const [k,fn] of Object.entries(this.#doc)) document.addEventListener(k, fn);
	}
	private detach(){
		for (const [k,fn] of Object.entries(this.#win)) window.removeEventListener(k, fn);
		for (const [k,fn] of Object.entries(this.#doc)) document.removeEventListener(k, fn);
		this.#win = {}; this.#doc = {};
	}
	override render(){ return html``; }
}
export default DjGlobalEvent;
