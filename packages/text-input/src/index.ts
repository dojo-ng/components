import { DjTextInput } from "./dj-text-input.js";
export * from "./dj-text-input.js";
export default DjTextInput;
DjTextInput.define("dj-text-input", DjTextInput);
declare global { interface HTMLElementTagNameMap { "dj-text-input": DjTextInput; } }
