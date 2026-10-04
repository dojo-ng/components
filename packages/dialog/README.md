# @dojo-ng/dialog

`<dj-dialog>` — A modal dialog.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Slots: `title`, default (content), `actions`. Locks body scroll while open, closes on Escape and the close button, and on underlay click unless `modal`. `role="alertdialog"` is always modal. Restores focus to the previously focused element on close. Emits `dj-close`. Parts: `underlay`, `dialog`, `title`, `close`, `content`, `actions`.

## Install

```bash
npm install @dojo-ng/dialog
```

## Usage

Import the package to register the custom element, then use the tag.

Toggle `open`; listen for `dj-close`.

```html
<dj-button id="open">Open dialog</dj-button>
<dj-dialog id="dlg">
  <span slot="title">Confirm</span>
  Delete this item?
  <div slot="actions">
    <dj-button kind="text" id="no">Cancel</dj-button>
    <dj-button id="yes">Delete</dj-button>
  </div>
</dj-dialog>
<script type="module">
  import "@dojo-ng/dialog"; import "@dojo-ng/button";
  const dlg = document.getElementById("dlg");
  document.getElementById("open").addEventListener("click", () => (dlg.open = true));
  document.getElementById("no").addEventListener("click", () => (dlg.open = false));
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open ↻ | `boolean` | `false` |
| `closeable` | closeable | `boolean` | `true` |
| `modal` | modal | `boolean` | `false` |
| `underlay` | underlay | `boolean` | `true` |
| `role` | role ↻ | `"dialog" \| "alertdialog"` | `"dialog"` |
| `closeText` | close-text | `string` | — |

## Slots

- `title`
- default slot: Content.
- `actions`

## CSS parts

- `underlay`
- `dialog`
- `title`
- `close`
- `content`
- `actions`

## Events

- `dj-close`

## Methods

- `close()`

## CSS custom properties

- `--dj-dialog-z-index`: Stacking order of the dialog. Default `941`.
- `--dj-dialog-underlay-z-index`: Stacking order of the dialog underlay (scrim). Default `940`.

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
