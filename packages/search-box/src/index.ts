import { DjSearchBox } from "./dj-search-box.js";
export * from "./query.js";
export * from "./dj-search-box.js";
export default DjSearchBox;
DjSearchBox.define("dj-search-box", DjSearchBox);
declare global { interface HTMLElementTagNameMap { "dj-search-box": DjSearchBox; } }
