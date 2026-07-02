import { DjLabel } from "./dj-label.js";
export * from "./dj-label.js";
export default DjLabel;
DjLabel.define("dj-label", DjLabel);
declare global { interface HTMLElementTagNameMap { "dj-label": DjLabel; } }
