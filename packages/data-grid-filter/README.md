# @dojo-ng/data-grid-filter

Quick + per-column filtering for @dojo-ng/data-grid

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> Two independent filters, both driving TanStack through the table API (`setGlobalFilter` / `column.setFilterValue`) rather than by poking core state, so the core `onStateChange` runs and the virtualizer's row count tracks the narrowed set. `quick` (default `true`) is a single full-width text box above the header; per-column filters are opt-in via `GridColumn.filter` (`"text"` or `"select"`) and render in a subheader row that appears only when at least one visible column declares one. Both quick and per-column text inputs are debounced 150ms — automation should wait past that debounce rather than asserting a synchronous filter. Composes with `data-grid-pagination` with no ordering step: TanStack's row-model pipeline filters before it paginates, so the page count shrinks to the filtered set automatically.

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
