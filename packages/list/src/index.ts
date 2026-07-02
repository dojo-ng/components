import { DjList } from "./dj-list.js";
export * from "./dj-list.js"; export default DjList;
DjList.define("dj-list", DjList);
declare global { interface HTMLElementTagNameMap { "dj-list": DjList; } }
