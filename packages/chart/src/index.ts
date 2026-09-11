import { DjChart } from "./dj-chart.js";
import { DjSparkline } from "./dj-sparkline.js";
export * from "./dj-chart.js";
export * from "./dj-sparkline.js";
export * from "./types.js";
export * from "./plugin.js";
export default DjChart;
DjChart.define("dj-chart", DjChart);
DjSparkline.define("dj-sparkline", DjSparkline);
declare global { interface HTMLElementTagNameMap { "dj-chart": DjChart; "dj-sparkline": DjSparkline; } }
