# @dojo-ng/theme

## 0.1.2

### Patch Changes

- Rewrite the README for npm readers: a short lead, a working example, and the details in short sections and lists instead of long paragraphs. The foundation packages (store, context, i18n, dojo-element) get full READMEs with examples in place of pointers to internal documents. Several class docs are restructured the same way, so the type declarations and the custom elements manifest change too. No behavior changes.
- Updated dependencies
  - @dojo-ng/dojo-element@0.1.2

## 0.1.1

### Patch Changes

- Adds the financial-chart tokens `@dojo-ng/chart-financial` reads: `--dj-chart-up`, `--dj-chart-down`, `--dj-chart-crosshair`, and `--dj-chart-pane-gap`. Up and down chain to the success and danger roles and the crosshair to the muted-text role, so retuning those retunes candlesticks and volume bars with them. They are defined for both the light and dark palettes. Without them the financial chart falls back to its own defaults rather than following the theme. This landed on 2026-09-12 and missed the 0.1.0 release.
