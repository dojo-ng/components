import { DjCommandPalette } from "./dj-command-palette.js";
export * from "./dj-command-palette.js";
export { filterCommands } from "./match.js";
export default DjCommandPalette;
DjCommandPalette.define("dj-command-palette", DjCommandPalette);
declare global { interface HTMLElementTagNameMap { "dj-command-palette": DjCommandPalette; } }
