import { DjWizard } from "./dj-wizard.js";
export * from "./dj-wizard.js"; export default DjWizard;
DjWizard.define("dj-wizard", DjWizard);
declare global { interface HTMLElementTagNameMap { "dj-wizard": DjWizard; } }
