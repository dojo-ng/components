import { DjPasswordInput } from "./dj-password-input.js";
export * from "./dj-password-input.js"; export default DjPasswordInput;
DjPasswordInput.define("dj-password-input", DjPasswordInput);
declare global { interface HTMLElementTagNameMap { "dj-password-input": DjPasswordInput; } }
