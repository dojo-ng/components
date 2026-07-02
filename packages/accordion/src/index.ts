import { DjAccordion } from "./accordion.js";
export * from "./accordion.js"; export default DjAccordion;
DjAccordion.define("dj-accordion", DjAccordion);
declare global { interface HTMLElementTagNameMap { "dj-accordion": DjAccordion; } }
