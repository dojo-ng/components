# @dojo-ng/search-box

`<dj-search-box>` — A search field for free text plus typed `key:value` filters.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Configure the filters with `keys`. Typing a configured key and a colon, such as `status:`, starts a filter.

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

## Filters

- A key with `options` opens a suggestion popup. Pick an option to commit the filter.
- A key without `options` takes a typed value. Enter or a space commits it. Put the value in quotes (`"in progress"`) to include spaces.
- A committed filter becomes a chip before the input. Each chip has a close button.
- A `word:` that is not a configured key stays plain text, with no popup, no chip, and no error.
- Backspace with the caret at the start of the input removes the last chip.

## Reading and setting the query

- `query` is read-only: `{ text, tokens }`.
- `dj-query-change` fires when a filter or the committed text changes.
- `dj-search` fires on Enter when no filter is being typed.
- `setQuery()` sets the query from code. It does not emit an event.
- The search box is not form-associated. Your app runs the search.

## The same grammar on a server

- The tokenizer is the exported `parseQuery`, and `formatQuery` turns a query back into text. A backend can import both and parse the same syntax.

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `keys` | keys | `SearchKey[]` | `[]` |
| `label` | label | `string` | — |
| `placeholder` | placeholder | `string` | — |
| `position` | position ↻ | `PopupPosition` | `"below"` |
| `disabled` | disabled ↻ | `boolean` | `false` |

## CSS parts

- `box`
- `input`
- `chip`
- `clear`
- `label`

## Events

- `dj-query-change`: `{ query }`.
- `dj-search`: `{ query }`.

## Methods

- `setQuery(q: SearchQuery)`: Set the query programmatically, rendering its chips and text. Does not emit.
- `clear()`: Clear all text and filters, emitting `dj-query-change`.
- `focus(options: FocusOptions)`

## CSS custom properties

- `--dj-focus-ring`: Focus ring for the clear button (inherited token).

## Examples

### Reuse the grammar on the server

The component's tokenizer is the exported pure parser, so the same query string parses identically outside the browser.

```js
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

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
