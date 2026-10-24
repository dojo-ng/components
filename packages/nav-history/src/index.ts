import { DjBackButton } from "./dj-back-button.js";
export * from "./dj-back-button.js";
export { HistoryController } from "./history-controller.js";
export default DjBackButton;
DjBackButton.define("dj-back-button", DjBackButton);
declare global { interface HTMLElementTagNameMap { "dj-back-button": DjBackButton; } }
