# @dojo-ng/rich-text

`<dj-rich-text>` — A form-associated WYSIWYG editor built on the Lexical core.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A form-associated WYSIWYG editor built on the Lexical core. The editable region renders in LIGHT DOM (Lexical's selection handling is not reliable inside a shadow root yet), so this component overrides `createRenderRoot`; theming still works because `--dj-*` tokens cascade in light DOM. The toolbar is built from `dj-button`. Value is HTML. Event: `dj-change`. Spike/v1 scope: bold/italic/underline, undo/redo, HTML in/out, form value. Headings, lists, links, paste sanitization, etc. follow in v2.

## Install

```bash
npm install @dojo-ng/rich-text
```

## Usage

Import the package to register the custom element, then use the tag.

Lexical-based; set and read `value` (HTML).

```html
<dj-rich-text id="rt" label="Description"></dj-rich-text>
<script type="module">
  import "@dojo-ng/rich-text";
  document.getElementById("rt").value = "<p>Hello <strong>world</strong></p>";
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `placeholder` | placeholder | `string` | `""` |
| `disabled` | disabled ↻ | `boolean` | `false` |

**Events:** `dj-change`

**Methods:** `checkValidity(): boolean`, `focus(o: FocusOptions)`, `setHtml(htmlString: string)` (Replace the document with the given HTML.)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
