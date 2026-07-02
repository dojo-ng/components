import { DjPagination } from "./pagination.js";
export * from "./pagination.js"; export default DjPagination;
DjPagination.define("dj-pagination", DjPagination);
declare global { interface HTMLElementTagNameMap { "dj-pagination": DjPagination; } }
