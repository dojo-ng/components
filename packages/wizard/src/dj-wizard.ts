import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import "@dojo-ng/avatar";
import "@dojo-ng/icon";
import styles from "./dj-wizard.styles.js";

export type StepStatus = "pending" | "inProgress" | "complete" | "error";
export interface Step { title?: string; subTitle?: string; description?: string; status?: StepStatus; }

/**
 * `<dj-wizard>` — step progress indicator. `steps` describes each step; `active-step` derives
 * statuses (before=complete, at=inProgress, after=pending) unless a step sets its own. When
 * `clickable`, clicking a step emits `dj-step` with its index. Part: `step`.
 */
export class DjWizard extends DojoElement {
	static override styles = styles;
	static override version = "0.1.0";
	@property({ type: Array }) steps: Step[] = [];
	@property({ attribute: "active-step", type: Number }) activeStep?: number;
	@property({ reflect: true }) direction: "horizontal" | "vertical" = "horizontal";
	@property({ type: Boolean }) clickable = false;

	private statusFor(step: Step, i: number): StepStatus {
		if (step.status) return step.status;
		if (this.activeStep === undefined) return "pending";
		if (this.activeStep > i) return "complete";
		if (this.activeStep < i) return "pending";
		return "inProgress";
	}

	override render() {
		return html`<div class="steps" role="list">
			${this.steps.map((step, i) => {
				const status = this.statusFor(step, i);
				return html`<div class="connector" aria-hidden="true"></div>
				<div part="step" role="listitem" class="step step--${status} ${this.clickable ? "clickable" : ""}"
					tabindex=${this.clickable ? 0 : nothing}
					aria-current=${status === "inProgress" ? "step" : nothing}
					@click=${() => { if (this.clickable) this.emit("dj-step", { detail: { index: i } }); }}
					@keydown=${(e: KeyboardEvent) => { if (this.clickable && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); this.emit("dj-step", { detail: { index: i } }); } }}>
					<span class="indicator">
						${status === "complete"
							? html`<dj-icon size="small"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4 10-10" fill="none" stroke="currentColor" stroke-width="2"/></svg></dj-icon>`
							: status === "error"
								? html`<dj-icon size="small"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" fill="none"/></svg></dj-icon>`
								: html`${i + 1}`}
					</span>
					<span class="text">
						${step.title ? html`<span class="title">${step.title}</span>` : nothing}
						${step.subTitle ? html`<span class="subtitle">${step.subTitle}</span>` : nothing}
						${step.description ? html`<span class="description">${step.description}</span>` : nothing}
					</span>
				</div>`;
			})}
		</div>`;
	}
}
export default DjWizard;
declare global { interface GlobalEventHandlersEventMap { "dj-step": CustomEvent<{ index: number }>; } }
