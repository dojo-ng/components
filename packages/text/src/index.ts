import { DjText } from "./text.js";
export * from "./text.js"; export default DjText;
DjText.define("dj-text", DjText);
declare global { interface HTMLElementTagNameMap { "dj-text": DjText; } }
