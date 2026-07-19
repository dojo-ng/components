import { DjDropdown } from "./dj-dropdown.js";
export * from "./dj-dropdown.js"; export default DjDropdown;
DjDropdown.define("dj-dropdown", DjDropdown);
declare global { interface HTMLElementTagNameMap { "dj-dropdown": DjDropdown; } }
