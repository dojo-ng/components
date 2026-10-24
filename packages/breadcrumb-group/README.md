# @dojo-ng/breadcrumb-group

`<dj-breadcrumb-group>` — A breadcrumb trail.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Give it `items` for a trail you control. Or set `track` and it follows the app's navigation history, with no list to maintain:

- With a trail on the location (a tracked `dj-tree` or a `dj-navigate` that carried one), there is one crumb per trail entry and the last is the current page.
- Without one, the path is split into segments and each crumb is `resolveTitle(prefix)`, or the decoded segment when that returns nothing.
- `items` is ignored while `track` is on and history is installed. With no history installed, `track` does nothing and `items` is shown as plain links.
- A plain click on a crumb dispatches `dj-navigate` with that crumb's path and the trail up to it, so Back and a tracked tree follow. Ctrl-, Cmd- and middle-click keep the browser's link behavior.

The landmark's name is "Breadcrumb", translated. The separator is a CSS custom property, not text a screen reader reads.

Needs `@dojo-ng/history` installed for `track`; without it nothing throws.

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
| `track` | track | `boolean` | `false` |
| `resolveTitle` | — | `(path: string) => string \| undefined` | — |

## CSS parts

- `list`

## Events

- `dj-navigate`: Detail `{ path, label, trail }`.

## CSS custom properties

- `--dj-breadcrumb-separator`: The text drawn between crumbs, for example `"›"`. Default `"/"`.

## Examples

### Follow the location

With `track`, the crumbs come from the trail on the location, or from the path. Clicking a crumb navigates there.

```html
<dj-breadcrumb-group id="bc" track></dj-breadcrumb-group>
<script type="module">
  import { createPubSub } from "@dojo-ng/pubsub";
  import { installHistory } from "@dojo-ng/history";
  import "@dojo-ng/breadcrumb-group";
  const titles = { "/orders": "Orders" };
  document.getElementById("bc").resolveTitle = (path) => titles[path];
  installHistory(createPubSub()).go("/orders/7");
</script>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
