import { DjCalendar } from "./dj-calendar.js";
export * from "./dj-calendar.js";
export default DjCalendar;
DjCalendar.define("dj-calendar", DjCalendar);
declare global { interface HTMLElementTagNameMap { "dj-calendar": DjCalendar; } }
