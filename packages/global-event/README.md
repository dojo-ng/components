# @dojo-ng/global-event

`<dj-global-event>` — Non-visual; attaches listeners to window/document for its lifetime.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Non-visual; attaches listeners to window/document for its lifetime. Set `windowListeners` / `documentListeners` (maps of event name → handler) as properties.

## Install

```bash
npm install @dojo-ng/global-event
```

## Usage

Import the package to register the custom element, then use the tag.

Attach listeners declaratively; they are added and cleaned up with the element.

```html
<dj-global-event id="ge"></dj-global-event>
<script type="module">
  import "@dojo-ng/global-event";
  document.getElementById("ge").windowListeners = { resize: () => console.log(window.innerWidth) };
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `windowListeners` | — | `Listeners` | `{}` |
| `documentListeners` | — | `Listeners` | `{}` |

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
