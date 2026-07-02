import { DjTree } from "./tree.js";
export * from "./tree.js"; export default DjTree;
DjTree.define("dj-tree", DjTree);
declare global { interface HTMLElementTagNameMap { "dj-tree": DjTree; } }
