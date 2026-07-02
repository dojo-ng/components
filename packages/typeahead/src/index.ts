import { DjTypeahead } from "./dj-typeahead.js";
export * from "./dj-typeahead.js"; export default DjTypeahead;
DjTypeahead.define("dj-typeahead", DjTypeahead);
declare global { interface HTMLElementTagNameMap { "dj-typeahead": DjTypeahead; } }
