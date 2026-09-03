# @dojo-ng/form

`<dj-form>` — A layout wrapper that gathers values from its named child controls and emits `dj-submit` with a `{ name: value }` object.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A layout wrapper that gathers values from its named child controls and emits `dj-submit` with a `{ name: value }` object. `column` stacks fields. Because slotted fields live in light DOM (outside any shadow `<form>`), values are read from each named child's `value`. For full native form semantics, the controls are form-associated, so wrapping them in a real `<form>` also works.

## Install

```bash
npm install @dojo-ng/form
```

## Usage

Import the package to register the custom element, then use the tag.

Wrap form-associated components; `dj-submit` carries the values.

```html
<dj-form id="signup">
  <dj-text-input name="email" label="Email" type="email" required></dj-text-input>
  <dj-switch name="newsletter">Subscribe</dj-switch>
  <dj-button type="submit">Sign up</dj-button>
</dj-form>
<script type="module">
  import "@dojo-ng/form";
  document.getElementById("signup").addEventListener("dj-submit", (e) => console.log(e.detail));
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `column` | column | `boolean` | `false` |

**Slots:** default

**Events:** `dj-submit`, `dj-reset`

**Methods:** `submit()`, `reset()`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
