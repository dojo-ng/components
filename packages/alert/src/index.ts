import { DjAlert } from "./dj-alert.js";
export * from "./dj-alert.js"; export default DjAlert;
DjAlert.define("dj-alert", DjAlert);
declare global { interface HTMLElementTagNameMap { "dj-alert": DjAlert; } }
