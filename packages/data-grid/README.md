# @dojo-ng/data-grid

`<dj-data-grid>` — A virtualized, sortable, selectable data grid built on TanStack Table (column/sort/selection model) and TanStack Virtual (row virtualization).

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A virtualized, sortable, selectable data grid built on TanStack Table (column/sort/selection model) and TanStack Virtual (row virtualization). Core scope: columns, in-memory `data`, sort, virtual rows, row selection, keyboard row navigation, and calculated columns (`GridColumn.compute`). Filtering, pagination, inline editing, tree rows, grouping, CSV export, and master-detail arrive as PLUGINS via the `plugins` property (plain objects from factory functions; see {@link DataGridPlugin}). A bare grid with `plugins=[]` behaves exactly as before. ARIA role=grid. Events: `dj-sort`, `dj-selection-change`. Parts: `grid`, `head`, `row`, `cell`, `chrome-top`, `chrome-bottom`, `subhead`.

> Plugins: pass an array of plugin objects via the `plugins` property (JavaScript only). Recommended order: structural first (`treePlugin` OR `groupsPlugin`, never both), then `editPlugin`, `cellComponentsPlugin`, `formatsPlugin`, then chrome-only plugins (`filterPlugin`, `paginationPlugin`, `exportPlugin`, `detailPlugin`). A `plugins` change rebuilds the table.

## Install

```bash
npm install @dojo-ng/data-grid
```

## Usage

Import the package to register the custom element, then use the tag.

TanStack-backed; provide `columns` and `data`, set a `height`.

```html
<dj-data-grid id="dg" height="320px" selection-mode="multiple"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  const el = document.getElementById("dg");
  el.columns = [{ id: "name", header: "Name" }, { id: "age", header: "Age" }];
  el.data = Array.from({ length: 1000 }, (_, i) => ({ name: "Row " + i, age: i }));
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `columns` | columns | `GridColumn[]` | `[]` |
| `data` | data | `Row[]` | `[]` |
| `selectionMode` | selection-mode ↻ | `SelectionMode` | `"none"` |
| `rowHeight` | row-height | `number` | `36` |
| `height` | height | `string` | `"20rem"` |
| `plugins` | — | `DataGridPlugin[]` | `[]` |

**Parts:** `grid`, `head`, `row`, `cell`, `chrome-top`, `chrome-bottom`, `subhead`, `detail`

**Events:** `dj-sort`, `dj-selection-change`

**Methods:** `toggleAt(index: number)`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
