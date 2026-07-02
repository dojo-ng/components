import { DjTransition } from "./dj-transition.js";
export * from "./dj-transition.js"; export default DjTransition;
DjTransition.define("dj-transition", DjTransition);
declare global { interface HTMLElementTagNameMap { "dj-transition": DjTransition; } }
