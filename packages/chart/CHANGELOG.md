# @dojo-ng/chart

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
