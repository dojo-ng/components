# @dojo-ng/constrained-input

`<dj-constrained-input>` — A text input with a custom `validator` function: `(value) => string | undefined` returning an error message (or undefined when valid).

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Extends `DjTextInput` and inherits its properties and behavior.

A text input with a custom `validator` function: `(value) => string | undefined` returning an error message (or undefined when valid). Applied through native constraint validation, so it participates in form validity. (Dojo's rule-DSL ValidationRules is deferred; supply a function for now.)

## Install

```bash
npm install @dojo-ng/constrained-input
```

## Usage

Import the package to register the custom element, then use the tag.

Pass a function returning an error message, or undefined when valid.

```html
<dj-constrained-input label="Username"></dj-constrained-input>
<script type="module">
  import "@dojo-ng/constrained-input";
  document.querySelector("dj-constrained-input").validator = (v) =>
    /^[a-z0-9_]+$/.test(v) ? undefined : "Lowercase letters, digits, and underscores only";
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `validator` | — | `(value: string) => string \| undefined` | — |

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
