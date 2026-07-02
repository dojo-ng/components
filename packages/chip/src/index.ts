import { DjChip } from "./dj-chip.js";
export * from "./dj-chip.js"; export default DjChip;
DjChip.define("dj-chip", DjChip);
declare global { interface HTMLElementTagNameMap { "dj-chip": DjChip; } }
