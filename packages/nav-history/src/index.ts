import { DjBackButton } from "./dj-back-button.js";
import { DjForwardButton } from "./dj-forward-button.js";
export * from "./dj-back-button.js";
export * from "./dj-forward-button.js";
export { confirmLeave, type ConfirmLeaveOptions } from "./confirm-leave.js";
export { HistoryController } from "./history-controller.js";
export default DjBackButton;
DjBackButton.define("dj-back-button", DjBackButton);
DjForwardButton.define("dj-forward-button", DjForwardButton);
declare global { interface HTMLElementTagNameMap { "dj-back-button": DjBackButton; "dj-forward-button": DjForwardButton; } }
