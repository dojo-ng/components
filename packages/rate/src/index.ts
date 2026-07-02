import { DjRate } from "./rate.js";
export * from "./rate.js"; export default DjRate;
DjRate.define("dj-rate", DjRate);
declare global { interface HTMLElementTagNameMap { "dj-rate": DjRate; } }
