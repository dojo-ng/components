# @dojo-ng/data-grid-groups

Row grouping with aggregates for `<dj-data-grid>`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

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

## Grouping

- `by` lists the columns to group by. A grouped row shows an expander, the group value, and the number of rows in the group, such as `Ada (3)`.
- That count is always there. You do not need a `count` aggregate to get it.

## Aggregates

- `aggregates` sets an aggregate per column: `sum`, `mean`, `min`, `max`, `count`, or a function over the group's rows.
- A `count` aggregate on another column shows the same number again in that column. Use it for a separate count column, not just to see the size of each group.
- When `aggregates` is set, a grand-totals row appears below the rows.
- Numeric aggregates are formatted through `@dojo-ng/i18n`, so they follow the grid's locale.

## Rules

- Use `groupsPlugin` or `treePlugin` on a grid, never both. Both control row expansion, so setup throws an error if both are present.
