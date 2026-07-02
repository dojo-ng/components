import { DjGrid } from "./grid.js";
export * from "./grid.js"; export default DjGrid;
DjGrid.define("dj-grid", DjGrid);
declare global { interface HTMLElementTagNameMap { "dj-grid": DjGrid; } }
