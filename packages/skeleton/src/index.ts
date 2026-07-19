import { DjSkeleton } from "./dj-skeleton.js";
export * from "./dj-skeleton.js"; export default DjSkeleton;
DjSkeleton.define("dj-skeleton", DjSkeleton);
declare global { interface HTMLElementTagNameMap { "dj-skeleton": DjSkeleton; } }
