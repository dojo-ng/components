# @dojo-ng/speed-dial

`<dj-speed-dial>` — A FAB that reveals slotted action buttons (`actions` slot) when open.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A FAB that reveals slotted action buttons (`actions` slot) when open. Toggles on click. `direction` controls where actions expand. Emits `dj-toggle` {open}.

## Install

```bash
npm install @dojo-ng/speed-dial
```

## Usage

Import the package to register the custom element, then use the tag.

A FAB that reveals actions on open.

```html
<dj-speed-dial id="sd"></dj-speed-dial>
<script type="module">
  import "@dojo-ng/speed-dial";
  document.getElementById("sd").actions = [{ label: "Copy" }, { label: "Share" }];
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open | `boolean` | `false` |
| `direction` | direction | `"up"\|"down"\|"left"\|"right"` | `"up"` |

**Slots:** `actions`

**Events:** `dj-toggle`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
