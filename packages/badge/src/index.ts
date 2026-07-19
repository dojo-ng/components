import { DjBadge } from "./dj-badge.js";
export * from "./dj-badge.js"; export default DjBadge;
DjBadge.define("dj-badge", DjBadge);
declare global { interface HTMLElementTagNameMap { "dj-badge": DjBadge; } }
