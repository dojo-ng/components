import { DjRadio } from "./dj-radio.js";
export * from "./dj-radio.js";
export default DjRadio;
DjRadio.define("dj-radio", DjRadio);
declare global { interface HTMLElementTagNameMap { "dj-radio": DjRadio; } }
