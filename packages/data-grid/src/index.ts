import { DjDataGrid } from "./dj-data-grid.js";
export * from "./dj-data-grid.js"; export default DjDataGrid;
DjDataGrid.define("dj-data-grid", DjDataGrid);
declare global { interface HTMLElementTagNameMap { "dj-data-grid": DjDataGrid; } }
