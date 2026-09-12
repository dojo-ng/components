export * from "./indicators.js";
// Only the frozen public surface (`candlestickPlugin`, `OhlcKeys`, `volumePlugin`) plus the two
// named options interfaces genlib.py's catalog generator needs (`CandlestickPluginOptions`,
// `VolumePluginOptions` — see the comments on each) are re-exported here. Each module's own
// geometry helpers/constants stay internal — tested by importing the module directly, the same way
// `core.ts`'s helpers are tested in `@dojo-ng/chart` without being part of its own public index.
export { candlestickPlugin, type OhlcKeys, type CandlestickPluginOptions } from "./candlestick.js";
export { volumePlugin, type VolumePluginOptions } from "./volume.js";
export { indicatorPlugin, type IndicatorPluginOptions } from "./indicator.js";
export { crosshairPlugin, type CrosshairPluginOptions } from "./crosshair.js";
export { tradingDayTicks } from "./trading-day-ticks.js";
