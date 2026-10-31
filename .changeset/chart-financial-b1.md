---
"@dojo-ng/chart-financial": minor
---

Fixes from a real-browser pass of the financial chart.

- `tradingDayTicks` now honors its pixel budget. It steps from month to quarter, half-year, year, and multi-year starts until labels sit at least 24px apart, judged on their actual positions, and a boundary too close to the always-kept first or last date gives way to it. Before, a budget too small for quarters still returned quarters, so a narrow chart got the same labels as a wide one.
- The crosshair's value label stays inside the plot instead of being clipped in the tick gutter, and shows only as many decimals as one pixel of the axis resolves. Both crosshair labels have a fixed 12px size and are clamped so they never run off the plot.
- The candlestick plugin names itself in the chart's accessible summary ("Price candlesticks", or "Price OHLC bars").
- Under forced colors, indicator lines and their legend swatch use Highlight so they stay distinct from the candles, the crosshair uses CanvasText, and the up-candle legend swatch is hollow to match the hollow up candles.
