import { DjToolbar } from "./dj-toolbar.js";
export * from "./dj-toolbar.js";
export default DjToolbar;
DjToolbar.define("dj-toolbar", DjToolbar);
declare global { interface HTMLElementTagNameMap { "dj-toolbar": DjToolbar; } }
