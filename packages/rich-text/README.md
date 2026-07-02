# @dojo-ng/rich-text

`<dj-rich-text>` — Inline text formats inspected for toolbar active state.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Inline text formats inspected for toolbar active state. */ const TEXT_FORMATS: TextFormatType[] = [ "bold", "italic", "underline", "strikethrough", "code", "subscript", "superscript", "highlight", ]; /** Built-in HTML serializer. `serialize` runs inside an editor read; `deserialize` inside an update. */ const HTML_FORMAT: RichTextFormat = { serialize: (editor) =&gt; $generateHtmlFromNodes(editor, null), deserialize: (editor, data) =&gt; { const root = $getRoot(); root.clear(); const dom = new DOMParser().parseFromString(data || "&lt;p&gt;&lt;/p&gt;", "text/html"); for (const node of $generateNodesFromDOM(editor, dom)) root.append(node); }, }; /** `<dj-rich-text>` — a form-associated WYSIWYG editor built on the Lexical core. The editable region renders in LIGHT DOM (Lexical's selection handling is not reliable inside a shadow root yet), so this component overrides `createRenderRoot`; theming still works because `--dj-*` tokens cascade in light DOM. The editor is a PLUGIN HOST: bold/italic/underline and undo/redo ship as the default plugin set (`default-plugins.ts`) and flow through the same {@link RichTextPlugin} API third-party plugins use. Foundational behavior (`registerRichText`, value sync, root-element setup) stays as core. Toolbar controls, node registration, and output formats all come from plugins. Constraint: Lexical needs node classes at creation, so a `plugins` change after creation rebuilds the editor (serialize → recreate → deserialize). Value is HTML by default; the `format` property selects an alternate serializer contributed by a plugin. Event: `dj-change`.

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
| `plugins` | — | `RichTextPlugin[]` | `[]` |
| `format` | format ↻ | `string` | `"html"` |

**Events:** `dj-change`

**Methods:** `checkValidity(): boolean`, `focus(o: FocusOptions)`, `setHtml(htmlString: string)` (Replace the document with the given HTML (regardless of the active `format`).)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
