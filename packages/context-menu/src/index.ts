import { DjContextMenu } from "./context-menu.js";
export * from "./context-menu.js"; export default DjContextMenu;
DjContextMenu.define("dj-context-menu", DjContextMenu);
declare global { interface HTMLElementTagNameMap { "dj-context-menu": DjContextMenu; } }
