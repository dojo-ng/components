# @dojo-ng/toolbar

`<dj-toolbar>` — A horizontal action bar.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A horizontal action bar. Slots: `leading` (logo, menu/back button), default (title or content), `actions` (primary action buttons, end-aligned). Secondary actions can collapse into an overflow menu: set the `overflow` property to a list of options and a `⋮` button renders a popup `<dj-list>` of them, emitting `dj-action` with the chosen value. `sticky` pins the bar to the top. `role="toolbar"`. Composes popup, list, icon. The overflow menu closes on selection, Escape, outside click, and on tab-out. (Automatic width-based collapsing of slotted actions is a future addition; for now the app decides which actions are primary and which go in `overflow`.)

## Install

```bash
npm install @dojo-ng/toolbar
```

## Usage

Import the package to register the custom element, then use the tag.

Slot `leading`, a title (default), and `actions`; secondary actions collapse into an overflow menu via the `overflow` property.

```html
<dj-toolbar label="Records" id="tb">
  <dj-button slot="leading" kind="text">Back</dj-button>
  Records
  <dj-button slot="actions">New</dj-button>
</dj-toolbar>
<script type="module">
  import "@dojo-ng/toolbar"; import "@dojo-ng/button";
  const tb = document.getElementById("tb");
  tb.overflow = [{ value: "export", label: "Export" }, { value: "delete", label: "Delete" }];
  tb.addEventListener("dj-action", (e) => console.log(e.detail.value));
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `label` | label | `string` | — |
| `sticky` | sticky ↻ | `boolean` | `false` |
| `overflow` | — | `ListOption[]` | `[]` |
| `overflowPosition` | overflow-position ↻ | `PopupPosition` | `"below"` |

**Slots:** `leading`, default, `actions`

**Parts:** `bar`, `leading`, `title`, `actions`, `overflow`

**Events:** `dj-action` (detail: `{ value }`)

**CSS properties:** `--dj-toolbar-z-index` (default `700`; Stacking order when the toolbar is sticky.)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
