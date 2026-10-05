# @dojo-ng/data-grid-filter

Filtering for `<dj-data-grid>`: a quick filter box and optional per-column filters.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/data-grid-filter
```

## Usage

The quick filter searches all columns; columns opt into their own filter with `filter: "text"` or `filter: "select"` (distinct values).

```html
<dj-data-grid id="g"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { filterPlugin } from "@dojo-ng/data-grid-filter";
  const g = document.getElementById("g");
  g.columns = [
    { id: "name", header: "Name", filter: "text" },
    { id: "status", header: "Status", filter: "select" },
  ];
  g.data = [{ name: "Widget", status: "active" }, { name: "Gadget", status: "retired" }];
  g.plugins = [filterPlugin()];
</script>
```

## Quick filter

- `quick` (on by default) adds one text box above the header that filters across all columns.

## Column filters

- Set `filter` on a `GridColumn` to `"text"` or `"select"` to add a filter for that column.
- The filters appear in a second header row, which is shown only when at least one visible column has a filter.

## Behavior

- Text filters wait 150 ms after typing stops before they apply. Automated tests should wait past that delay instead of expecting the result at once.
- The filters work through the TanStack table API, so the grid's row count and scrolling follow the filtered set.
- It works with `data-grid-pagination` in any order: rows are filtered before they are paged, so the page count follows the filtered set.
