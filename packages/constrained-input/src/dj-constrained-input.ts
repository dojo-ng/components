import { property } from "lit/decorators.js";
import DjTextInput from "@dojo-ng/text-input";
/**
 * `<dj-constrained-input>` — a text input with a custom `validator` function:
 * `(value) => string | undefined` returning an error message (or undefined when valid).
 * Applied through native constraint validation, so it participates in form validity.
 * (Dojo's rule-DSL ValidationRules is deferred; supply a function for now.)
 */
export class DjConstrainedInput extends DjTextInput {
	static override version = "0.1.0";
	/** Custom validator; return an error message, or undefined/empty when valid. */
	@property({ attribute: false }) validator?: (value: string) => string | undefined;
	protected override customValidate(value: string): string {
		return this.validator ? (this.validator(value) ?? "") : "";
	}
}
export default DjConstrainedInput;
