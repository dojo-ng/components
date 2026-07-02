import { DjSpeedDial } from "./speed-dial.js";
export * from "./speed-dial.js"; export default DjSpeedDial;
DjSpeedDial.define("dj-speed-dial", DjSpeedDial);
declare global { interface HTMLElementTagNameMap { "dj-speed-dial": DjSpeedDial; } }
