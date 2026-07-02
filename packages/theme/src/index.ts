import { DjTheme } from "./dj-theme.js";
export * from "./dj-theme.js";
export default DjTheme;
DjTheme.define("dj-theme", DjTheme);
declare global { interface HTMLElementTagNameMap { "dj-theme": DjTheme; } }
