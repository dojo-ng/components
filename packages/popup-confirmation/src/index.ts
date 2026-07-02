import { DjPopupConfirmation } from "./popup-confirmation.js";
export * from "./popup-confirmation.js"; export default DjPopupConfirmation;
DjPopupConfirmation.define("dj-popup-confirmation", DjPopupConfirmation);
declare global { interface HTMLElementTagNameMap { "dj-popup-confirmation": DjPopupConfirmation; } }
