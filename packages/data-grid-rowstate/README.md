# @dojo-ng/data-grid-rowstate

A plugin for `@dojo-ng/data-grid` that styles rows and cells from their data, from outside the grid's shadow DOM.

```js
import { rowStatePlugin } from "@dojo-ng/data-grid-rowstate";

grid.plugins = [
  rowStatePlugin({
    row: (m) => (m.seen ? null : "unread"),
    cell: (columnId, m) => (columnId === "subject" && !m.seen ? "font-weight:600" : undefined),
  }),
];
```

## Options

Both options are optional and are pure functions of a row's data (`row.original`).

`row(data)` classifies a row into state tokens. Each token `T` is exposed as an extra shadow part `row--T` on the row element, so you style whole-row treatment from your own stylesheet:

```css
dj-data-grid::part(row--unread) { font-weight: 500; }
dj-data-grid::part(row--overdue) { background: var(--dj-color-primary-50); }
```

Return a single token, an array, or `null`/`undefined` for none. Tokens must match `/^[a-z0-9-]+$/` (a part name cannot contain spaces); an invalid token is dropped with a single `console.warn`.

`cell(columnId, data)` returns an inline CSS style string for one cell, or `undefined` to leave it unstyled. The plugin wraps that cell's content in a `<span style="…">` via `decorateCell`, composing with other plugins' cell decoration rather than replacing content. The style string may use `--dj-*` tokens.

## Notes

The plugin always emits the base `row` part when `row` is set: the grid reconciles row attributes each render and removes any key a plugin stops returning, so a row that returns no tokens still returns `{ part: "row" }` to keep the base part on the reused virtual rows. Only one plugin may own `part`; it composes cleanly with `data-grid-tree` and `data-grid-groups`, which set `aria-*` keys.

External per-cell part styling (`::part(cell--T)`) is not supported: cells are always `part="cell"` and there is no cell-attribute hook, so cell state rides `decorateCell` inline styles.
