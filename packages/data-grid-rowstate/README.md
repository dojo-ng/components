# @dojo-ng/data-grid-rowstate

Row and cell styling from your data for `<dj-data-grid>`, such as bold unread rows or flagged items.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/data-grid-rowstate
```

## Usage

`row()` returns state tokens; each becomes a `row--<token>` part you style from your own CSS. The base `row` part is always present too.

```html
<style>
  /* Styled from outside the grid's shadow DOM, via the parts the plugin adds. */
  #mail::part(row--unread) { font-weight: 600; }
  #mail::part(row--flagged) { background: var(--dj-color-warning-100); }
</style>
<dj-data-grid id="mail"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { rowStatePlugin } from "@dojo-ng/data-grid-rowstate";
  const g = document.getElementById("mail");
  g.columns = [
    { id: "from", header: "From" },
    { id: "subject", header: "Subject" },
    { id: "date", header: "Date" },
  ];
  g.data = [
    { from: "Ada", subject: "Analytical engine", date: "2026-07-01", seen: false, flagged: true },
    { from: "Grace", subject: "Compiler notes", date: "2026-06-28", seen: true, flagged: false },
  ];
  g.plugins = [
    rowStatePlugin({
      row: (m) => {
        const states = [];
        if (!m.seen) states.push("unread");
        if (m.flagged) states.push("flagged");
        return states;
      },
    }),
  ];
</script>
```

## Row states

- `row()` returns state tokens for a row. Each token `T` becomes an extra shadow part `row--T` on that row, so you style whole rows from your own CSS: `dj-data-grid::part(row--unread) { font-weight: 600 }`.
- The base `row` part is always there too, so `::part(row)` rules keep working.
- Tokens must match `/^[a-z0-9-]+$/`, because a part name cannot contain spaces. An invalid token is dropped, with one console warning.

## Cell styles

- `cell()` returns an inline style for one column's content, for emphasis on a single cell, such as a bold subject but not a bold date.

## Rules

- Both functions are optional and use only the row data, so the grid never needs to know your states.
- Only one plugin can set a row's `part` attribute, so do not combine this with another plugin that sets row parts. The tree and groups plugins are fine, because they set other attributes.

## Examples

### Emphasize one column instead

`cell()` returns an inline style for a single column's content, so you can bold the subject without touching the rest of the row. It composes with other plugins' cell decoration rather than replacing content.

```html
<script type="module">
  import { rowStatePlugin } from "@dojo-ng/data-grid-rowstate";
  grid.plugins = [
    rowStatePlugin({
      cell: (columnId, m) =>
        !m.seen && (columnId === "subject" || columnId === "from")
          ? "font-weight: 600"
          : undefined,
    }),
  ];
</script>
```
