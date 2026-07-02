import { DjContextPopup } from "./dj-context-popup.js";
export * from "./dj-context-popup.js"; export default DjContextPopup;
DjContextPopup.define("dj-context-popup", DjContextPopup);
declare global { interface HTMLElementTagNameMap { "dj-context-popup": DjContextPopup; } }
