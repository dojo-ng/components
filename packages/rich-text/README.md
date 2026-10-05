# @dojo-ng/rich-text

`<dj-rich-text>` — A form-associated WYSIWYG editor built on Lexical.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

The value is HTML by default. Formatting, headings, lists, links, and other content types come from plugins, through the same plugin API that third-party plugins use.

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

## Plugins

- Bold, italic, underline, undo, and redo are the default plugin set, `defaultPlugins`.
- Setting `plugins` replaces the defaults, so spread `...defaultPlugins` to keep them.
- Lexical needs its node types when the editor is created, so changing `plugins` later rebuilds the editor, keeping its content. Set `plugins` before `value`.
- `format` selects another serializer that a plugin contributes, such as Markdown.

## The value

- `value` can be read and written at any time. Writing it replaces the whole document, clears the selection and the undo history, and does not emit `dj-change`, like a native input's `value`.
- `dj-change` fires when the user edits the content.

## Pasting

- Pasted HTML is cleaned against an allowlist by default. Scripts, styles, event handlers, inline styles, and unsafe `javascript:` and `data:` URLs are removed. Unknown tags are removed but their text is kept.
- Set `sanitizePaste = false` from JavaScript to turn this off, or set `pasteSanitizer` to your own `(html) => html` function. The default is exported as `sanitizeHtml`.
- Plain-text pastes are not cleaned, since they contain no markup.

## Light DOM

- The editable area renders in the light DOM, because Lexical's selection handling is not reliable inside a shadow root. `--dj-*` theme tokens still apply.

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `placeholder` | placeholder | `string` | `""` |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `plugins` | — | `RichTextPlugin[]` | `[]` |
| `format` | format ↻ | `string` | `"html"` |
| `sanitizePaste` | — | `boolean` | `true` |
| `pasteSanitizer` | — | `(html: string) => string` | — |

## Events

- `dj-change`

## Methods

- `checkValidity(): boolean`
- `focus(o: FocusOptions)`
- `setHtml(htmlString: string)`: Replace the document with the given HTML (regardless of the active `format`).

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
