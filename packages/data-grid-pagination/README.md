# @dojo-ng/data-grid-pagination

Page navigation for `<dj-data-grid>`: a `<dj-pagination>` and a page-size menu below the rows.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/data-grid-pagination
```

## Usage

Filtering (when present) applies first, then pagination — TanStack's row-model order handles the composition.

```html
<dj-data-grid id="g"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { paginationPlugin } from "@dojo-ng/data-grid-pagination";
  const g = document.getElementById("g");
  g.columns = [{ id: "name", header: "Name" }];
  g.data = Array.from({ length: 100 }, (_, i) => ({ name: "Row " + i }));
  g.plugins = [paginationPlugin({ pageSize: 10 })];
</script>
```

## Options

- `pageSize` (default 25) is the starting page size.
- `pageSizes` (default `[10, 25, 50, 100]`) are the choices in the menu. The starting `pageSize` does not have to be one of them.

## Behavior

- Paging works through the TanStack table API, so the grid's row count follows the current page.
- It works with `data-grid-filter` in any order: rows are filtered before they are paged, so the page count follows the filtered set.
