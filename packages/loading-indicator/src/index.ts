import { DjLoadingIndicator } from "./dj-loading-indicator.js";
export * from "./dj-loading-indicator.js";
export default DjLoadingIndicator;
DjLoadingIndicator.define("dj-loading-indicator", DjLoadingIndicator);
declare global { interface HTMLElementTagNameMap { "dj-loading-indicator": DjLoadingIndicator; } }
