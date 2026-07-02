import { DjForm } from "./form.js";
export * from "./form.js"; export default DjForm;
DjForm.define("dj-form", DjForm);
declare global { interface HTMLElementTagNameMap { "dj-form": DjForm; } }
