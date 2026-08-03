# @dojo-ng/data-grid-pagination

Pagination for @dojo-ng/data-grid (reuses dj-pagination)

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> Page navigation below the scroller: reuses the existing `<dj-pagination>` plus a page-size dropdown, both driving TanStack through the table API (`setPageIndex`/`setPageSize`) so the core `onStateChange` runs and the virtualizer's row count follows the current page. `pageSize` (default 25) seeds the initial page size; `pageSizes` (default `[10, 25, 50, 100]`) are only the dropdown's offered choices — the seeded `pageSize` need not be one of them. Composes with `data-grid-filter` with no ordering step: TanStack filters before it paginates, so the page count shrinks to the filtered set automatically.

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
