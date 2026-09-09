import { DjNav } from "./dj-nav.js";
export * from "./dj-nav.js"; export default DjNav;
DjNav.define("dj-nav", DjNav);
declare global { interface HTMLElementTagNameMap { "dj-nav": DjNav; } }
