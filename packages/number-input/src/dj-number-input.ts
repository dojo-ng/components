import { property } from "lit/decorators.js";
import DjTextInput, { type TextInputType } from "@dojo-ng/text-input";
/** `<dj-number-input>` — a text input defaulting to `type="number"`; exposes `valueAsNumber`. */
export class DjNumberInput extends DjTextInput {
	static override version = "0.1.0";
	@property() override type: TextInputType = "number";
	get valueAsNumber(): number { return this.value === "" ? NaN : parseFloat(this.value); }
}
export default DjNumberInput;
