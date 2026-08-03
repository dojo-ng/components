# @dojo-ng/data-grid-formats

Value-formatting plugin for @dojo-ng/data-grid (Intl number/currency/percent/date via @dojo-ng/i18n)

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

> Declarative per-column value formatting: set `format` on a `GridColumn` — a `{ kind: "number"|"currency"|"percent"|"date"|"time"|"datetime", options?, currency? }` descriptor (delegated to memoized `Intl` instances via `@dojo-ng/i18n`, never hand-rolled) or a plain `(value, row) => string` function — and `renderCell` formats only that column, returning `undefined` (so other plugins and the core default proceed) for columns without `format`. Locale-reactive: `setup()` attaches a `LocaleController` to the host, so a runtime `lang` change on the grid or an ancestor reformats every value with no plugin reconfiguration. Place this plugin AFTER structural and component plugins in the `plugins` array — it is the fallback formatter, so a plugin ordered after it that also targets the same column would only ever see the already-formatted string, not the raw value.

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
