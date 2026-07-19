# @dojo-ng/copy-button

`<dj-copy-button>` — An icon-only button that copies text to the clipboard and flashes feedback.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

An icon-only button that copies text to the clipboard and flashes feedback. It composes `<dj-button>`, so focus, keyboard, and button ARIA come for free. Copy the literal `value`, or point `from` at an element id in the same root to copy that element's `value` (form controls) or `textContent` (`value` wins when both are set). Copying uses `navigator.clipboard.writeText`, which requires a secure context (https or localhost); there is no legacy `execCommand` fallback. If the clipboard is unavailable or the write is rejected, the button shows an error state and emits `dj-error`. The icon swaps copy → check (success) → error for `feedback-duration` ms, then reverts, and the button's accessible name changes with it (Copy / Copied / Copy failed) so assistive tech hears the result.

> Copies to the clipboard via `navigator.clipboard.writeText`, which requires a secure context (https or localhost) — there is no legacy fallback, so on plain http nothing is copied and the button shows its error state. Copy the literal `value`, or point `from` at an element id in the same root to copy that element's `value` (form fields) or `textContent`; `value` wins when both are set. The icon flashes copy → check → error for `feedback-duration` ms and the accessible name changes with it (Copy / Copied / Copy failed). Listen for `dj-copy` (detail `{ value }`) and `dj-error`.

## Install

```bash
npm install @dojo-ng/copy-button
```

## Usage

Import the package to register the custom element, then use the tag.

Flashes feedback; listen for `dj-copy`.

```html
<dj-copy-button value="npm install @dojo-ng/button"></dj-copy-button>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `from` | from | `string` | — |
| `feedbackDuration` | feedback-duration | `number` | `2000` |

**Parts:** `button` (the composed `<dj-button>`)

**Events:** `dj-copy` (detail `{ value }`), `dj-error`

**Methods:** `focus(options: FocusOptions)`

## Examples

### Copy from another element

`from` points at an element id in the same root.

```html
<code id="token">sk_live_abc123</code>
<dj-copy-button from="token"></dj-copy-button>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
