# @dojo-ng/file-input

`<dj-file-input>` — A form-associated file selector with a button that opens the system file picker and a focusable drop zone.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

The component only selects files. It does not upload them or show previews. Selected files are listed with their size and a remove button.

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

## Adding files

Files can arrive in four ways, and all of them go through the same checks:

- The file picker.
- A drop on the drop zone.
- A paste, such as a screenshot, while the drop zone has focus.
- The `addFiles(files)` method, for files your app captured somewhere else, such as a paste in a message body or a drop on a whole pane.

## Checks

- `accept` filters the picker and drops, by extension, exact MIME type, or `type/*`.
- Without `multiple`, a new file replaces the current one.
- `max-size` (bytes, per file) rejects a larger file and sets a `fileTooLarge` validity error, cleared on the next change.
- `required` with no files reports `valueMissing`.

## Value

- The form value is one `File`, or, with `multiple`, a `FormData` with one entry per file under `name`.
- `files` (read-only) is the current selection, and `clear()` empties it.
- `dj-change` fires with `{ files }` when files are added or removed.

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

## CSS parts

- `button`
- `dropzone`
- `list`
- `item`
- `remove`
- `label`

## Events

- `dj-change`: `{ files }`.

## Methods

- `checkValidity(): boolean`
- `reportValidity(): boolean`
- `focus(options: FocusOptions)`
- `clear()`: Remove all selected files (no `dj-change`).
- `addFiles(incoming: File[] | FileList)`: Add files from any source, applying `accept` + `multiple` + `max-size`; appends, or replaces when not `multiple`. Emits `dj-change`. This is the single intake path — the picker, drop, and paste all route through it, and the app can call it to forward files captured elsewhere (e.g. a paste into the compose body or a drop on the whole pane).

## Examples

### Forward files from elsewhere with addFiles

The app can push files the control did not capture — e.g. a paste or drop on a surrounding compose pane. `addFiles` runs the same `accept` / `multiple` / `max-size` filtering as the picker and emits `dj-change`. (The control also handles a paste directly onto its focused drop zone.)

```html
<dj-file-input id="attach" label="Attachments" accept="image/*" multiple></dj-file-input>
<script type="module">
  import "@dojo-ng/file-input";
  const input = document.getElementById("attach");
  // A paste anywhere in the compose pane forwards its files to the control.
  document.querySelector(".compose").addEventListener("paste", (e) => {
    if (e.clipboardData?.files.length) input.addFiles(e.clipboardData.files);
  });
</script>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
