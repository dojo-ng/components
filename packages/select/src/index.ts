import { DjSelect } from "./dj-select.js";
export * from "./dj-select.js"; export default DjSelect;
DjSelect.define("dj-select", DjSelect);
declare global { interface HTMLElementTagNameMap { "dj-select": DjSelect; } }
