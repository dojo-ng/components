# @dojo-ng/data-grid-detail

Master-detail (expandable row detail / subgrid) for @dojo-ng/data-grid

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> Detail rows switch the grid virtualizer to measured (variable-height) mode; grids without this plugin keep the fixed-height fast path.

## Install

```bash
npm install @dojo-ng/data-grid-detail
```

## Usage

Each row gains an expander; the detail panel renders any template — here a nested dj-data-grid (the subgrid case).

```html
<dj-data-grid id="g"></dj-data-grid>
<script type="module">
  import { html } from "lit";
  import "@dojo-ng/data-grid";
  import { detailPlugin } from "@dojo-ng/data-grid-detail";
  const g = document.getElementById("g");
  g.columns = [{ id: "order", header: "Order" }, { id: "customer", header: "Customer" }];
  g.data = [
    { order: "A-1", customer: "Acme", items: [{ sku: "W-1", qty: 2 }, { sku: "G-9", qty: 1 }] },
  ];
  g.plugins = [detailPlugin({
    render: (row) => html`<dj-data-grid
      height="8rem"
      .columns=${[{ id: "sku", header: "SKU" }, { id: "qty", header: "Qty" }]}
      .data=${row.original.items}></dj-data-grid>`,
  })];
</script>
```
