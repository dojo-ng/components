import { DjColorPicker } from "./dj-color-picker.js";
export * from "./dj-color-picker.js";
export * from "./color.js";
export default DjColorPicker;
DjColorPicker.define("dj-color-picker", DjColorPicker);
declare global {
	interface HTMLElementTagNameMap { "dj-color-picker": DjColorPicker; }
}
