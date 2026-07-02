import { DjChart } from "./dj-chart.js";
export * from "./dj-chart.js";
export * from "./types.js";
export default DjChart;
DjChart.define("dj-chart", DjChart);
declare global { interface HTMLElementTagNameMap { "dj-chart": DjChart; } }
