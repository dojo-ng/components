import { DjSlidePane } from "./dj-slide-pane.js";
export * from "./dj-slide-pane.js";
export default DjSlidePane;
DjSlidePane.define("dj-slide-pane", DjSlidePane);
declare global { interface HTMLElementTagNameMap { "dj-slide-pane": DjSlidePane; } }
