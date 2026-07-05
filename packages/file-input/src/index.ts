import { DjFileInput } from "./dj-file-input.js";
export * from "./dj-file-input.js";
export * from "./accept.js";
export default DjFileInput;
DjFileInput.define("dj-file-input", DjFileInput);
declare global {
	interface HTMLElementTagNameMap { "dj-file-input": DjFileInput; }
}
