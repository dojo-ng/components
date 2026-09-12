# @dojo-ng/chart-financial

Candlestick, volume, and indicator plugins for @dojo-ng/chart (OHLC support package, no custom element)

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> Opt-in candlestick/OHLC-bar, volume, indicator, and crosshair plugins for `@dojo-ng/chart` (not a custom element — push them onto `<dj-chart>`'s own `plugins` property, built with `defineChartPlugin`). A candlestick chart has no `series` of its own: `candlestickPlugin({ open, high, low, close, style?, upColor?, downColor?, label? })` reads four row keys directly and draws candle bodies (open→close, a doji still gets a visible minimum-height body rather than vanishing) with wicks (low→high), or `style: "bar"` for OHLC ticks instead — same data, same tooltip, same table rows, just a different mark. Up/down default to the `--dj-chart-up`/`--dj-chart-down` theme tokens; under `forced-colors: active` up renders hollow and down solid (a real candlestick-platform convention), since forced-colors flattens computed color regardless of what those tokens resolve to. `volumePlugin({ key, height?, label? })` is a PANE below the price chart (never a right-axis series — it would share the price chart's vertical space), sharing the exact same x scale so its columns line up with the price chart's exactly; it colors bars by reading conventional `"open"`/`"close"` keys directly off each row — NOT by asking a co-installed `candlestickPlugin` what keys it was configured with, so pairing it with a candlestick plugin that uses different key names falls back to neutral bars, a documented limitation rather than a silent mismatch. `indicatorPlugin({ key, kind: "sma"|"ema"|"bollinger", period, k?, color?, label? })` draws a moving-average or Bollinger-band overlay computed by this package's own exported `sma`/`ema`/`bollinger` (plain array functions, usable with no chart at all); a position before the window fills is a real gap in the line, never a drop to zero, the same convention `@dojo-ng/chart`'s own `missing` property uses. `crosshairPlugin({ snap? })` draws a vertical guide at the hovered category and a horizontal guide at the pointer's value, both with axis labels; `snap: true` locks the vertical guide to the nearest category center instead of following the pointer continuously (the horizontal guide always follows the raw pointer value — snapping it to an exact price would need an OHLC key name this plugin doesn't have, the same uncoupling `volumePlugin` already accepts). THE X AXIS STAYS ORDINAL, ON PURPOSE: `categoryKey` holds the date as a plain string, one slot per row, not a continuous `scaleTime` axis — a real time scale reserves visible width for weekends and holidays a market never traded on, which is a worse chart, not a more precise one. `tradingDayTicks(categories, pixels, locale)` thins the ordinal labels to month or (once month starts don't clear a 24px gap) quarter boundaries, keeping the first and last category always visible; wire it through `dj-chart`'s EXISTING `formatX` property (`chart.formatX = (c) => keepSet.has(c) ? label(c) : ""`) — the core needs no change at all to support it. GUIDANCE CAP, MEASURED, NOT ENFORCED: a candlestick + volume + indicator chart (the heaviest realistic combination) renders in well under 200ms measured at 2,000 categories and stays close to linear out to tens of thousands — comfortably fast through roughly 10,000 categories on the hardware this was measured on. Aggregate above that regardless: the per-category axis tick label and hit-band `@dojo-ng/chart` itself draws (not this package, and not the candles) is the actual cost driver, the same one a very wide plain line chart pays.

## Install

```bash
npm install @dojo-ng/chart-financial
```

## Usage

`series: []` on `<dj-chart>` — the candlestick and volume plugins draw everything; there is no core series to configure. `y-scale="log"` is the natural axis for a price chart spanning a wide range. The volume pane colors its bars by reading the SAME `open`/`close` keys the candlestick plugin was given, since it always reads those two conventional key names off the row rather than asking the other plugin what it was configured with.

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

## Examples

### Adding a moving-average indicator

`indicatorPlugin` overlays a computed series on the SAME price axis the candles use. The leading run before the window fills is a real gap in the line (not a drop to zero) — visible here as no line at all until day 3 with `period: 3`. `sma`/`ema`/`bollinger` are also exported as plain functions with no chart dependency, for computing the same numbers outside a chart entirely.

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

The x axis stays ordinal — one slot per date string, not a continuous time scale that would reserve width for the weekends this market never traded on. `tradingDayTicks` picks which categories to label (month starts, falling back to quarter starts once month starts would crowd), wired through `dj-chart`'s own `formatX` — the core needs no change to support it.

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
