import { DjHeader } from "./header.js";
export * from "./header.js"; export default DjHeader;
DjHeader.define("dj-header", DjHeader);
declare global { interface HTMLElementTagNameMap { "dj-header": DjHeader; } }
