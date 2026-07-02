import { property } from "lit/decorators.js";
import DjTextInput, { type TextInputType } from "@dojo-ng/text-input";
/** `<dj-email-input>` — a text input defaulting to `type="email"` (native email validation). */
export class DjEmailInput extends DjTextInput {
	static override version = "0.1.0";
	@property() override type: TextInputType = "email";
}
export default DjEmailInput;
