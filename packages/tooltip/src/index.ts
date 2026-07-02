import { DjTooltip } from "./dj-tooltip.js";
export * from "./dj-tooltip.js";
export default DjTooltip;
DjTooltip.define("dj-tooltip", DjTooltip);
declare global { interface HTMLElementTagNameMap { "dj-tooltip": DjTooltip; } }
