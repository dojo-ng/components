import { DjCheckboxGroup } from "./checkbox-group.js";
export * from "./checkbox-group.js"; export default DjCheckboxGroup;
DjCheckboxGroup.define("dj-checkbox-group", DjCheckboxGroup);
declare global { interface HTMLElementTagNameMap { "dj-checkbox-group": DjCheckboxGroup; } }
