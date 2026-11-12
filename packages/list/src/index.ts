import { DjList } from "./dj-list.js";
export * from "./dj-list.js"; export default DjList;
export * from "./remote-options.js";
DjList.define("dj-list", DjList);
declare global { interface HTMLElementTagNameMap { "dj-list": DjList; } }
