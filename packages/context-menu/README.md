# @dojo-ng/context-menu

`<dj-context-menu>` — Right-click the trigger (default slot) to open a menu of `options`; emits `dj-select` with the value.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/context-menu
```

## Usage

Import the package to register the custom element, then use the tag.

Provide `options`; listen for `dj-select`.

```html
<dj-context-menu id="cm">Right-click me</dj-context-menu>
<script type="module">
  import "@dojo-ng/context-menu";
  const el = document.getElementById("cm");
  el.options = [{ value: "copy", label: "Copy" }, { value: "paste", label: "Paste" }];
  el.addEventListener("dj-select", (e) => console.log(e.detail.value));
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `options` | options | `ListOption[]` | `[]` |

**Slots:** default

**Events:** `dj-select`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
