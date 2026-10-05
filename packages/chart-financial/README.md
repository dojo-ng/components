# @dojo-ng/chart-financial

Candlestick, volume, indicator, and crosshair plugins for `<dj-chart>`, for stock and other price charts.

These are plugins, not a custom element: put them in `<dj-chart>`'s `plugins` property. A candlestick chart has no series of its own (`series: []`); the plugins draw everything.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/chart-financial
```

## Usage

Candles and a volume pane, with no core series. `y-scale="log"` suits prices that span a wide range.

```html
<div style="width: 560px; height: 360px">
  <dj-chart id="candles" type="line" category-key="date" label="AAPL, Jan-Mar 2024" y-scale="log"></dj-chart>
</div>
<script type="module">
  import "@dojo-ng/chart";
  import { candlestickPlugin, volumePlugin } from "@dojo-ng/chart-financial";
  const el = document.getElementById("candles");
  el.series = [];
  el.plugins = [
    candlestickPlugin({ open: "open", high: "high", low: "low", close: "close" }),
    volumePlugin({ key: "volume", height: 70 }),
  ];
  el.data = [
    { date: "2024-01-02", open: 185.6, high: 186.9, low: 184.2, close: 186.1, volume: 82_000_000 },
    { date: "2024-01-03", open: 186.1, high: 186.4, low: 183.4, close: 184.3, volume: 79_000_000 },
    { date: "2024-01-04", open: 184.3, high: 185.9, low: 182.7, close: 183.0, volume: 91_000_000 },
    { date: "2024-01-05", open: 183.0, high: 183.9, low: 181.8, close: 182.7, volume: 88_000_000 },
    { date: "2024-01-08", open: 182.7, high: 186.2, low: 182.1, close: 185.9, volume: 84_000_000 },
  ];
</script>
```

## Candlesticks

- `candlestickPlugin({ open, high, low, close, style?, upColor?, downColor?, label? })` reads four row keys and draws candle bodies (open to close) with wicks (low to high).
- A candle where open equals close still gets a thin visible body.
- `style: "bar"` draws OHLC bars instead, with the same data, tooltip, and table rows.
- Up and down colors come from the `--dj-chart-up` and `--dj-chart-down` tokens. Under `forced-colors: active`, up candles are hollow and down candles solid, because forced colors replace the token colors.

## Volume

- `volumePlugin({ key, height?, label? })` draws volume in its own pane below the price chart, not as a second axis, so it does not take space from the prices. Its columns line up exactly with the candles.
- It colors each bar by reading `open` and `close` keys from the row, not by asking the candlestick plugin. With a candlestick plugin that uses other key names, the bars fall back to a neutral color.

## Indicators

- `indicatorPlugin({ key, kind, period, k?, color?, label? })` draws a moving average or Bollinger bands, where `kind` is `"sma"`, `"ema"`, or `"bollinger"`.
- The math comes from the package's own `sma`, `ema`, and `bollinger` functions, which work on plain arrays without a chart.
- Before the window is full, the line has a gap, never a drop to zero, the same as `dj-chart`'s `missing` property.

## Crosshair

- `crosshairPlugin({ snap? })` draws a vertical guide at the hovered category and a horizontal guide at the pointer's value, both labeled on the axes.
- `snap: true` locks the vertical guide to the nearest category. The horizontal guide always follows the pointer.

## Dates on the x axis

- The x axis stays one slot per row, with the date as a plain string in `category-key`. A real time axis would leave empty space for weekends and holidays when the market was closed.
- `tradingDayTicks(categories, pixels, locale)` thins the labels to month starts, or quarter starts when months do not fit, and always keeps the first and last date. Use it through `dj-chart`'s `formatX`: `chart.formatX = (c) => keep.has(c) ? label(c) : ""`.

## Performance

- A chart with candles, volume, and an indicator renders in well under 200 ms at 2,000 categories, and stays fast up to about 10,000 categories on the hardware it was measured on.
- Above that, aggregate the data. The cost comes from the axis labels and hover areas that `dj-chart` draws for each category, not from the candles.

## Examples

### Adding a moving-average indicator

A 3-day moving average on the price axis. The line starts on day 3, when the window is full.

```html
<div style="width: 560px; height: 360px">
  <dj-chart id="withIndicator" type="line" category-key="date" label="AAPL with a 3-day SMA" y-scale="log"></dj-chart>
</div>
<script type="module">
  import "@dojo-ng/chart";
  import { candlestickPlugin, indicatorPlugin, sma } from "@dojo-ng/chart-financial";
  const el = document.getElementById("withIndicator");
  el.series = [];
  el.data = [
    { date: "2024-01-02", open: 185.6, high: 186.9, low: 184.2, close: 186.1 },
    { date: "2024-01-03", open: 186.1, high: 186.4, low: 183.4, close: 184.3 },
    { date: "2024-01-04", open: 184.3, high: 185.9, low: 182.7, close: 183.0 },
    { date: "2024-01-05", open: 183.0, high: 183.9, low: 181.8, close: 182.7 },
    { date: "2024-01-08", open: 182.7, high: 186.2, low: 182.1, close: 185.9 },
  ];
  el.plugins = [
    candlestickPlugin({ open: "open", high: "high", low: "low", close: "close" }),
    indicatorPlugin({ key: "close", kind: "sma", period: 3, label: "SMA(3)" }),
  ];
  // The same numbers with no chart at all:
  // sma(el.data.map((d) => d.close), 3); // [null, null, 184.47..., 183.33..., 183.87...]
</script>
```

### Trading-day tick labels on the ordinal axis

Month-start labels from `tradingDayTicks`, applied through `formatX`.

```html
<div style="width: 560px; height: 220px">
  <dj-chart id="ticks" type="line" category-key="date" label="Two years of daily closes" show-grid></dj-chart>
</div>
<script type="module">
  import "@dojo-ng/chart";
  import { tradingDayTicks } from "@dojo-ng/chart-financial";
  const el = document.getElementById("ticks");
  el.series = [{ key: "close", label: "Close" }];
  el.data = Array.from({ length: 500 }, (_, i) => {
    const d = new Date(Date.UTC(2024, 0, 2) + i * 86400000);
    return { date: d.toISOString().slice(0, 10), close: 150 + Math.sin(i / 20) * 15 };
  });
  const keep = new Set(tradingDayTicks(el.data.map((d) => d.date), el.clientWidth, document.documentElement.lang || "en-US"));
  el.formatX = (category) => (keep.has(category) ? category : "");
</script>
```
