# @dojo-ng/data-grid-export

CSV export for `<dj-data-grid>`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/data-grid-export
```

## Usage

The chrome button downloads the current (filtered, unpaginated) rows. Import `toCsv`/`downloadCsv` and pass the grid element to build your own button.

```html
<dj-data-grid id="g"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { exportPlugin, toCsv } from "@dojo-ng/data-grid-export";
  const g = document.getElementById("g");
  g.columns = [{ id: "name", header: "Name" }];
  g.data = [{ name: "Widget" }, { name: "Gadget" }];
  g.plugins = [exportPlugin({ filename: "inventory.csv" })];
  // or, from your own UI: console.log(toCsv(g));
</script>
```

## What is exported

- Raw cell values, not the formatted text, because formatting is presentation.
- By default, the filtered rows on all pages. With `all: true`, every row, before filtering.
- Internal columns whose id starts with `__`, such as the detail expander, are skipped.
