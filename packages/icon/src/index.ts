import { DjIcon } from "./dj-icon.js";
export * from "./dj-icon.js";
export { registerIcon, registerIcons, getIcon, hasIcon, onIconsChanged } from "./registry.js";
export default DjIcon;
DjIcon.define("dj-icon", DjIcon);
declare global { interface HTMLElementTagNameMap { "dj-icon": DjIcon; } }
