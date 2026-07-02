import { DjTwoColumnLayout } from "./two-column-layout.js";
export * from "./two-column-layout.js"; export default DjTwoColumnLayout;
DjTwoColumnLayout.define("dj-two-column-layout", DjTwoColumnLayout);
declare global { interface HTMLElementTagNameMap { "dj-two-column-layout": DjTwoColumnLayout; } }
