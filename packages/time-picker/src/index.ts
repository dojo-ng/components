import { DjTimePicker } from "./time-picker.js";
export * from "./time-picker.js"; export default DjTimePicker;
DjTimePicker.define("dj-time-picker", DjTimePicker);
declare global { interface HTMLElementTagNameMap { "dj-time-picker": DjTimePicker; } }
