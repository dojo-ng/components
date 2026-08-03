# @dojo-ng/data-grid-groups

Row grouping + aggregates for @dojo-ng/data-grid

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> Groups rows by one or more columns (`by`) with optional per-column `aggregates` (`sum`/`mean`/`min`/`max`/`count`, or a function over the group's leaf rows); grouped cells show an expander, the group value, and the leaf count, aggregated cells show the formatted aggregate, and a grand-totals row renders below the scroller whenever `aggregates` is non-empty. THE LEAF COUNT IS ALREADY THERE FOR FREE: the grouped column's own cell always renders as `value (n)` (e.g. `Ada (3)`), with no `aggregates` entry needed to get it — an explicit `count` aggregate on a DIFFERENT column renders that same number again in that column's cell, which is what you want for a dedicated report-style count column, but is a duplicate if you only meant "show me how many". ONE HARD RULE, enforced in `setup()` by throwing rather than silently misbehaving: use `treePlugin` OR `groupsPlugin` on a grid, never both — they both own row expansion, and TanStack has no notion of layering two grouping strategies on the same table. Numeric aggregates format through `@dojo-ng/i18n`, so totals follow the grid's locale the same way `data-grid-formats` does.

## Install

```bash
npm install @dojo-ng/data-grid-groups
```

## Usage

Group rows show the value and count; aggregated columns show sums (or mean/min/max/count/custom). A totals row renders below the grid.

```html
<dj-data-grid id="g"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { groupsPlugin } from "@dojo-ng/data-grid-groups";
  const g = document.getElementById("g");
  g.columns = [
    { id: "region", header: "Region" },
    { id: "product", header: "Product" },
    { id: "sales", header: "Sales" },
  ];
  g.data = [
    { region: "West", product: "Widget", sales: 100 },
    { region: "West", product: "Gadget", sales: 50 },
    { region: "East", product: "Widget", sales: 75 },
  ];
  g.plugins = [groupsPlugin({ by: "region", aggregates: { sales: "sum" } })];
</script>
```
