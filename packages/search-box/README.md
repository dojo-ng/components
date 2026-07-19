# @dojo-ng/search-box

`<dj-search-box>` — A search field: free text plus typed `key:value` filters.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A search field: free text plus typed `key:value` filters. Typing a configured `key:` enters token mode; keys with `options` open a suggestion popup (pick to commit), keys without take a free-typed value committed by Enter or the terminating space (values may be `"quoted"` to hold spaces). A committed filter becomes a closeable `<dj-chip>` before the input; an unconfigured `word:` stays plain text. Backspace with the caret at the start removes the last chip. Read-only `query` = `{ text, tokens }`; set it with `setQuery`. Not form-associated.

> Free text plus typed `key:value` filters. Configure `keys`: a key with `options` opens a suggestion popup when you type `key:` (pick to commit), a key without takes a free-typed value committed by Enter or the terminating space, and values may be `"quoted"` to hold spaces. A committed filter becomes a closeable chip before the input; an unconfigured `word:` stays plain text — no popup, no chip, no error. Backspace with the caret at the start removes the last chip. Read `query` (`{ text, tokens }`) or listen for `dj-query-change`; `dj-search` fires on Enter outside token mode. `setQuery()` sets it programmatically without emitting. The tokenizer IS the exported `parseQuery`, so a backend can reuse the same grammar (`import { parseQuery, formatQuery } from "@dojo-ng/search-box"`). Not form-associated — search is app-driven.

## Install

```bash
npm install @dojo-ng/search-box
```

## Usage

Import the package to register the custom element, then use the tag.

Configure `keys`; `has` carries `options`, so typing `has:` opens a suggestion popup. Read the structured query off `dj-query-change` (every change) or `dj-search` (Enter).

```html
<dj-search-box id="mail-search" label="Search mail" placeholder='Try from:ada or has:attachment or subject:"weekly report"'></dj-search-box>
<pre id="query-out">{ "text": "", "tokens": [] }</pre>
<script type="module">
  import "@dojo-ng/search-box";
  const box = document.getElementById("mail-search");
  box.keys = [
    { key: "from", label: "From" },
    { key: "to", label: "To" },
    { key: "tag", label: "Tag" },
    { key: "has", label: "Has", options: [
      { value: "attachment", label: "attachment" },
      { value: "image", label: "image" },
    ] },
  ];
  const out = document.getElementById("query-out");
  const show = (e) => { out.textContent = JSON.stringify(e.detail.query, null, 2); };
  box.addEventListener("dj-query-change", show);
  box.addEventListener("dj-search", show);
</script>
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

**Parts:** `box`, `input`, `chip`, `clear`, `label`

**Events:** `dj-query-change` (`{ query }`), `dj-search` (`{ query }`)

**Methods:** `setQuery(q: SearchQuery)` (Set the query programmatically, rendering its chips and text. Does not emit.), `clear()` (Clear all text and filters, emitting `dj-query-change`.), `focus(options: FocusOptions)`

**CSS properties:** `--dj-focus-ring` (Focus ring for the clear button (inherited token).)

## Examples

### Reuse the grammar on the server

The component's tokenizer is the exported pure parser, so the same query string parses identically outside the browser.

```html
import { parseQuery, formatQuery } from "@dojo-ng/search-box";

const keys = [{ key: "from" }, { key: "has", options: [] }];
const q = parseQuery('from:ada has:attachment weekly report', keys);
// q.tokens -> [{ key: "from", value: "ada" }, { key: "has", value: "attachment" }]
// q.text   -> "weekly report"
formatQuery(q); // round-trips back to the same string
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
