# @dojo-ng/form

`<dj-form>` — A layout wrapper that gathers values from its named child controls and emits `dj-submit` with a `{ name: value }` object.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

`column` stacks fields.

## Install

```bash
npm install @dojo-ng/form
```

## Usage

Import the package to register the custom element, then use the tag.

`submit()` checks the fields, then emits `dj-submit` with their values. Enter in a field also submits.

```html
<dj-form id="signup" column>
  <dj-text-input name="email" label="Email" type="email" required></dj-text-input>
  <dj-switch name="newsletter">Subscribe</dj-switch>
  <dj-button id="send">Sign up</dj-button>
</dj-form>
<script type="module">
  import "@dojo-ng/form";
  import "@dojo-ng/text-input";
  import "@dojo-ng/switch";
  import "@dojo-ng/button";
  const form = document.getElementById("signup");
  document.getElementById("send").addEventListener("click", () => form.submit());
  form.addEventListener("dj-submit", (e) => console.log(e.detail.data)); // { email: "…" }
</script>
```

## Submitting

- `submit()` checks every named control first. When one is invalid, the browser shows its message on the first invalid control, `dj-submit` is not emitted, and `submit()` returns false. Set `novalidate` to skip the check.
- Values follow the rules of a native form: a checkbox or switch counts only when it is checked, disabled controls are left out, and a name used by several checked controls gives an array.
- Enter in a field submits, except in a text area or other multi-line editor, where Enter adds a new line.

## A native form instead

- The controls are form-associated, so they also work in a native `<form>`, which adds posting to a URL, `FormData`, and reset buttons. A native form can sit inside `dj-form` for its layout.

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `column` | column | `boolean` | `false` |
| `noValidate` | novalidate | `boolean` | `false` |

## Slots

- default slot

## Events

- `dj-submit`: `{ data }`.
- `dj-reset`

## Methods

- `submit(): boolean`: Check the named controls, then emit `dj-submit`. Returns false when a control is invalid.
- `reset()`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
