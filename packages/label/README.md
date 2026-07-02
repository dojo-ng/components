# @dojo-ng/label

`<dj-label>` — A form label.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A form label. Content goes in the default slot. Note: native `for`/`id` association does not cross shadow boundaries, so associate by wrapping the control in the label's light DOM, or rely on the consuming field component to wire ARIA. `for-id` is still reflected for same-root cases. Deviates from the Dojo widget in one name: the visually-hidden flag is `visually-hidden` (not `hidden`) to avoid clobbering the native `hidden` attribute.

## Install

```bash
npm install @dojo-ng/label
```

## Usage

Import the package to register the custom element, then use the tag.

Wrap the control in the label's light DOM for association.

```html
<dj-label>Remember me <dj-checkbox name="remember"></dj-checkbox></dj-label>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `disabled` | disabled ↻ | `boolean` | `false` |
| `focused` | focused ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `readonly` | readonly ↻ | `boolean` | `false` |
| `secondary` | secondary ↻ | `boolean` | `false` |
| `active` | active ↻ | `boolean` | `false` |
| `visuallyHidden` | visually-hidden ↻ | `boolean` | `false` |
| `valid` | valid | `boolean` | — |
| `forId` | for-id | `string` | — |

**Slots:** default

**Parts:** `base`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
