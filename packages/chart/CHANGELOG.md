# @dojo-ng/chart

## 0.3.0

### Minor Changes

- Fix layout and accessibility problems found in a real-browser pass of the chart.

  - The accessible data table's plugin columns now always cover the full data. Before, with the brush narrowed, they held the brush window's rows matched to the table's rows by position, so a row could show another row's values and the rows past the window were blank. A plugin table cell of "—" is now announced as "No value", like a core series' missing cell.
  - A chart drawn only by plugins now says what it shows in its accessible name ("Chart, 3 series: Price candlesticks, Volume, SMA(20) across ...") instead of "Line chart, 0 series: across ...". Plugins can name themselves with the new optional `describe()` hook; without it, their legend labels are used.
  - The y-axis gutters grow to fit long tick labels ("10,000,000" on a log axis, a currency `formatY`), so labels are no longer clipped at the edge or drawn over the axis title. The brush strip and tooltip follow the new gutter.
  - Category labels on the x axis are thinned so neighbors never overprint.
  - A linear axis asks for fewer ticks on a short plot and never draws two labels closer than one line apart.
  - Plugin panes take at most 40% of the plot's height together, so a fixed-height pane no longer starves the main plot on a short chart.
  - Point labels sit higher above their marker so the text no longer cuts into the dot, and neighboring labels keep a wider gap.
  - Under forced colors, the axis, tick text, and grid use system colors, and legend swatches are painted with CanvasText instead of becoming identical empty boxes. A plugin legend item can ask for a hollow swatch with the new optional `swatch: "hollow"`.

## 0.2.1

### Patch Changes

- Remove references to internal planning documents (decision numbers, track and task names) from the doc comments, so the published type declarations, the custom elements manifest, and the API reference no longer mention them. No behavior changes.
- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.2
  - @dojo-ng/i18n@0.1.1

## 0.2.0

### Minor Changes

- Draw missing values as gaps instead of silent zeros (new `missing` property, "gap" default |
  "connect" | "zero", per-series override), add point labels (new `point-labels` property plus
  `formatPoint`), add a logarithmic value scale (new `y-scale`/`y-scale-right` properties), and add
  a plugin seam (new `plugins` property, vertical-cartesian only) that lets a package like
  `@dojo-ng/chart-financial` extend the chart with its own panes, marks, and tooltip/legend/table
  rows. Also fixes a series-less chart's y-axis staying pinned at the internal domain placeholder
  when a plugin supplies the only data.
