# @dojo-ng/data-grid-rowstate

Row/cell state styling plugin for @dojo-ng/data-grid (conditional row parts + cell emphasis)

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> Styling contract: `row()` classifies a row into state tokens and each token `T` becomes an extra shadow part `row--T` on that row, so you style whole rows from your own CSS — `dj-data-grid::part(row--unread) { font-weight: 600 }`. `cell()` returns an inline style string for one column's content instead, for per-cell emphasis (bold the subject but not the date). Both options are optional and are pure functions of row data, so the grid core never learns your states. TWO CONSTRAINTS. (1) Only ONE plugin may own the `part` attribute: `rowAttributes` merges by key and a second row-part plugin would clobber this one. Combining with `tree`/`groups` is fine — those set `aria-level`/`aria-expanded`, different keys. (2) A part name cannot contain spaces, so state tokens must match `/^[a-z0-9-]+$/`; an invalid token is dropped with a single `console.warn` rather than emitting a broken `part`. Note that the base `row` part is always emitted alongside your tokens, so `::part(row)` rules keep working.

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
