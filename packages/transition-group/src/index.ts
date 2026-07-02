import { DjTransitionGroup } from "./dj-transition-group.js";
export * from "./dj-transition-group.js"; export default DjTransitionGroup;
DjTransitionGroup.define("dj-transition-group", DjTransitionGroup);
declare global { interface HTMLElementTagNameMap { "dj-transition-group": DjTransitionGroup; } }
