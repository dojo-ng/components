# @dojo-ng/data-grid-tree

Tree (hierarchical) rows for @dojo-ng/data-grid

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> Use `treePlugin` OR `groupsPlugin` per grid, never both (they both own expansion).

## Install

```bash
npm install @dojo-ng/data-grid-tree
```

## Usage

Nested `children` arrays become an expandable tree; ArrowRight/ArrowLeft expand and collapse the active row.

```html
<dj-data-grid id="g"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { treePlugin } from "@dojo-ng/data-grid-tree";
  const g = document.getElementById("g");
  g.columns = [{ id: "name", header: "Name" }, { id: "size", header: "Size" }];
  g.data = [
    { name: "src", size: "", children: [
      { name: "index.ts", size: "2 KB" },
      { name: "lib", size: "", children: [{ name: "util.ts", size: "1 KB" }] },
    ] },
  ];
  g.plugins = [treePlugin()];
</script>
```
