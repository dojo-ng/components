# @dojo-ng/popup-confirmation

`<dj-popup-confirmation>` — Clicking the trigger (default slot) opens a small confirm popup with the `content` slot and Confirm/Cancel buttons.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Clicking the trigger (default slot) opens a small confirm popup with the `content` slot and Confirm/Cancel buttons. Emits `dj-confirm` / `dj-cancel`.

## Install

```bash
npm install @dojo-ng/popup-confirmation
```

## Usage

Import the package to register the custom element, then use the tag.

A trigger opens a small confirm popup; listen for `dj-confirm`.

```html
<dj-popup-confirmation id="pc">
  <dj-button>Delete</dj-button>
  <span slot="content">Are you sure?</span>
</dj-popup-confirmation>
<script type="module">
  import "@dojo-ng/popup-confirmation"; import "@dojo-ng/button";
  document.getElementById("pc").addEventListener("dj-confirm", () => console.log("confirmed"));
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open | `boolean` | `false` |
| `confirmLabel` | confirm-label | `string` | — |
| `cancelLabel` | cancel-label | `string` | — |

**Slots:** default, `content`

**Events:** `dj-confirm`, `dj-cancel`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
