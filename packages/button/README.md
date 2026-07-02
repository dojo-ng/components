# @dojo-ng/button

`<dj-button>` — The foundational button.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/button
```

## Usage

Import the package to register the custom element, then use the tag.

The `kind` property selects contained, outlined, or text styling.

```html
<dj-button kind="contained">Save</dj-button>
<dj-button kind="outlined">Cancel</dj-button>
<dj-button kind="text">Learn more</dj-button>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `disabled` | disabled ↻ | `boolean` | `false` |
| `kind` | kind ↻ | `ButtonKind` | `"contained"` |
| `type` | type | `ButtonType` | `"button"` |
| `name` | name | `string` | — |
| `value` | value | `string` | — |
| `label` | label | `string` | — |
| `iconPosition` | icon-position ↻ | `IconPosition` | `"before"` |
| `title` | title | `string` | `""` |

**Slots:** default (the button label), `icon` (an icon, placed per `icon-position`)

**Parts:** `base` (the native button), `label`, `icon`

**Methods:** `focus(options: FocusOptions)` (Move focus to the underlying native button.), `blur()` (Remove focus from the underlying native button.)

**CSS properties:** `--dj-button-font-size-small` (default `var(--dj-font-size-small)`; Font size of a small button.), `--dj-button-font-size-medium` (default `var(--dj-font-size-medium)`; Font size of a medium button.), `--dj-button-font-size-large` (default `1.125rem`; Font size of a large button.)

## Examples

### With an icon

Slot an icon and place it with `icon-position`.

```html
<dj-button icon-position="before">
  <svg slot="icon" viewBox="0 0 24 24" width="18" height="18"><path d="M5 12h14M12 5v14" stroke="currentColor" stroke-width="2" fill="none"/></svg>
  Add item
</dj-button>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
