import { DjTextArea } from "./dj-text-area.js";
export * from "./dj-text-area.js";
export default DjTextArea;
DjTextArea.define("dj-text-area", DjTextArea);
declare global { interface HTMLElementTagNameMap { "dj-text-area": DjTextArea; } }
