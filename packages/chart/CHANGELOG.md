# @dojo-ng/chart

## 0.2.0

### Minor Changes

- Draw missing values as gaps instead of silent zeros (new `missing` property, "gap" default |
  "connect" | "zero", per-series override), add point labels (new `point-labels` property plus
  `formatPoint`), add a logarithmic value scale (new `y-scale`/`y-scale-right` properties), and add
  a plugin seam (new `plugins` property, vertical-cartesian only) that lets a package like
  `@dojo-ng/chart-financial` extend the chart with its own panes, marks, and tooltip/legend/table
  rows. Also fixes a series-less chart's y-axis staying pinned at the internal domain placeholder
  when a plugin supplies the only data.
