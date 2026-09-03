# @dojo-ng/password-input

`<dj-password-input>` — A password field with a show/hide toggle in the trailing slot.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Extends `DjConstrainedInput` and inherits its properties and behavior.

A password field with a show/hide toggle in the trailing slot. Inherits `<dj-constrained-input>`, so it also accepts a custom `validator`.

## Install

```bash
npm install @dojo-ng/password-input
```

## Usage

Import the package to register the custom element, then use the tag.

A show/hide toggle is built into the trailing slot.

```html
<dj-password-input label="Password" required minlength="8"></dj-password-input>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `type` | type | `TextInputType` | `"password"` |

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
