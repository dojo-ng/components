import { DjRichText } from "./dj-rich-text.js";
export * from "./dj-rich-text.js";
export * from "./plugin.js";
export * from "./default-plugins.js";
export { sanitizeHtml } from "./sanitize-html.js";
export default DjRichText;
DjRichText.define("dj-rich-text", DjRichText);
declare global { interface HTMLElementTagNameMap { "dj-rich-text": DjRichText; } }
