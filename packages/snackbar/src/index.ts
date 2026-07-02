import { DjSnackbar } from "./snackbar.js";
export * from "./snackbar.js"; export default DjSnackbar;
DjSnackbar.define("dj-snackbar", DjSnackbar);
declare global { interface HTMLElementTagNameMap { "dj-snackbar": DjSnackbar; } }
