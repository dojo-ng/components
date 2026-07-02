# @dojo-ng/breadcrumb-group

`<dj-breadcrumb-group>` — A breadcrumb trail from `items`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A breadcrumb trail from `items`. Part: `list`.

## Install

```bash
npm install @dojo-ng/breadcrumb-group
```

## Usage

Import the package to register the custom element, then use the tag.

Provide `items`; the last is the current page.

```html
<dj-breadcrumb-group id="bc"></dj-breadcrumb-group>
<script type="module">
  import "@dojo-ng/breadcrumb-group";
  document.getElementById("bc").items = [
    { label: "Home", href: "/" }, { label: "Library", href: "/library" }, { label: "Data", current: true },
  ];
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `items` | items | `Crumb[]` | `[]` |

**Parts:** `list`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
