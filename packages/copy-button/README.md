# @dojo-ng/copy-button

`<dj-copy-button>` — An icon-only button that copies text to the clipboard and shows whether it worked.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

It is built on `<dj-button>`, so focus, keyboard use, and button semantics work as usual.

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

## What it copies

- The literal `value`, or, with `from`, the element with that id in the same root: its `value` for a form control, otherwise its `textContent`.
- When both `value` and `from` are set, `value` wins.

## Feedback

- After a click, the icon changes to a check mark (copied) or an error mark for `feedback-duration` milliseconds, then changes back.
- The accessible name changes with it (Copy, Copied, Copy failed), so screen reader users hear the result.
- `dj-copy` fires with `{ value }` on success, and `dj-error` on failure.

## Requirements

- Copying uses `navigator.clipboard.writeText`, which needs a secure context (https or localhost). There is no older fallback, so on plain http nothing is copied and the button shows its error state.

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `from` | from | `string` | — |
| `feedbackDuration` | feedback-duration | `number` | `2000` |

## CSS parts

- `button`: The composed `<dj-button>`.

## Events

- `dj-copy`: Detail `{ value }`.
- `dj-error`

## Methods

- `focus(options: FocusOptions)`

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

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
