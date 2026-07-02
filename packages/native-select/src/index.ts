import { DjNativeSelect } from "./dj-native-select.js";
export * from "./dj-native-select.js";
export default DjNativeSelect;
DjNativeSelect.define("dj-native-select", DjNativeSelect);
declare global { interface HTMLElementTagNameMap { "dj-native-select": DjNativeSelect; } }
