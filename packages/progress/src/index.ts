import { DjProgress } from "./progress.js";
export * from "./progress.js"; export default DjProgress;
DjProgress.define("dj-progress", DjProgress);
declare global { interface HTMLElementTagNameMap { "dj-progress": DjProgress; } }
