# @dojo-ng/chart

`<dj-chart>` — A themeable, accessible SVG chart.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A themeable, accessible SVG chart. Set `data` (array of rows) and `series`. `type` selects the mark: cartesian (`line`, `area`, `bar`) reads `category-key` for x; x/y (`scatter`, `bubble`) reads `x-key` for a numeric x (and `size-key` for bubble radius); radial (`pie`, `donut`) draws one series as slices by category. `stacked` stacks bars and areas; a series may override `type` for combos. Built on D3 math (scales, shapes) with the SVG owned here, so marks are themeable via `--dj-*` tokens (a `--dj-chart-1..8` ramp) and `::part()`, and the chart is real DOM for assistive tech. It exposes a visually-hidden data table as the accessible equivalent, carries `role="img"` with a generated summary, and honors reduced motion. Not a form control. `legend-toggle` makes legend items toggle series visibility; `brush` adds an overview strip below cartesian charts for selecting the visible category window (double-click resets). {@link appendData} appends rows for cheap live updates without rebuilding the `data` array; `max-points` bounds how much history it keeps.

> Sizing: the chart fills its width and takes its height from the `--dj-chart-height` custom property (default `18rem`). Set that property to resize it; a fixed `height` on a wrapper element will not constrain the chart, and a wrapper shorter than the chart's height will let the legend overflow. The legend sits below the plot and is included in that height.

## Install

```bash
npm install @dojo-ng/chart
```

## Usage

Import the package to register the custom element, then use the tag.

Set `data` (array of rows), `series` (one entry per plotted value), and `category-key` (the x accessor). `type` picks the default mark; set `stacked` to stack bars or areas. The chart is responsive, themes via the `--dj-chart-1..8` ramp, and ships a visually-hidden data table plus `role="img"` summary for assistive tech.

```html
<div style="width: 480px; height: 280px">
  <dj-chart id="c" type="bar" category-key="month" label="Monthly revenue" show-grid x-label="Month" y-label="USD (k)"></dj-chart>
</div>
<script type="module">
  import "@dojo-ng/chart";
  const c = document.getElementById("c");
  c.series = [{ key: "revenue", label: "Revenue" }, { key: "target", label: "Target" }];
  c.data = [
    { month: "Jan", revenue: 42, target: 40 },
    { month: "Feb", revenue: 50, target: 45 },
    { month: "Mar", revenue: 47, target: 48 },
  ];
  c.addEventListener("dj-hover", (e) => console.log(e.detail.category));
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `data` | — | `ChartDatum[]` | `[]` |
| `series` | — | `ChartSeries[]` | `[]` |
| `categoryKey` | category-key | `string` | `""` |
| `type` | type ↻ | `ChartType` | `"line"` |
| `orientation` | orientation ↻ | `"vertical" \| "horizontal"` | `"vertical"` |
| `stacked` | stacked | `boolean` | `false` |
| `showLegend` | show-legend | `boolean` | `true` |
| `showGrid` | show-grid | `boolean` | `true` |
| `xLabel` | x-label | `string` | — |
| `yLabel` | y-label | `string` | — |
| `yLabelRight` | y-label-right | `string` | — |
| `label` | label | `string` | — |
| `markers` | markers | `boolean` | `false` |
| `xKey` | x-key | `string` | `""` |
| `sizeKey` | size-key | `string` | — |
| `innerRadius` | inner-radius | `number` | — |
| `centerLabel` | center-label | `string` | — |
| `centerSubLabel` | center-sub-label | `string` | — |
| `legendToggle` | legend-toggle | `boolean` | `false` |
| `brush` | brush | `boolean` | `false` |
| `numberFormat` | — | `Intl.NumberFormatOptions` | — |
| `formatY` | — | `(value: number) => string` | — |
| `formatX` | — | `(category: string) => string` | — |
| `maxPoints` | max-points | `number` | `0` |

**Parts:** `plot`, `axis`, `grid`, `series`, `bar`, `line`, `point`, `slice`, `legend`, `legend-item`, `brush-handle`, `tooltip`, `center-label`, `center-sub-label`

**Events:** `dj-legend-toggle` (detail `{ key, hidden }`), `dj-hover` (detail `{ category }` or `null`; cartesian and radial)

**Methods:** `appendData(rows: ChartDatum[])` (Append rows without rebuilding `data` yourself: cheap live updates for streaming sources. Multiple calls within the same animation frame coalesce into a single `data` assignment. Trims from the front to `max-points` when set, and clears an active brush selection (its indices are into the pre-append data and would otherwise point at the wrong window).)

**CSS properties:** `--dj-chart-height` (default `18rem`; Overall chart height (width fills the container).), `--dj-chart-1` (default `#2563eb`; Categorical series color 1.), `--dj-chart-2` (default `#16a34a`; Categorical series color 2.), `--dj-chart-3` (default `#d97706`; Categorical series color 3.), `--dj-chart-4` (default `#dc2626`; Categorical series color 4.), `--dj-chart-5` (default `#7c3aed`; Categorical series color 5.), `--dj-chart-6` (default `#0891b2`; Categorical series color 6.), `--dj-chart-7` (default `#db2777`; Categorical series color 7.), `--dj-chart-8` (default `#65a30d`; Categorical series color 8.)

## Examples

### Stacked

Add `stacked` to stack the series (works for bars and areas). Each series takes a color from the theme ramp unless you set `color` on the series.

```html
<div style="width: 480px; height: 280px">
  <dj-chart id="s" type="bar" stacked category-key="month" label="Revenue by region"></dj-chart>
</div>
<script type="module">
  import "@dojo-ng/chart";
  const s = document.getElementById("s");
  s.series = [{ key: "west", label: "West" }, { key: "east", label: "East" }];
  s.data = [{ month: "Jan", west: 18, east: 14 }, { month: "Feb", west: 22, east: 16 }];
</script>
```

### Horizontal bars

Set `orientation="horizontal"` on a `bar` chart to put categories on the Y axis and values on the X axis; bars grow rightward from zero. Grouped and stacked both work. The `brush` and a secondary (right) axis are vertical-only, so they are ignored (with a console warning) when horizontal.

```html
<div style="width: 480px; height: 280px">
  <dj-chart id="h" type="bar" orientation="horizontal" category-key="team" label="Tickets by team" show-grid y-label="Tickets"></dj-chart>
</div>
<script type="module">
  import "@dojo-ng/chart";
  const h = document.getElementById("h");
  h.series = [{ key: "open", label: "Open" }, { key: "closed", label: "Closed" }];
  h.data = [
    { team: "Platform", open: 12, closed: 40 },
    { team: "Payments", open: 7, closed: 33 },
    { team: "Growth", open: 18, closed: 21 },
  ];
</script>
```

### Markers and number formatting

Add `markers` to show a point at each datum on line and area series. `numberFormat` (Intl options) formats the y-axis ticks and tooltip values, locale-aware via the document or ancestor `lang`; `formatY` and `formatX` take function overrides. Enter and update transitions honor `prefers-reduced-motion`.

```html
<div style="width: 480px; height: 280px">
  <dj-chart id="m" type="line" markers category-key="month" label="Monthly revenue" y-label="USD"></dj-chart>
</div>
<script type="module">
  import "@dojo-ng/chart";
  const m = document.getElementById("m");
  m.series = [{ key: "revenue", label: "Revenue" }];
  m.numberFormat = { style: "currency", currency: "USD", maximumFractionDigits: 0 };
  m.data = [
    { month: "Jan", revenue: 42000 },
    { month: "Feb", revenue: 50000 },
    { month: "Mar", revenue: 47000 },
  ];
</script>
```

### Scatter and bubble

`type="scatter"` plots a numeric `x-key` against each series value on linear axes. `type="bubble"` adds a `size-key` that area-encodes the radius. Each point gets a tooltip; the accessible table uses the x value as its row header.

```html
<div style="width: 480px; height: 280px">
  <dj-chart id="sc" type="bubble" x-key="spend" size-key="deals" label="Spend vs revenue" show-grid x-label="Spend" y-label="Revenue"></dj-chart>
</div>
<script type="module">
  import "@dojo-ng/chart";
  const sc = document.getElementById("sc");
  sc.series = [{ key: "revenue", label: "Revenue" }];
  sc.data = [
    { spend: 10, revenue: 42, deals: 8 },
    { spend: 22, revenue: 47, deals: 20 },
    { spend: 40, revenue: 92, deals: 33 },
  ];
</script>
```

### Pie and donut

`type="pie"` (or `"donut"`) draws the first series as slices, one per `category-key` value. `inner-radius` (a fraction of the radius) sets the hole; donut defaults to 0.6. The legend lists categories and each slice has a tooltip.

```html
<div style="width: 360px; height: 280px">
  <dj-chart id="pie" type="donut" category-key="region" label="Revenue share"></dj-chart>
</div>
<script type="module">
  import "@dojo-ng/chart";
  const pie = document.getElementById("pie");
  pie.series = [{ key: "value" }];
  pie.data = [
    { region: "West", value: 148 },
    { region: "East", value: 104 },
    { region: "Central", value: 81 },
  ];
</script>
```

### Donut with a center label

On a `donut`, `center-label` renders centered text in the hole (with an optional smaller `center-sub-label` below). It is sized from the hole radius, token-colored, exposed as `part="center-label"`, and appended to the chart's `aria-label` so assistive tech hears it. Ignored for non-donut types.

```html
<div style="width: 360px; height: 280px">
  <dj-chart id="dl" type="donut" category-key="region" label="Quota attainment" center-label="72%" center-sub-label="of goal"></dj-chart>
</div>
<script type="module">
  import "@dojo-ng/chart";
  const dl = document.getElementById("dl");
  dl.series = [{ key: "value" }];
  dl.data = [
    { region: "Attained", value: 72 },
    { region: "Remaining", value: 28 },
  ];
</script>
```

### Combo with a secondary axis

A series can override `type` to combine marks (a line over bars), and set `axis: "right"` to plot on a secondary y-axis with its own scale. `y-label-right` titles that axis. Useful when two measures share categories but not units (revenue and growth %).

```html
<div style="width: 480px; height: 280px">
  <dj-chart id="cm" type="bar" category-key="month" label="Revenue and growth" show-grid y-label="USD (k)" y-label-right="Growth %"></dj-chart>
</div>
<script type="module">
  import "@dojo-ng/chart";
  const cm = document.getElementById("cm");
  cm.series = [
    { key: "revenue", label: "Revenue" },
    { key: "growth", label: "Growth %", type: "line", axis: "right" },
  ];
  cm.data = [
    { month: "Jan", revenue: 42, growth: 4 },
    { month: "Feb", revenue: 50, growth: 12 },
    { month: "Mar", revenue: 47, growth: 8 },
  ];
</script>
```

### Interaction: legend toggle and brush

`legend-toggle` turns legend items into buttons that show and hide their series (the axes rescale to the visible series). `brush` adds an overview strip below cartesian charts with two draggable, keyboard-focusable handles that set the visible category window; double-click the strip to reset. Emits `dj-legend-toggle` (detail `{ key, hidden }`).

```html
<div style="width: 520px; height: 300px">
  <dj-chart id="iv" type="line" markers legend-toggle brush category-key="month" label="Revenue vs target" show-grid y-label="USD (k)"></dj-chart>
</div>
<script type="module">
  import "@dojo-ng/chart";
  const iv = document.getElementById("iv");
  iv.series = [{ key: "revenue", label: "Revenue" }, { key: "target", label: "Target" }];
  iv.data = [
    { month: "Jan", revenue: 42, target: 40 }, { month: "Feb", revenue: 50, target: 45 },
    { month: "Mar", revenue: 47, target: 48 }, { month: "Apr", revenue: 61, target: 52 },
    { month: "May", revenue: 58, target: 55 }, { month: "Jun", revenue: 70, target: 60 },
  ];
  iv.addEventListener("dj-legend-toggle", (e) => console.log(e.detail));
</script>
```

### Sparklines: a KPI table

`<dj-sparkline>` is a separate, small element in this same package — a tiny inline chart with no axes, grid, legend, tooltip, or brush, for a trend next to a number. Set `data` (a plain array of numbers) and `type` (`line`/`area`/`bar`); `marker` dots the last point (`--dj-sparkline-marker-size`, default `0.25em`, and `::part(marker)` for anything more). It sizes via `--dj-sparkline-width`/`--dj-sparkline-height` (defaults `8em`/`1.5em`) and colors via `--dj-sparkline-color`, falling back to dj-chart's own `--dj-chart-1` token. Since the adjacent cell already states the value, these are left unlabeled (`aria-hidden`); set `label` on a standalone sparkline to give it its own accessible name instead.

```html
<table>
  <thead><tr><th>Metric</th><th>Trend</th><th>Value</th></tr></thead>
  <tbody>
    <tr><td>Revenue</td><td><dj-sparkline id="rev" type="area" marker></dj-sparkline></td><td>$74k</td></tr>
    <tr><td>Signups</td><td><dj-sparkline id="signups" type="bar"></dj-sparkline></td><td>1,204</td></tr>
    <tr><td>Churn</td><td><dj-sparkline id="churn" style="--dj-sparkline-color: var(--dj-color-danger-600, #dc2626)"></dj-sparkline></td><td>2.1%</td></tr>
  </tbody>
</table>
<script type="module">
  import "@dojo-ng/chart";
  document.getElementById("rev").data = [42, 50, 47, 61, 58, 70, 74];
  document.getElementById("signups").data = [180, 240, 90, 310, 260, 340, 300];
  document.getElementById("churn").data = [3.4, 3.1, 2.9, 2.6, 2.4, 2.2, 2.1];
</script>
```

### Streaming: appendData and push

`appendData(rows)` on `<dj-chart>` (cartesian types) and `push(value)` on `<dj-sparkline>` append without rebuilding `data` yourself. Multiple calls within the same animation frame batch into one update. Set `max-points` so old points fall off the front as new ones arrive, sliding the window. A streamed `appendData` update skips the bar/enter transitions (a live append should snap into place, not animate); `<dj-sparkline>` has no transitions to begin with, so `push` needs no equivalent.

```html
<div style="width: 480px; height: 220px">
  <dj-chart id="live" type="line" category-key="t" label="Live requests/sec" max-points="20" show-grid y-label="req/s"></dj-chart>
</div>
<dj-sparkline id="spark" max-points="20" label="Live requests/sec"></dj-sparkline>
<script type="module">
  import "@dojo-ng/chart";
  const live = document.getElementById("live");
  const spark = document.getElementById("spark");
  live.series = [{ key: "value", label: "req/s" }];
  live.data = [];
  let t = 0;
  const timer = setInterval(() => {
    const value = 40 + Math.round(Math.random() * 20);
    live.appendData([{ t: t++, value }]);
    spark.push(value);
  }, 1000);
  // clearInterval(timer) to stop.
</script>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
