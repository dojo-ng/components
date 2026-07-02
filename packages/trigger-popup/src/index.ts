import { DjTriggerPopup } from "./dj-trigger-popup.js";
export * from "./dj-trigger-popup.js"; export default DjTriggerPopup;
DjTriggerPopup.define("dj-trigger-popup", DjTriggerPopup);
declare global { interface HTMLElementTagNameMap { "dj-trigger-popup": DjTriggerPopup; } }
