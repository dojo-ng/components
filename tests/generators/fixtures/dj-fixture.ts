import { html } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";

/**
 * `<dj-fixture>` — a fixture component for the generator (genlib) tests. It is NOT
 * a real component and is not built or registered; it only exercises the tricky
 * parse cases: props with defaults + attribute inference, an @cssprop whose
 * default is itself a var() (the case that once truncated the CEM), slots/parts
 * declared in both the JSDoc and the template, an emitted event, and a public
 * method alongside private/render members that must be excluded.
 *
 * Slots: `title`, default (main content).
 * Parts: `control` (the box), `label`.
 * Events: `dj-change` (fired when the value changes).
 *
 * @cssprop [--dj-fixture-color=var(--dj-fallback-color)] - Text color.
 * @cssprop --dj-fixture-gap - Gap between items.
 */
export class DjFixture extends DojoElement {
	static override version = "0.1.0";

	@property({ type: Number }) count = 3;
	@property({ attribute: "is-open", type: Boolean, reflect: true }) open = false;
	@property() label?: string;

	/** Reset the widget to its defaults. */
	reset(options?: FocusOptions): void { this.count = 0; }
	private internalHelper() {}
	private change() { this.emit("dj-change"); }

	override render() {
		return html`
			<div part="control" class="box">
				<slot name="title"></slot>
				<slot></slot>
				<span part="label extra"></span>
			</div>
		`;
	}
}
