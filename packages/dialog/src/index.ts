import { DjDialog } from "./dj-dialog.js";
export * from "./dj-dialog.js";
export default DjDialog;
DjDialog.define("dj-dialog", DjDialog);
declare global { interface HTMLElementTagNameMap { "dj-dialog": DjDialog; } }
