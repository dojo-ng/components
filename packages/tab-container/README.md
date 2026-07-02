# @dojo-ng/tab-container

`<dj-tab-container>` — Tabbed interface.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Tabbed interface. `tabs` describes the buttons; the panels are slotted children in the same order (one per tab). The active panel is shown, the rest hidden. ARIA tablist/tab/tabpanel with roving arrow/Home/End keyboard. Local coordination of slotted panels — no store needed.

## Install

```bash
npm install @dojo-ng/tab-container
```

## Usage

Import the package to register the custom element, then use the tag.

Provide `tabs`; slot one panel per tab in order.

```html
<dj-tab-container id="tabs">
  <div>Panel A</div>
  <div>Panel B</div>
</dj-tab-container>
<script type="module">
  import "@dojo-ng/tab-container";
  document.getElementById("tabs").tabs = [{ name: "A" }, { name: "B" }];
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `tabs` | tabs | `TabItem[]` | `[]` |
| `activeIndex` | active-index ↻ | `number` | `0` |
| `alignButtons` | align-buttons ↻ | `"top" \| "bottom" \| "left" \| "right"` | `"top"` |

**Slots:** default

**Parts:** `tablist`, `tab`, `panels`

**Events:** `change` (detail: active index), `dj-tab-close` (detail: index)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
