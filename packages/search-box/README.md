# @dojo-ng/search-box

`<dj-search-box>` — A search field: free text plus typed `key:value` filters.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A search field: free text plus typed `key:value` filters. Typing a configured `key:` enters token mode; keys with `options` open a suggestion popup (pick to commit), keys without take a free-typed value committed by Enter or the terminating space (values may be `"quoted"` to hold spaces). A committed filter becomes a closeable `<dj-chip>` before the input; an unconfigured `word:` stays plain text. Backspace with the caret at the start removes the last chip. Read-only `query` = `{ text, tokens }`; set it with `setQuery`. Not form-associated.

## Install

```bash
npm install @dojo-ng/search-box
```

## Usage

Import the package to register the custom element, then use the tag.

```html
<script type="module">import "@dojo-ng/search-box";</script>
<dj-search-box></dj-search-box>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `keys` | keys | `SearchKey[]` | `[]` |
| `label` | label | `string` | — |
| `placeholder` | placeholder | `string` | — |
| `position` | position ↻ | `PopupPosition` | `"below"` |
| `disabled` | disabled ↻ | `boolean` | `false` |

**Slots:** `none`

**Parts:** `box`, `input`, `chip`, `clear`, `label`

**Events:** `dj-query-change` (`{ query }`), `dj-search` (`{ query }`)

**Methods:** `setQuery(q: SearchQuery)` (Set the query programmatically, rendering its chips and text. Does not emit.), `clear()` (Clear all text and filters, emitting `dj-query-change`.), `focus(options: FocusOptions)`

**CSS properties:** `--dj-focus-ring` (Focus ring for the clear button (inherited token).)

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
