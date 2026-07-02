import { DjSlider } from "./dj-slider.js";
export * from "./dj-slider.js";
export default DjSlider;
DjSlider.define("dj-slider", DjSlider);
declare global { interface HTMLElementTagNameMap { "dj-slider": DjSlider; } }
