# @dojo-ng/tree

`<dj-tree>` — A hierarchical tree from `nodes`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A hierarchical tree from `nodes`. Click a parent's chevron to expand; click a node to select. Emits `dj-select` with the id. Functional core (no virtualization/drag/checkboxes yet).

## Install

```bash
npm install @dojo-ng/tree
```

## Usage

Import the package to register the custom element, then use the tag.

Provide `nodes`; `value` is the selected node id.

```html
<dj-tree id="tr" value="src"></dj-tree>
<script type="module">
  import "@dojo-ng/tree";
  document.getElementById("tr").nodes = [
    { id: "src", label: "src", children: [{ id: "index", label: "index.ts" }] },
  ];
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `nodes` | nodes | `TreeNode[]` | `[]` |
| `value` | value | `string` | `""` |

**Events:** `dj-select`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
