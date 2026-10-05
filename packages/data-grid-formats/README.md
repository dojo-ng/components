# @dojo-ng/data-grid-formats

Per-column value formatting for `<dj-data-grid>`: numbers, currency, percentages, dates, and times.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/data-grid-formats
```

## Usage

Set `format` on a column; other columns are untouched. Formatting follows the active locale (set `lang` on the grid or an ancestor).

```html
<dj-data-grid id="g"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { formatsPlugin } from "@dojo-ng/data-grid-formats";
  const g = document.getElementById("g");
  g.columns = [
    { id: "name", header: "Name" },
    { id: "price", header: "Price", format: { kind: "currency", currency: "USD" } },
    { id: "when", header: "Updated", format: { kind: "date" } },
    { id: "growth", header: "Growth", format: (v) => (v >= 0 ? "+" : "") + v + "%" },
  ];
  g.data = [{ name: "Widget", price: 1234.5, when: "2026-07-01", growth: 4 }];
  g.plugins = [formatsPlugin()];
</script>
```

## Setting a format

- Set `format` on a `GridColumn` to a descriptor: `{ kind, options?, currency? }`, where `kind` is `"number"`, `"currency"`, `"percent"`, `"date"`, `"time"`, or `"datetime"`.
- Or set it to a function `(value, row) => string`.
- Columns without `format` are left to other plugins and the grid's default.

## Locale

- Descriptors use `Intl` through `@dojo-ng/i18n`.
- When `lang` changes on the grid or an ancestor, every value is formatted again, with no change to the plugin.

## Plugin order

- Put this plugin after the structural and cell-component plugins. It is the fallback formatter, so a plugin after it would only see the formatted text, not the raw value.
