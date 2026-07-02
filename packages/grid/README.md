# @dojo-ng/grid

`<dj-grid>` — A data grid from `columns` + `rows`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A data grid from `columns` + `rows`. Click a sortable header to sort (emits `dj-sort`). Functional core: no virtualization, paging, editing, or column resize yet. Part: `table`.

## Install

```bash
npm install @dojo-ng/grid
```

## Usage

Import the package to register the custom element, then use the tag.

Provide `columns` and `rows`.

```html
<dj-grid id="gr"></dj-grid>
<script type="module">
  import "@dojo-ng/grid";
  const el = document.getElementById("gr");
  el.columns = [{ id: "name", header: "Name" }, { id: "role", header: "Role" }];
  el.rows = [{ name: "Ada", role: "Engineer" }, { name: "Linus", role: "Maintainer" }];
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `columns` | columns | `GridColumn[]` | `[]` |
| `rows` | rows | `Record<string, unknown>[]` | `[]` |

**Parts:** `table`

**Events:** `dj-sort`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
