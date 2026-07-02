import { DjResult } from "./dj-result.js";
export * from "./dj-result.js"; export default DjResult;
DjResult.define("dj-result", DjResult);
declare global { interface HTMLElementTagNameMap { "dj-result": DjResult; } }
