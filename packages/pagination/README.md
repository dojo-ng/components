# @dojo-ng/pagination

`<dj-pagination>` — Page navigation over `total` pages.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Page navigation over `total` pages. Emits `dj-page` with the new page. Parts: `nav`, `page`.

## Install

```bash
npm install @dojo-ng/pagination
```

## Usage

Import the package to register the custom element, then use the tag.

Set `total` pages and the current `page`; listen for `change`.

```html
<dj-pagination total="10" page="1" id="pg"></dj-pagination>
<script type="module">
  import "@dojo-ng/pagination";
  document.getElementById("pg").addEventListener("change", (e) => console.log(e.detail));
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `total` | total | `number` | `1` |
| `page` | page | `number` | `1` |
| `siblingCount` | sibling-count | `number` | `1` |

**Parts:** `nav`, `page`

**Events:** `dj-page`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
