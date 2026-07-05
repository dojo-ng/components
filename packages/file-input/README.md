# @dojo-ng/file-input

`<dj-file-input>` — A form-associated file selector with a button (opens the OS picker) and a drop zone.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A form-associated file selector with a button (opens the OS picker) and a drop zone. Selected files are copied into component state, shown as a removable list; the element only SELECTS files (no upload/preview). Form value: a single `File` normally, or a `FormData` with one entry per file (under `name`) when `multiple`. Parts: `button`, `dropzone`, `list`, `item`, `remove`. Event: `dj-change` (`{ files }`) on add and remove.

> A form-associated file selector: a `dj-button` opens the OS picker and the host doubles as a drop zone. Selected files are copied into component state and listed with their size and a remove button; the component only SELECTS files — it does no uploading or preview. `accept` filters both the picker and drops (extension, exact MIME, or `type/*`); `multiple` allows more than one (otherwise a new pick replaces the current file); `max-size` (bytes, per file) rejects an oversize file and sets a `fileTooLarge` validity error, cleared on the next change; `required` with no files reports `valueMissing`. Form value is a single `File`, or a `FormData` with one entry per file under `name` when `multiple`. Read `files` (read-only) for the current selection; call `clear()` to empty it. Emits `dj-change` (`{ files }`) on add and remove. The keyboard path is the button, so drag-and-drop adds no accessibility gap. Parts: `button`, `dropzone`, `list`, `item`, `remove`.

## Install

```bash
npm install @dojo-ng/file-input
```

## Usage

Import the package to register the custom element, then use the tag.

Set `accept` and `multiple`; read the selection from `dj-change` or the `files` property.

```html
<dj-file-input id="files" label="Attachments" accept="image/*" multiple max-size="5000000"></dj-file-input>
<script type="module">
  import "@dojo-ng/file-input";
  document.getElementById("files").addEventListener("dj-change", (e) => console.log(e.detail.files));
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `accept` | accept | `string` | — |
| `multiple` | multiple | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `maxSize` | max-size | `number` | — |
| `label` | label | `string` | — |
| `name` | name ↻ | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |

**Parts:** `button`, `dropzone`, `list`, `item`, `remove`, `label`

**Events:** `dj-change` (`{ files }`)

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`, `focus(options: FocusOptions)`, `clear()` (Remove all selected files (no `dj-change`).)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
