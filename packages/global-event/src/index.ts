import { DjGlobalEvent } from "./global-event.js";
export * from "./global-event.js"; export default DjGlobalEvent;
DjGlobalEvent.define("dj-global-event", DjGlobalEvent);
declare global { interface HTMLElementTagNameMap { "dj-global-event": DjGlobalEvent; } }
