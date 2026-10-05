# Dojo NG component reference

First-pass API reference for the Dojo NG web components, generated from source. For conventions (naming, `--dj-*` theming tokens, events, the WCAG 2.2 AA / mobile requirements) see `component-conventions.md`; for theming see `theming-proposal.md`; for state/data see `state-and-framework-analysis.md`.

Usage: import a package to register its tag, then use it. Example:

```html
<script type="module">import "@dojo-ng/button";</script>
<dj-button kind="outlined">Save</dj-button>
```

In the property tables, **Attribute** is the HTML attribute name (↻ = reflected to the DOM); a dash means the property is set in JavaScript only. Components also expose CSS `part`s for `::part()` styling.


## Form controls


### `<dj-button>` · `@dojo-ng/button`

The foundational button.

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
| `ariaLabel` | aria-label ↻ | `string \| null` | `null` |
| `ariaPressed` | aria-pressed ↻ | `string \| null` | `null` |
| `ariaExpanded` | aria-expanded ↻ | `string \| null` | `null` |

**Slots:** default (the button label), `icon` (an icon, placed per `icon-position`)

**Parts:** `base` (the native button), `label`, `icon`

**Methods:** `focus(options: FocusOptions)` (Move focus to the underlying native button.), `blur()` (Remove focus from the underlying native button.)

**CSS properties:** `--dj-button-font-size-small` (default `var(--dj-font-size-small)`; Font size of a small button.), `--dj-button-font-size-medium` (default `var(--dj-font-size-medium)`; Font size of a medium button.), `--dj-button-font-size-large` (default `1.125rem`; Font size of a large button.)


### `<dj-action-button>` · `@dojo-ng/action-button`

*Extends `DjButton`; inherits its properties and behavior.*

A button that inherits the surrounding theme rather than imposing its own. Mirrors the Dojo `action-button`, which renders `Button` with `variant="inherit"`. Because --dj-* tokens inherit through the shadow boundary, subclassing DjButton with no token overrides already yields inherited theming.


### `<dj-floating-action-button>` · `@dojo-ng/floating-action-button`

*Extends `DjButton`; inherits its properties and behavior.*

A circular (or extended/pill) action button, optionally fixed to a screen position. Subclasses `<dj-button>`; default-slot label, `icon` slot.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `size` | size ↻ | `FabSize` | `"normal"` |
| `position` | position ↻ | `FabPosition` | — |

**CSS properties:** `--dj-fab-z-index` (default `800`; Stacking order of the floating action button.)


### `<dj-copy-button>` · `@dojo-ng/copy-button`

An icon-only button that copies text to the clipboard and shows whether it worked.

It is built on `<dj-button>`, so focus, keyboard use, and button semantics work as usual.

#### What it copies

- The literal `value`, or, with `from`, the element with that id in the same root: its `value` for a form control, otherwise its `textContent`.
- When both `value` and `from` are set, `value` wins.

#### Feedback

- After a click, the icon changes to a check mark (copied) or an error mark for `feedback-duration` milliseconds, then changes back.
- The accessible name changes with it (Copy, Copied, Copy failed), so screen reader users hear the result.
- `dj-copy` fires with `{ value }` on success, and `dj-error` on failure.

#### Requirements

- Copying uses `navigator.clipboard.writeText`, which needs a secure context (https or localhost). There is no older fallback, so on plain http nothing is copied and the button shows its error state.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `from` | from | `string` | — |
| `feedbackDuration` | feedback-duration | `number` | `2000` |

**Parts:** `button` (the composed `<dj-button>`)

**Events:** `dj-copy` (detail `{ value }`), `dj-error`

**Methods:** `focus(options: FocusOptions)`


### `<dj-label>` · `@dojo-ng/label`

A form label. Content goes in the default slot.

Note: native `for`/`id` association does not cross shadow boundaries, so associate by wrapping the control in the label's light DOM, or rely on the consuming field component to wire ARIA. `for-id` is still reflected for same-root cases.

Deviates from the Dojo widget in one name: the visually-hidden flag is `visually-hidden` (not `hidden`) to avoid clobbering the native `hidden` attribute.

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


### `<dj-helper-text>` · `@dojo-ng/helper-text`

Supporting text shown under a form control. Provide text via the `text` attribute, or slot richer content. `valid` (tri-state) tints the text.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `text` | text | `string` | — |
| `valid` | valid | `boolean` | — |

**Slots:** default

**Parts:** `base`, `text`


### `<dj-text-input>` · `@dojo-ng/text-input`

A form-associated text field that composes `<dj-label>` and `<dj-helper-text>`. It participates in native forms via ElementInternals: it sets its form value and mirrors the inner input's constraint validity to the host.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `type` | type | `TextInputType` | `"text"` |
| `name` | name ↻ | `string` | — |
| `placeholder` | placeholder | `string` | — |
| `label` | label | `string` | — |
| `helperText` | helper-text | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `readonly` | readonly ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `labelHidden` | label-hidden | `boolean` | `false` |
| `autocomplete` | autocomplete | `string` | — |
| `pattern` | pattern | `string` | — |
| `min` | min | `string` | — |
| `max` | max | `string` | — |
| `step` | step | `string` | — |
| `minlength` | minlength | `number` | — |
| `maxlength` | maxlength | `number` | — |

**Slots:** `leading`, `trailing`

**Parts:** `label`, `control`, `input`, `helper-text`

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`, `setCustomValidity(message: string)`, `focus(options: FocusOptions)`, `blur()`


### `<dj-email-input>` · `@dojo-ng/email-input`

*Extends `DjTextInput`; inherits its properties and behavior.*

A text input defaulting to `type="email"` (native email validation).

| Property | Attribute | Type | Default |
|---|---|---|---|
| `type` | type | `TextInputType` | `"email"` |


### `<dj-number-input>` · `@dojo-ng/number-input`

*Extends `DjTextInput`; inherits its properties and behavior.*

A text input defaulting to `type="number"`; exposes `valueAsNumber`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `type` | type | `TextInputType` | `"number"` |


### `<dj-password-input>` · `@dojo-ng/password-input`

*Extends `DjConstrainedInput`; inherits its properties and behavior.*

A password field with a show/hide toggle in the trailing slot. Inherits `<dj-constrained-input>`, so it also accepts a custom `validator`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `type` | type | `TextInputType` | `"password"` |


### `<dj-constrained-input>` · `@dojo-ng/constrained-input`

*Extends `DjTextInput`; inherits its properties and behavior.*

A text input with a custom `validator` function: `(value) => string | undefined` returning an error message (or undefined when valid). Applied through native constraint validation, so it participates in form validity. (Dojo's rule-DSL ValidationRules is deferred; supply a function for now.)

| Property | Attribute | Type | Default |
|---|---|---|---|
| `validator` | — | `(value: string) => string \| undefined` | — |


### `<dj-text-area>` · `@dojo-ng/text-area`

A form-associated multi-line text field, composing `<dj-label>` and `<dj-helper-text>`. Same form/validity model as `<dj-text-input>`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `placeholder` | placeholder | `string` | — |
| `label` | label | `string` | — |
| `helperText` | helper-text | `string` | — |
| `rows` | rows | `number` | `3` |
| `cols` | cols | `number` | — |
| `wrap` | wrap | `"hard" \| "soft" \| "off"` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `readonly` | readonly ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `labelHidden` | label-hidden | `boolean` | `false` |
| `minlength` | minlength | `number` | — |
| `maxlength` | maxlength | `number` | — |

**Parts:** `label`, `control`, `input`, `helper-text`

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`, `setCustomValidity(message: string)`, `focus(options: FocusOptions)`, `blur()`


### `<dj-native-select>` · `@dojo-ng/native-select`

A form-associated wrapper over a native `<select>`, driven by an `options` array, composing `<dj-label>`, `<dj-helper-text>`, and a `<dj-icon>` chevron. A blank option is prepended while nothing is selected. Parts: `label`, `control`, `select`, `helper-text`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `options` | options | `MenuOption[]` | `[]` |
| `label` | label | `string` | — |
| `helperText` | helper-text | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `labelHidden` | label-hidden | `boolean` | `false` |
| `placeholder` | placeholder | `string` | — |
| `size` | size | `number` | — |

**Parts:** `label`, `control`, `select`, `helper-text`, `arrow`

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`, `focus(options: FocusOptions)`


### `<dj-select>` · `@dojo-ng/select`

A form-associated single-select combobox. A trigger shows the selected option; clicking (or ArrowDown/Enter/Space) opens a `<dj-popup>` containing a `<dj-list>` of `options`. Selecting sets `value`, closes, and returns focus. ARIA combobox/listbox. Composes label, helper-text, icon, popup, list. Parts: `label`, `trigger`, `helper-text`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `options` | options | `ListOption[]` | `[]` |
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `helperText` | helper-text | `string` | — |
| `placeholder` | placeholder | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `position` | position ↻ | `PopupPosition` | `"below"` |
| `open` | open ↻ | `boolean` | `false` |

**Parts:** `label`, `trigger`, `helper-text`

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`, `focus(o: FocusOptions)`


### `<dj-typeahead>` · `@dojo-ng/typeahead`

An editable combobox: type to filter `options`, pick from a popup `<dj-list>`. `strict` (default true) requires the value to match an option. Composes text-input, popup, list. Form-associated. Event: `change`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `options` | options | `ListOption[]` | `[]` |
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `placeholder` | placeholder | `string` | — |
| `helperText` | helper-text | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `strict` | strict | `boolean` | `true` |
| `position` | position ↻ | `PopupPosition` | `"below"` |

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `focus(o: FocusOptions)`


### `<dj-chip-typeahead>` · `@dojo-ng/chip-typeahead`

A multi-select typeahead: type to filter `options`, pick from a popup list, and each choice becomes a removable chip.

It is form-associated and submits each value under `name`. It is built from `dj-chip`, `dj-list`, `dj-popup`, and `dj-label`.

#### Choosing values

- Typing filters `options`; picking one from the popup adds it as a chip.
- Backspace in an empty input removes the last chip.
- The `change` event fires with the selected values.

#### Free-text tags: `allow-new`

- By default only the configured `options` can be chosen.
- With `allow-new`, Enter on text that matches no option creates a chip from that text, trimmed. If an option in the popup is highlighted, Enter picks that option instead.
- New values follow `duplicates`, clear the input, and join the form value like picked ones.
- Only Enter adds a value. Comma does not, because a comma is a normal character in many languages.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `options` | options | `ListOption[]` | `[]` |
| `value` | value | `string[]` | `[]` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `placeholder` | placeholder | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `duplicates` | duplicates | `boolean` | `false` |
| `allowNew` | allow-new ↻ | `boolean` | `false` |
| `position` | position ↻ | `PopupPosition` | `"below"` |

**Parts:** `label`, `box`

**Events:** `change` (detail: selected values)

**Methods:** `checkValidity(): boolean`, `focus(o: FocusOptions)`, `restoreFormState(state: File | string | FormData | null)`


### `<dj-search-box>` · `@dojo-ng/search-box`

A search field for free text plus typed `key:value` filters.

Configure the filters with `keys`. Typing a configured key and a colon, such as `status:`, starts a filter.

#### Filters

- A key with `options` opens a suggestion popup. Pick an option to commit the filter.
- A key without `options` takes a typed value. Enter or a space commits it. Put the value in quotes (`"in progress"`) to include spaces.
- A committed filter becomes a chip before the input. Each chip has a close button.
- A `word:` that is not a configured key stays plain text, with no popup, no chip, and no error.
- Backspace with the caret at the start of the input removes the last chip.

#### Reading and setting the query

- `query` is read-only: `{ text, tokens }`.
- `dj-query-change` fires when a filter or the committed text changes.
- `dj-search` fires on Enter when no filter is being typed.
- `setQuery()` sets the query from code. It does not emit an event.
- The search box is not form-associated. Your app runs the search.

#### The same grammar on a server

- The tokenizer is the exported `parseQuery`, and `formatQuery` turns a query back into text. A backend can import both and parse the same syntax.

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


### `<dj-checkbox>` · `@dojo-ng/checkbox`

A form-associated checkbox composing `<dj-label>`. Submits `value` (default "on") when checked, nothing when not. Mirrors required-validity to the host.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `checked` | checked ↻ | `boolean` | `false` |
| `value` | value | `string` | `"on"` |
| `name` | name ↻ | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `readonly` | readonly ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `labelHidden` | label-hidden | `boolean` | `false` |

**Slots:** default

**Parts:** `control` (the box), `label`

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`, `focus(options: FocusOptions)`, `restoreFormState(state: File | string | FormData | null)`


### `<dj-checkbox-group>` · `@dojo-ng/checkbox-group`

Multi-select group from `options`; submits each checked value under `name`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `options` | options | `CheckboxOption[]` | `[]` |
| `value` | value | `string[]` | `[]` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `orientation` | orientation | `"vertical"\|"horizontal"` | `"vertical"` |
| `disabled` | disabled | `boolean` | `false` |

**Events:** `change`

**Methods:** `checkValidity()`, `restoreFormState(state: File | string | FormData | null)`


### `<dj-radio>` · `@dojo-ng/radio`

A form-associated radio composing `<dj-label>`. Radios sharing a `name` within the same form (or document) are mutually exclusive: checking one unchecks the others. Submits `value` when checked. Parts: `control`, `label`. Event: `change`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `checked` | checked ↻ | `boolean` | `false` |
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `labelHidden` | label-hidden | `boolean` | `false` |
| `tabbable` | tabbable | `boolean` | `true` |

**Slots:** default

**Parts:** `control`, `label`

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`, `focus(options: FocusOptions)`, `restoreFormState(state: File | string | FormData | null)`


### `<dj-radio-group>` · `@dojo-ng/radio-group`

Coordinates a set of `<dj-radio>` into a single-choice control. Provide choices either with the `options` array (rendered for you) or by slotting `<dj-radio>` children. The group owns selection (exclusivity), roving-arrow keyboard navigation, and form participation: it is the one form-associated element, submitting the selected `value` under `name`. Child radios should not carry their own `name`.

This is local parent-child coordination, so it uses DOM, properties, and events — no external store needed.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `name` | name ↻ | `string` | — |
| `value` | value | `string` | `""` |
| `options` | options | `RadioOption[]` | — |
| `label` | label | `string` | — |
| `orientation` | orientation ↻ | `"vertical" \| "horizontal"` | `"vertical"` |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |

**Slots:** default

**Parts:** `group`, `label`

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`


### `<dj-switch>` · `@dojo-ng/switch`

A form-associated on/off toggle (role="switch") composing `<dj-label>`. Modeled like a checkbox; the checked flag is `checked` (the Dojo widget called it `value` — renamed here for consistency with checkbox/radio). Parts: `control`, `label`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `checked` | checked ↻ | `boolean` | `false` |
| `value` | value | `string` | `"on"` |
| `name` | name ↻ | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `readonly` | readonly ↻ | `boolean` | `false` |
| `labelHidden` | label-hidden | `boolean` | `false` |

**Slots:** default

**Parts:** `control`, `label`

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`, `focus(options: FocusOptions)`, `restoreFormState(state: File | string | FormData | null)`


### `<dj-slider>` · `@dojo-ng/slider`

A form-associated single-value range input with a themed track/fill/thumb and optional output, composing `<dj-label>`. Parts: `label`, `track`, `fill`, `input`, `output`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `min` | min | `number` | `0` |
| `max` | max | `number` | `100` |
| `step` | step | `number` | `1` |
| `value` | value | `number` | `0` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `showOutput` | show-output | `boolean` | `true` |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `readonly` | readonly ↻ | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `labelHidden` | label-hidden | `boolean` | `false` |

**Parts:** `label`, `track`, `fill`, `input`, `output`

**Events:** `change`

**Methods:** `checkValidity(): boolean`, `focus(o: FocusOptions)`, `restoreFormState(state: File | string | FormData | null)`


### `<dj-range-slider>` · `@dojo-ng/range-slider`

A form-associated dual-thumb range. Two overlaid native ranges keep `valueMin <= valueMax`. Submits two form entries (`<name>_min`, `<name>_max`). `value` getter returns `{ min, max }`. Composes `<dj-label>`. Event: `change` (detail `{min,max}`).

| Property | Attribute | Type | Default |
|---|---|---|---|
| `min` | min | `number` | `0` |
| `max` | max | `number` | `100` |
| `step` | step | `number` | `1` |
| `valueMin` | value-min | `number` | `0` |
| `valueMax` | value-max | `number` | `100` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `showOutput` | show-output | `boolean` | `false` |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `labelHidden` | label-hidden | `boolean` | `false` |

**Parts:** `label`, `track`, `fill`, `output`

**Events:** `change` (detail `{min,max}`)

**Methods:** `checkValidity(): boolean`, `restoreFormState(state: File | string | FormData | null)`


### `<dj-rate>` · `@dojo-ng/rate`

Star rating (0..max). Form-associated. (Half-step `allowHalf` accepted; full-star core.)

| Property | Attribute | Type | Default |
|---|---|---|---|
| `max` | max | `number` | `5` |
| `value` | value | `number` | `0` |
| `allowHalf` | allow-half | `boolean` | `false` |
| `readonly` | readonly | `boolean` | `false` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |

**Events:** `change`

**Methods:** `checkValidity()`, `restoreFormState(state: File | string | FormData | null)`

**CSS properties:** `--dj-rate-size` (default `1.5rem`; Size of one star.)


### `<dj-date-input>` · `@dojo-ng/date-input`

An ISO (yyyy-mm-dd) date field: type it, or pick from a popup `<dj-calendar>` opened by the trailing button. Form-associated. Composes text-input, calendar, popup, icon.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `min` | min | `string` | — |
| `max` | max | `string` | — |
| `disabled` | disabled | `boolean` | `false` |
| `required` | required | `boolean` | `false` |

**Events:** `change`

**Methods:** `checkValidity()`


### `<dj-time-picker>` · `@dojo-ng/time-picker`

A `HH:MM` time field with a popup list of options generated from `min`/`max`/`step` (seconds). `format` 24|12 controls option labels. Form-associated.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `min` | min | `string` | `"00:00"` |
| `max` | max | `string` | `"23:59"` |
| `step` | step | `number` | `1800` |
| `format` | format | `"24"\|"12"` | `"24"` |
| `disabled` | disabled | `boolean` | `false` |
| `required` | required | `boolean` | `false` |

**Events:** `change`

**Methods:** `checkValidity()`


### `<dj-color-picker>` · `@dojo-ng/color-picker`

An inline color picker.

It has a saturation and brightness area, a hue slider, an optional opacity slider (`alpha`), a text field, and optional `swatches`.

#### Value and format

- `value` is a color string in the `format` you choose: `hex`, `rgb`, or `hsl`.
- The internal model is HSV plus alpha. After you change `format`, reading `value` returns the new representation.
- Alpha appears in the output only when the color is translucent or `alpha` is on.
- Named CSS colors, such as `rebeccapurple`, are not parsed.
- `dj-change` (`{ value }`) fires on every change the user makes, including during a drag. There is no separate input event.

#### Forms

- The picker is form-associated. It submits the formatted color string under `name`.

#### Swatches

- `swatches` is an array of color strings or `{ value, label }` objects.

#### Dropdowns

- There is no built-in trigger button or popup. Put the picker in a `dj-popup` to make a dropdown.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `format` | format | `ColorFormat` | `"hex"` |
| `alpha` | alpha ↻ | `boolean` | `false` |
| `swatches` | — | `Swatch[]` | `[]` |
| `label` | label | `string` | — |
| `name` | name ↻ | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `get` | get | `string` | — |

**Parts:** `area`, `thumb`, `hue`, `alpha`, `input`, `swatches`, `swatch`, `picker`, `label`

**Events:** `dj-change` (`{ value }`)

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`

**CSS properties:** `--dj-color-picker-width` (default `240px`; Overall width of the inline panel.)


### `<dj-file-input>` · `@dojo-ng/file-input`

A form-associated file selector with a button that opens the system file picker and a focusable drop zone.

The component only selects files. It does not upload them or show previews. Selected files are listed with their size and a remove button.

#### Adding files

Files can arrive in four ways, and all of them go through the same checks:

- The file picker.
- A drop on the drop zone.
- A paste, such as a screenshot, while the drop zone has focus.
- The `addFiles(files)` method, for files your app captured somewhere else, such as a paste in a message body or a drop on a whole pane.

#### Checks

- `accept` filters the picker and drops, by extension, exact MIME type, or `type/*`.
- Without `multiple`, a new file replaces the current one.
- `max-size` (bytes, per file) rejects a larger file and sets a `fileTooLarge` validity error, cleared on the next change.
- `required` with no files reports `valueMissing`.

#### Value

- The form value is one `File`, or, with `multiple`, a `FormData` with one entry per file under `name`.
- `files` (read-only) is the current selection, and `clear()` empties it.
- `dj-change` fires with `{ files }` when files are added or removed.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `accept` | accept | `string` | — |
| `multiple` | multiple | `boolean` | `false` |
| `required` | required ↻ | `boolean` | `false` |
| `maxSize` | max-size | `number` | — |
| `label` | label | `string` | — |
| `name` | name ↻ | `string` | — |
| `disabled` | disabled ↻ | `boolean` | `false` |

**Parts:** `button`, `dropzone`, `list`, `item`, `remove`, `label`

**Events:** `dj-change` (`{ files }`)

**Methods:** `checkValidity(): boolean`, `reportValidity(): boolean`, `focus(options: FocusOptions)`, `clear()` (Remove all selected files (no `dj-change`).), `addFiles(incoming: File[] | FileList)` (Add files from any source, applying `accept` + `multiple` + `max-size`; appends, or replaces when not `multiple`. Emits `dj-change`. This is the single intake path — the picker, drop, and paste all route through it, and the app can call it to forward files captured elsewhere (e.g. a paste into the compose body or a drop on the whole pane).)


### `<dj-form>` · `@dojo-ng/form`

A layout wrapper that gathers values from its named child controls and emits `dj-submit` with a `{ name: value }` object. `column` stacks fields. Because slotted fields live in light DOM (outside any shadow `<form>`), values are read from each named child's `value`. For full native form semantics, the controls are form-associated, so wrapping them in a real `<form>` also works.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `column` | column | `boolean` | `false` |

**Slots:** default

**Events:** `dj-submit`, `dj-reset`

**Methods:** `submit()`, `reset()`


## Overlays


### `<dj-popup>` · `@dojo-ng/popup`

Positions slotted content as an overlay, flipping to the opposite side when there isn't room in the preferred position. Anchor it by setting the `anchor` property to an element, or supply viewport coordinates via the `x-*`/`y-*` attributes.

While open it locks body scroll and closes on Escape or underlay click, emitting a `dj-close` event. Content goes in the default slot.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open ↻ | `boolean` | `false` |
| `position` | position ↻ | `PopupPosition` | `"below"` |
| `underlayVisible` | underlay-visible ↻ | `boolean` | `false` |
| `scrollLock` | scroll-lock | `boolean` | `true` |
| `yTop` | y-top | `number` | `0` |
| `yBottom` | y-bottom | `number` | `0` |
| `xLeft` | x-left | `number` | `0` |
| `xRight` | x-right | `number` | `0` |

**Slots:** default

**Parts:** `underlay`, `wrapper`, `layer`

**Events:** `dj-close`

**Methods:** `close()` (Close the popup and emit `dj-close`.)

**CSS properties:** `--dj-popup-z-index` (default `901`; Stacking order of the popup.), `--dj-popup-underlay-z-index` (default `900`; Stacking order of the popup underlay.)


### `<dj-trigger-popup>` · `@dojo-ng/trigger-popup`

Clicking the trigger (default slot) opens a `<dj-popup>` anchored to it, holding the `content` slot. `match-width` sizes the popup to the trigger.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open ↻ | `boolean` | `false` |
| `position` | position ↻ | `PopupPosition` | `"below"` |
| `matchWidth` | match-width | `boolean` | `true` |
| `underlayVisible` | underlay-visible | `boolean` | `false` |

**Slots:** default, `content`

**Events:** `dj-open`


### `<dj-context-popup>` · `@dojo-ng/context-popup`

Right-click (contextmenu) on the trigger (default slot) opens a `<dj-popup>` at the cursor, holding the `content` slot.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open ↻ | `boolean` | `false` |

**Slots:** default, `content`

**Events:** `dj-open`


### `<dj-dropdown>` · `@dojo-ng/dropdown`

A menu button: a trigger that opens a menu or panel anchored to it, built on `<dj-popup>` and `<dj-list>`.

Put the trigger, usually a `<dj-button>`, in the `trigger` slot, and the menu, usually one `<dj-list>`, in the default slot.

#### Opening and closing

- A click on the trigger opens or closes it. ArrowDown, Enter, and Space open it.
- When the content is a `<dj-list>`, opening switches on its `menu` mode, focuses it, and activates the first item.
- Choosing an item closes the menu. The list's `change` event still reaches your code unchanged.
- Escape closes it. Focus returns to the trigger every time it closes.

#### Other content

- Content that is not a `<dj-list>` works as a plain anchored panel. The dropdown then only opens, closes, handles Escape, and returns focus.
- For an anchored panel with no menu behavior, use `dj-trigger-popup`. For a right-click menu, use `dj-context-menu`.

#### Accessibility

- It follows the APG menu button pattern, and sets `aria-haspopup` and `aria-expanded` on your trigger for you.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open ↻ | `boolean` | `false` |
| `position` | position ↻ | `PopupPosition` | `"below"` |
| `matchWidth` | match-width | `boolean` | `false` |

**Slots:** `trigger` (the button), default (the menu list or panel)

**Parts:** `panel` (the content wrapper inside the popup)

**Events:** `dj-open`, `dj-close`


### `<dj-popup-confirmation>` · `@dojo-ng/popup-confirmation`

Clicking the trigger (default slot) opens a small confirm popup with the `content` slot and Confirm/Cancel buttons. Emits `dj-confirm` / `dj-cancel`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open | `boolean` | `false` |
| `confirmLabel` | confirm-label | `string` | — |
| `cancelLabel` | cancel-label | `string` | — |

**Slots:** default, `content`

**Events:** `dj-confirm`, `dj-cancel`


### `<dj-context-menu>` · `@dojo-ng/context-menu`

Right-click the trigger (default slot) to open a menu of `options`; emits `dj-select` with the value.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `options` | options | `ListOption[]` | `[]` |

**Slots:** default

**Events:** `dj-select`


### `<dj-dialog>` · `@dojo-ng/dialog`

A modal dialog. Slots: `title`, default (content), `actions`. Locks body scroll while open, closes on Escape and the close button, and on underlay click unless `modal`. `role="alertdialog"` is always modal. Restores focus to the previously focused element on close. Emits `dj-close`. Parts: `underlay`, `dialog`, `title`, `close`, `content`, `actions`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open ↻ | `boolean` | `false` |
| `closeable` | closeable | `boolean` | `true` |
| `modal` | modal | `boolean` | `false` |
| `underlay` | underlay | `boolean` | `true` |
| `role` | role ↻ | `"dialog" \| "alertdialog"` | `"dialog"` |
| `closeText` | close-text | `string` | — |

**Slots:** `title`, default (content), `actions`

**Parts:** `underlay`, `dialog`, `title`, `close`, `content`, `actions`

**Events:** `dj-close`

**Methods:** `close()`

**CSS properties:** `--dj-dialog-z-index` (default `941`; Stacking order of the dialog.), `--dj-dialog-underlay-z-index` (default `940`; Stacking order of the dialog underlay (scrim).)


### `<dj-slide-pane>` · `@dojo-ng/slide-pane`

A panel that slides in from an edge. Slots: `title`, default (content). Closes on Escape, the close button, and underlay click. Locks body scroll while open. Emits `dj-close`. Width/height comes from `width` (px). Parts: `underlay`, `pane`, `title`, `close`, `content`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open ↻ | `boolean` | `false` |
| `align` | align ↻ | `SlidePaneAlign` | `"left"` |
| `width` | width | `number` | `320` |
| `underlay` | underlay | `boolean` | `true` |
| `closeText` | close-text | `string` | — |

**Slots:** `title`, default (content)

**Parts:** `underlay`, `pane`, `title`, `close`, `content`

**Events:** `dj-close`

**Methods:** `close()`

**CSS properties:** `--dj-slide-pane-size` (default `320px`; Width (left/right) or height (top/bottom) of the pane.), `--dj-slide-pane-z-index` (default `931`; Stacking order of the pane.), `--dj-slide-pane-underlay-z-index` (default `930`; Stacking order of the pane underlay (scrim).)


### `<dj-tooltip>` · `@dojo-ng/tooltip`

Shows tip content next to its trigger on hover/focus. The trigger goes in the default slot, the tip in the `content` slot. Set `open` to force it shown.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open | `boolean` | `false` |
| `orientation` | orientation ↻ | `TooltipOrientation` | `"top"` |

**Slots:** default, `content`

**Parts:** `content`

**CSS properties:** `--dj-tooltip-z-index` (default `950`; Stacking order of the tooltip.)


### `<dj-snackbar>` · `@dojo-ng/snackbar`

A toast. `open` shows it; `type` success/error tints; slots: default (message), `actions`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open | `boolean` | `false` |
| `type` | type | `"success"\|"error"` | — |
| `leading` | leading | `boolean` | `false` |
| `stacked` | stacked | `boolean` | `false` |

**Slots:** default, `actions`

**CSS properties:** `--dj-snackbar-z-index` (default `960`; Stacking order of the snackbar.)


## Layout


### `<dj-card>` · `@dojo-ng/card`

Content container. Slots: `header`, default (content), `actions`. Optional `title`/`subtitle`/`media-src`. `clickable` makes the body a button. Parts: `root`, `media`, `body`, `actions`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `kind` | kind ↻ | `"elevated" \| "outlined"` | `"elevated"` |
| `square` | square | `boolean` | `false` |
| `title` | title | `string` | `""` |
| `subtitle` | subtitle | `string` | `""` |
| `mediaSrc` | media-src | `string` | — |
| `mediaTitle` | media-title | `string` | — |
| `clickable` | clickable | `boolean` | `false` |

**Slots:** `header`, default (content), `actions`

**Parts:** `root`, `media`, `body`, `actions`


### `<dj-header-card>` · `@dojo-ng/header-card`

A `<dj-card>` with a header row (avatar + title/subtitle). Slots: `avatar`, default (content), `actions`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `title` | title | `string` | `""` |
| `subtitle` | subtitle | `string` | `""` |
| `kind` | kind | `"elevated" \| "outlined"` | `"elevated"` |

**Slots:** `avatar`, default (content), `actions`


### `<dj-stack>` · `@dojo-ng/stack`

Flex layout. direction/align/spacing/padding/stretch.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `direction` | direction | `"vertical"\|"horizontal"` | `"vertical"` |
| `align` | align | `"start"\|"middle"\|"end"` | — |
| `spacing` | spacing | `"small"\|"medium"\|"large"` | `"medium"` |
| `padding` | padding | `"small"\|"medium"\|"large"` | — |
| `stretch` | stretch | `boolean` | `false` |

**Slots:** default


### `<dj-split-panel>` · `@dojo-ng/split-panel`

Two resizable panes with a draggable divider between them.

Put the panes in the `start` and `end` slots. `position` is the start pane's share of the space, as a percent from 0 to 100. The host needs a size, because the panes fill it: for a horizontal split, give it a height.

#### Layout

- `orientation="horizontal"` (the default) puts the panes side by side with a vertical divider. `vertical` stacks them with a horizontal divider.
- The panes always divide in the ratio `position` : (100 − `position`).
- Minimum pane sizes come from CSS, not from properties: set `--dj-split-panel-min-start` and `--dj-split-panel-min-end` in any length unit, and dragging stops at that size.
- The order follows the writing direction, so in a right-to-left page the start pane is on the right with no extra work.
- The divider bar is drawn by the component. Put custom grip content in the optional `divider` slot.
- For three panes, nest a second `dj-split-panel` inside a slot of the first.

#### Resizing

- Drag the divider with a mouse, a trackpad, or touch.
- Or focus the divider and use the keyboard, so resizing never requires dragging (WCAG 2.5.7): the arrow keys move it by 1 (Shift: by 10), Home moves it to 0, and End to 100. A horizontal split uses Left and Right in the reading direction; a vertical split uses Up and Down.
- `dj-reposition` fires when the split settles: once when a drag ends, and once per key press.

#### Accessibility

- The divider has `role="separator"`, with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` tracking `position`.
- Its `aria-orientation` is the divider's own direction, so a horizontal split has a vertical separator.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `orientation` | orientation ↻ | `"horizontal" \| "vertical"` | `"horizontal"` |
| `position` | position ↻ | `number` | `50` |
| `disabled` | disabled ↻ | `boolean` | `false` |

**Slots:** `start`, `divider`, `end`

**Parts:** `start`, `end`, `divider`

**Events:** `dj-reposition` (detail `{ position }`)

**CSS properties:** `--dj-split-panel-min-start` (default `0`; Minimum size of the start pane (any length).), `--dj-split-panel-min-end` (default `0`; Minimum size of the end pane (any length).), `--dj-split-panel-divider-width` (default `4px`; Thickness of the divider bar.), `--dj-split-panel-divider-color` (default `var(--dj-color-border)`; Divider bar color.)


### `<dj-two-column-layout>` · `@dojo-ng/two-column-layout`

Leading + trailing slots; collapses to one column on narrow containers (container query).

| Property | Attribute | Type | Default |
|---|---|---|---|
| `bias` | bias | `"leading"\|"trailing"` | — |

**Slots:** `leading`, `trailing`

**Parts:** `leading`, `trailing`


### `<dj-three-column-layout>` · `@dojo-ng/three-column-layout`

Leading/center/trailing slots; collapses on narrow containers.

**Slots:** `leading`, `center`, `trailing`

**Parts:** `leading`, `center`, `trailing`


### `<dj-title-pane>` · `@dojo-ng/title-pane`

A collapsible panel with a title bar. Content goes in the default slot. Click the title (when `closeable`) to toggle; emits `dj-toggle` with `{ open }`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `name` | name | `string` | `""` |
| `open` | open ↻ | `boolean` | `false` |
| `closeable` | closeable | `boolean` | `true` |
| `headingLevel` | heading-level | `number` | — |

**Slots:** default

**Parts:** `title`, `button`, `content`

**Events:** `dj-toggle`


### `<dj-accordion>` · `@dojo-ng/accordion`

Coordinates slotted `<dj-title-pane>` children. With `exclusive`, opening one pane closes the others. Listens for each pane's `dj-toggle`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `exclusive` | exclusive | `boolean` | `false` |

**Slots:** default


### `<dj-carousel>` · `@dojo-ng/carousel`

A slotted, swipeable carousel. Each top-level element in the default slot is one item: a card, an image, a tile, or any other content.

Swiping is native scrolling. The item strip is a horizontal scroll container with CSS scroll-snap, so touch and trackpad work with no drag code, and the prev/next buttons give a way to move that needs no dragging (WCAG 2.5.7). Give the carousel a `label` so the region has an accessible name.

#### Layout

- `per-view` shows that many items at once, sized to fit with the gap between them.
- `dots` adds one dot per page. With `per-view` above 1, the last items cannot start a page, so the number of pages is items − `per-view` + 1.
- `nav` (on by default) shows prev/next buttons. They are disabled at the first and last page; the carousel does not loop.

#### Moving between items

- `next()`, `previous()`, and `goTo(index)` scroll smoothly to the item.
- Under `prefers-reduced-motion`, the carousel jumps to the item instead of scrolling.
- `dj-slide-change` fires when the current item changes, from swiping, a button, a key, or a method call.

#### Accessibility

- The carousel follows the APG carousel pattern. The region has `aria-roledescription="carousel"` and the `label` as its name.
- Each item gets `role="group"`, `aria-roledescription="slide"`, and an "{n} of {total}" label. These update when items are added or removed and when the locale changes.
- With the strip focused, ArrowRight and ArrowLeft move forward and back in the reading direction, so they also work in right-to-left pages.

#### Not built

- Looping, autoplay (an accessibility problem), and vertical orientation.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

| Property | Attribute | Type | Default |
|---|---|---|---|
| `perView` | per-view | `number` | `1` |
| `nav` | nav | `boolean` | `true` |
| `dots` | dots | `boolean` | `false` |
| `label` | label | `string` | — |

**Slots:** default (each top-level element is one carousel item)

**Parts:** `viewport` (the scroller), `prev`, `next`, `dots`, `dot`

**Events:** `dj-slide-change` (detail `{ index }`)

**Methods:** `next()`, `previous()`, `goTo(index: number)`

**CSS properties:** `--dj-carousel-gap` (default `1rem`; Gap between items (also subtracted from the per-view basis).)


## Navigation


### `<dj-breadcrumb-group>` · `@dojo-ng/breadcrumb-group`

A breadcrumb trail from `items`. Part: `list`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `items` | items | `Crumb[]` | `[]` |

**Parts:** `list`


### `<dj-header>` · `@dojo-ng/header`

App header bar. `sticky` pins it. Slots: `leading`, default (title), `trailing`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `sticky` | sticky | `boolean` | `false` |

**Slots:** `leading`, default (title), `trailing`

**CSS properties:** `--dj-header-z-index` (default `700`; Stacking order of the header.)


### `<dj-toolbar>` · `@dojo-ng/toolbar`

A horizontal action bar with `role="toolbar"`.

#### Layout

- The `leading` slot holds a logo or a menu or back button.
- The default slot holds the title or other content.
- The `actions` slot holds the primary action buttons, aligned to the end.
- `sticky` pins the bar to the top.

#### Overflow menu

- Set the `overflow` property to a list of options to put secondary actions in a menu. A `⋮` button opens them in a popup `<dj-list>`.
- Choosing one emits `dj-action` with its value.
- The menu closes when an item is chosen, on Escape, on a click outside, and when focus leaves it.

#### Not built

- Moving slotted actions into the menu automatically when space runs out. For now your app decides which actions are primary and which go in `overflow`.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

| Property | Attribute | Type | Default |
|---|---|---|---|
| `label` | label | `string` | — |
| `sticky` | sticky ↻ | `boolean` | `false` |
| `overflow` | — | `ListOption[]` | `[]` |
| `overflowPosition` | overflow-position ↻ | `PopupPosition` | `"below"` |

**Slots:** `leading` (a logo, or a menu or back button.), default (the title or other content.), `actions` (the primary action buttons, aligned to the end.)

**Parts:** `bar`, `leading`, `title`, `actions`, `overflow`

**Events:** `dj-action` (detail: `{ value }`)


### `<dj-pagination>` · `@dojo-ng/pagination`

Page navigation over `total` pages. Emits `dj-page` with the new page. Parts: `nav`, `page`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `total` | total | `number` | `1` |
| `page` | page | `number` | `1` |
| `siblingCount` | sibling-count | `number` | `1` |

**Parts:** `nav`, `page`

**Events:** `dj-page`


### `<dj-tab-container>` · `@dojo-ng/tab-container`

Tabbed interface. `tabs` describes the buttons; the panels are slotted children in the same order (one per tab). The active panel is shown, the rest hidden. ARIA tablist/tab/tabpanel with roving arrow/Home/End keyboard. Local coordination of slotted panels — no store needed.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `tabs` | tabs | `TabItem[]` | `[]` |
| `activeIndex` | active-index ↻ | `number` | `0` |
| `alignButtons` | align-buttons ↻ | `"top" \| "bottom" \| "left" \| "right"` | `"top"` |

**Slots:** default

**Parts:** `tablist`, `tab`, `panels`

**Events:** `change` (detail: active index), `dj-tab-close` (detail: index)


### `<dj-wizard>` · `@dojo-ng/wizard`

Step progress indicator. `steps` describes each step; `active-step` derives statuses (before=complete, at=inProgress, after=pending) unless a step sets its own. When `clickable`, clicking a step emits `dj-step` with its index. Part: `step`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `steps` | steps | `Step[]` | `[]` |
| `activeStep` | active-step | `number` | — |
| `direction` | direction ↻ | `"horizontal" \| "vertical"` | `"horizontal"` |
| `clickable` | clickable | `boolean` | `false` |

**Parts:** `step`

**Events:** `dj-step`


### `<dj-speed-dial>` · `@dojo-ng/speed-dial`

A FAB that reveals slotted action buttons (`actions` slot) when open. Toggles on click. `direction` controls where actions expand. Emits `dj-toggle` {open}.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `open` | open | `boolean` | `false` |
| `direction` | direction | `"up"\|"down"\|"left"\|"right"` | `"up"` |

**Slots:** `actions`

**Events:** `dj-toggle`


### `<dj-tree>` · `@dojo-ng/tree`

A hierarchical tree built from `nodes`.

The tree knows nothing about what it shows: a file tree, a mail folder list, and a MIME structure are all just nodes. Each node can carry an `icon` (a name registered with `registerIcon` or `registerIcons` from `@dojo-ng/icon`) and a `count`, shown as a trailing badge such as an unread count.

#### Selection and expansion

- Both are controlled. `value` is the selected node id, and the tree emits `dj-select`.
- `expanded` is the array of open node ids, and the tree emits `dj-expand-change`.
- Clicking a row selects it; clicking the chevron expands or collapses it.
- Set `expand-on-row-click` to make a click on a parent row also expand or collapse it. Use it when some rows exist only to hold others, so a click on them does something visible.

#### Keyboard

The tree follows the APG tree pattern. Only one row is a tab stop: the selected row if it is visible, otherwise the first visible row. The arrow keys move focus without selecting.

- Down and Up move through the visible rows.
- Right expands a closed parent, moves into an open one, and does nothing on a leaf.
- Left collapses an open parent, or moves to the parent row.
- Home and End jump to the first and last visible row.
- Enter or Space selects the focused row.

#### Right-to-left

- Indentation uses `margin-inline-start`, so it flips in a right-to-left page, and the chevron points in the reading direction.

#### Not built

- Drag and drop, virtualization, checkboxes, and lazy loading.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

| Property | Attribute | Type | Default |
|---|---|---|---|
| `nodes` | nodes | `TreeNode[]` | `[]` |
| `value` | value | `string` | `""` |
| `expanded` | expanded | `string[]` | `[]` |
| `expandOnRowClick` | expand-on-row-click ↻ | `boolean` | `false` |

**Slots:** `none` (content comes from `nodes`)

**Parts:** `row` (a node's clickable line), `chevron`, `label`, `count`

**Events:** `dj-expand-change` (detail `{ id, expanded, expandedIds }`), `dj-select` (detail `{ id }`)

**CSS properties:** `--dj-tree-indent` (default `1.1rem`; Indentation added per nesting level.), `--dj-tree-count-color` (default `var(--dj-color-text-muted)`; Color of the trailing count badge.)


### `<dj-nav>` · `@dojo-ng/nav`

A navigation landmark that collapses into a button and a panel when there is not enough room.

This is the "hamburger menu" or "navicon" pattern. A menu button that stays collapsed on a wide desktop screen is a normal use too, not only a mobile layout. Put the links in the default slot as plain `<a>` elements.

#### When it collapses

- By default the nav collapses when its container is narrower than 45rem.
- To change that, set the `--dj-nav-collapsed` custom property on the element: 1 collapses, 0 expands. Because it is a theme token, not a breakpoint property, it can depend on the container: a nav in a narrow sidebar collapses even on a wide screen.
- The component checks again when its own size changes. After a change that does not resize it, such as a theme switch or a media query on the viewport, call `refresh()`.
- Only one arrangement is in the DOM at a time: the plain `<nav>` when expanded, or the button (and, while open, a panel around the same `<nav>`) when collapsed.

#### The panel

- `panel="drawer"` (the default) uses `<dj-slide-pane>`, which opens from the side of the reading direction.
- `panel="dropdown"` and `panel="overlay"` are drawn inside the component itself.
- `dj-nav-toggle` fires when the panel opens or closes, and `dj-nav-collapse` when the arrangement changes.

#### Accessibility

- This is a disclosure, not a menu (in APG terms): the links stay plain links in a `<nav>`, and the button has no `aria-haspopup`.

#### Not built

- Toolbar-style overflow, which shows what fits and moves the rest into a menu. That is a separate component.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

| Property | Attribute | Type | Default |
|---|---|---|---|
| `label` | label | `string` | — |
| `open` | open ↻ | `boolean` | `false` |
| `panel` | panel ↻ | `"drawer" \| "dropdown" \| "overlay"` | `"drawer"` |
| `triggerLabel` | trigger-label | `string` | — |
| `collapsed` | collapsed ↻ | `boolean` | `false` |

**Slots:** default (the links — plain `<a>` elements), `trigger`

**Parts:** `trigger`, `panel`, `nav`

**Events:** `dj-nav-collapse` (detail `{ collapsed }`), `dj-nav-toggle` (detail `{ open }`)

**Methods:** `show()`, `hide()`, `toggle()`, `refresh()` (Delegates to `TokenFlagController` — the escape hatch for a runtime pin or theme switch that `ResizeObserver` cannot see (it only sees size changes).)


## Data display


### `<dj-board>` · `@dojo-ng/board`

A Kanban board over plain records.

Cards are the records in `data`. Lanes are the values of one field, named by `group-by`. Within a lane, cards keep their order in `data`.

#### Moving cards

- The board is controlled: it never changes `data`. Every move emits `dj-card-move`, and your app applies it and assigns the new array. The exported `applyCardMove` does that in one line.
- When the new data arrives, focus follows the moved card and the move is announced to assistive technology.
- Cards move with the move menu or the keyboard. Set `draggable` to also allow pointer and touch drag between lanes. Drag is an extra: the menu and the keyboard stay available, so dragging is never the only way to move a card.

#### Lanes and cards

- Set `lanes` explicitly when you can. It fixes the lane order, gives each lane a label, and shows empty lanes. Without it, lanes come from the values found in `data`.
- `renderCard` supplies the card content. The board draws it inside its own accessible card shell, so a custom card cannot break accessibility. Without `renderCard`, each card is a `dj-card` showing the `card-title` field.
- Work-in-progress limits are advisory: the lane shows a count such as `3/5` and gets a style hook when it is over the limit, but moves are never blocked.

#### Keyboard

The board is one tab stop.

- The arrow keys move between cards and lanes; Home and End move within a lane.
- Enter activates the card.
- Space or M opens the move menu.
- Ctrl+arrow (Cmd+arrow on a Mac) moves the card itself.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `data` | — | `Card[]` | `[]` |
| `lanes` | — | `BoardLane[]` | `[]` |
| `groupBy` | group-by | `string` | `"status"` |
| `cardKey` | card-key | `string` | `"id"` |
| `cardTitle` | card-title | `string` | `"title"` |
| `label` | label | `string` | — |
| `renderCard` | — | `(card: Card) => TemplateResult` | — |
| `draggable` | draggable ↻ | `boolean` | `false` |

**Slots:** `none` (cards come from `data`)

**Parts:** `board`, `lane`, `lane-over`, `lane-header`, `lane-title`, `lane-count`, `lane-body`, `card`, `move-button`, `lane${over`, `?`

**Events:** `dj-card-move` (detail `{ card, key, from, to, fromIndex, toIndex }`; the board never
applies it itself), `dj-card-click` (detail `{ card, key }`)

**Methods:** `effectiveLanes(): BoardLane[]` (The lanes to display: the `lanes` property, or distinct `group-by` values in data order.)


### `<dj-list>` · `@dojo-ng/list`

A single-select list, or a menu, built from `options`.

Coming from Dojo's Listbox? Use this component: it has the listbox role and keyboard model that Listbox had. The list is form-associated and submits `value`.

#### Keyboard

The list is one tab stop (the active-descendant pattern).

- The arrow keys, Home, and End move the active item.
- Enter or Space selects it.

#### Options

- `menu` switches the roles to `menu` and `menuitem`.
- `loading` shows a spinner.

#### Reordering

- With `reorderable`, items can be dragged with a pointer or touch, or moved with the keyboard: Space to grab, the arrow keys to move, Space to drop, and Escape to cancel.
- Reordering is controlled: the list emits `dj-reorder`, and you reorder `options`.

#### Not built

- Virtualization for very long lists.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

| Property | Attribute | Type | Default |
|---|---|---|---|
| `options` | options | `ListOption[]` | `[]` |
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `menu` | menu | `boolean` | `false` |
| `loading` | loading | `boolean` | `false` |
| `reorderable` | reorderable ↻ | `boolean` | `false` |

**Parts:** `list`, `item`, `drop-indicator`

**Events:** `change`, `dj-reorder`

**Methods:** `checkValidity(): boolean`, `focus(options: FocusOptions)`, `moveActive(delta: 1 | -1)` (Move the highlighted (active) option by one selectable step, wrapping; skips disabled items and dividers.), `activateFirst()` (Highlight the first selectable option (skipping disabled items and dividers); clears the highlight if none.), `chooseActive(): boolean` (Select the active option, firing the normal `change`. Returns false and fires nothing if none is active.)


### `<dj-grid>` · `@dojo-ng/grid`

A data grid from `columns` + `rows`. Click a sortable header to sort (emits `dj-sort`). Functional core: no virtualization, paging, editing, or column resize yet. Part: `table`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `columns` | columns | `GridColumn[]` | `[]` |
| `rows` | rows | `Record<string, unknown>[]` | `[]` |

**Parts:** `table`

**Events:** `dj-sort`


### `<dj-data-grid>` · `@dojo-ng/data-grid`

A virtualized, sortable, selectable data grid built on TanStack Table and TanStack Virtual.

Give it `columns`, `data`, and a `height`. The core covers columns, in-memory data, sorting, virtual rows, row selection, keyboard row navigation, and calculated columns (`GridColumn.compute`). Everything else is a plugin. The grid has ARIA role `grid`.

#### Plugins

- Filtering, pagination, inline editing, tree rows, grouping, CSV export, and master-detail are plugins. Pass an array of plugin objects to the `plugins` property, from JavaScript only.
- A recommended order: one structural plugin first (`treePlugin` or `groupsPlugin`, never both), then `editPlugin`, `cellComponentsPlugin`, and `formatsPlugin`, then the plugins that only add controls (`filterPlugin`, `paginationPlugin`, `exportPlugin`, `detailPlugin`).
- Changing `plugins` rebuilds the table, so set it once, early.

#### Opening rows: `activation`

`activation` decides what a plain click or Enter means on a row.

- `"none"` (the default): click, Space, and Enter all toggle selection.
- `"click"` (the mail and preview-pane idiom) or `"double"` (the file-manager idiom): a plain click, or a double click, opens the row and emits `dj-activate` with `{ row, index }`, where `row` is the original row data. Selection does not change.
- With activation on, Enter opens the row and Space selects it.
- Modifier clicks always select and never open: Ctrl or Cmd-click toggles a row, and Shift-click selects a range.
- `"double"` uses the browser's own `dblclick`, so the two clicks inside a double click never open the row on their own.
- Activation works with any `selection-mode`, including `"none"`, so a read-only list can have clickable rows.
- To open rows by clicking while the user also builds a set for bulk actions, combine `activation="click"`, `selection-mode="multiple"`, and the checkbox column from `@dojo-ng/data-grid-select`.

#### Rendered rows: `dj-range-change`

- `dj-range-change` fires when the window of rendered rows moves, so you can load data in and out, or load more at the end of the list.
- The detail is `{ start, end, count, rendered }`: the first and last rendered row index (inclusive), the total number of rows, and the list of rendered indexes.
- The range includes the 8 extra rows the grid renders beyond each edge of the viewport. It is what the grid has rendered, not what the user can see, so fetching this range never leaves a gap.
- To load more at the end: `if (e.detail.end >= e.detail.count - 1) loadMore()`.
- When nothing is rendered, `start` and `end` are -1 and `count` is the real count.
- The event fires after rendering and only when `(start, end, count)` changes, so setting `data` in the handler is safe.

#### Printing

- When the page is printed, every row becomes part of a real `<table>` with a `<thead>`, and browsers repeat the header on each printed page. This does not apply to rows drawn by the detail plugin (`@dojo-ng/data-grid-detail`).
- Safari does not repeat the table header on each printed page. This is a WebKit limitation with no reliable CSS fix.

#### Not supported yet

- A data set larger than `data`: the scrollbar is sized from `data.length`, so it cannot include rows that are not loaded.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

| Property | Attribute | Type | Default |
|---|---|---|---|
| `columns` | columns | `GridColumn[]` | `[]` |
| `data` | data | `Row[]` | `[]` |
| `selectionMode` | selection-mode ↻ | `SelectionMode` | `"none"` |
| `activation` | activation ↻ | `ActivationMode` | `"none"` |
| `rowHeight` | row-height | `number` | `36` |
| `height` | height | `string` | `"20rem"` |
| `plugins` | — | `DataGridPlugin[]` | `[]` |

**Parts:** `grid`, `head`, `row`, `cell`, `chrome-top`, `chrome-bottom`, `subhead`, `detail`

**Events:** `dj-sort`, `dj-selection-change`, `dj-range-change` (detail `{ start, end, count, rendered }` — inclusive
first and last rendered row-model indices, the total row count, and the full index list; `start`
and `end` are -1 when nothing is rendered), `dj-activate` (detail `{ row, index }`, where `row` is
the original row data)

**Methods:** `toggleAt(index: number)`, `activateAt(index: number)` (Emit `dj-activate` for a row-model index. Fires regardless of `selectionMode` (a read-only list with clickable rows is a real case) but never under `activation="none"`.)


### `<dj-calendar>` · `@dojo-ng/calendar`

A form-associated month-grid date picker. `value` is an ISO date (yyyy-mm-dd). Localizes month and weekday names via Intl (set `locale`). Keyboard: arrows move by day/week, PageUp/PageDown change month, Enter/Space select. `min`/`max` (ISO) bound selection. Composes `<dj-icon>` for navigation.

Functional core; year-picker popup and range selection are deferred. Parts: `header`, `grid`, `day`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `min` | min | `string` | — |
| `max` | max | `string` | — |
| `locale` | locale | `string` | — |
| `firstDayOfWeek` | first-day-of-week | `number` | `0` |

**Parts:** `header`, `grid`, `day`

**Events:** `change`

**Methods:** `checkValidity(): boolean`


### `<dj-avatar>` · `@dojo-ng/avatar`

Circular/rounded/square avatar from an image `src` or slotted initials/icon. Part: `base`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `type` | type ↻ | `"circle" \| "square" \| "rounded"` | `"circle"` |
| `size` | size ↻ | `"small" \| "medium" \| "large"` | `"medium"` |
| `src` | src | `string` | — |
| `alt` | alt | `string` | — |
| `secondary` | secondary ↻ | `boolean` | `false` |
| `outline` | outline ↻ | `boolean` | `false` |

**Slots:** default

**Parts:** `base`


### `<dj-badge>` · `@dojo-ng/badge`

A small count or status label that decorates other content.

Put the content in the default slot. Set `variant` for the color and `pill` for fully rounded ends.

#### Accessibility

- A badge is presentational and has no ARIA role.
- When a badge shows a count for a control, such as an unread count on a button, put the accessible name on the control, not on the badge: `aria-label="Notifications, 4 unread"`. Assistive technology then reads the meaning, not a bare number.

#### Colors

- Each variant uses the theme's semantic `--dj-color-*-600` scale.
- To change one badge, set `--dj-badge-background` and `--dj-badge-color` on it.

Content is the default slot.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `variant` | variant ↻ | `BadgeVariant` | `"neutral"` |
| `pill` | pill ↻ | `boolean` | `false` |

**Slots:** default

**Parts:** `base` (the badge box)

**CSS properties:** `--dj-badge-background` (default `per-variant semantic color`; Background fill; defaults to the variant's `--dj-color-*-600` scale.), `--dj-badge-color` (default `var(--dj-color-neutral-0)`; Text color.), `--dj-badge-radius` (default `var(--dj-input-border-radius-small)`; Corner radius (ignored when `pill` is set).), `--dj-badge-font-size` (default `0.75rem`; Badge text size.)


### `<dj-chip>` · `@dojo-ng/chip`

Compact label/tag. Label in the default slot, optional icon in the `icon` slot. `clickable` wraps the body in a real `<button>` (native Enter/Space; the click bubbles from the host); `closeable` shows a separate close `<button>` that emits `dj-close`. The two are siblings, never nested, so a clickable + closeable chip stays valid ARIA. Parts: `root`, `action`, `close`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `disabled` | disabled ↻ | `boolean` | `false` |
| `checked` | checked ↻ | `boolean` | `false` |
| `clickable` | clickable | `boolean` | `false` |
| `closeable` | closeable | `boolean` | `false` |
| `closeLabel` | close-label | `string` | — |

**Slots:** `icon`, default

**Parts:** `root`, `action`, `close`

**Events:** `dj-close`


### `<dj-icon>` · `@dojo-ng/icon`

A presentational icon.

Supply a glyph in one of two ways: set `type` to the name of an icon registered with `registerIcon` or `registerIcons`, or slot an inline `<svg>`.

#### Accessibility

- Set `alt-text` when the icon carries meaning. It becomes the accessible name.
- Without `alt-text`, the icon is hidden from assistive technology (`aria-hidden`).

#### SVG requirements

- A registered SVG must have a `viewBox`. dj-icon sizes a glyph by stretching it to fill the icon box, and an `<svg>` scales its artwork only when it has a `viewBox`.
- An SVG without a `viewBox` gets a box of the right size, but its artwork is clipped or not scaled. `registerIcon` and `registerIcons` log one console warning for each such icon, and they do not change the SVG.
- dj-icon's own sizing overrides any `width` or `height` attributes on a registered SVG.
- A slotted inline `<svg>` follows the same rules.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `type` | type | `string` | `""` |
| `size` | size ↻ | `IconSize` | — |
| `altText` | alt-text | `string` | — |

**Slots:** default

**Parts:** `base`

**CSS properties:** `--dj-icon-color` (default `currentColor`; Icon color.)


### `<dj-result>` · `@dojo-ng/result`

A status/result block with an icon, title, subtitle, content, and actions. `status` (success|error|alert|info) sets a default icon + color; override via the `icon` slot. Slots: `icon`, default (content), `actions`. Parts: `root`, `status`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `title` | title | `string` | `""` |
| `subtitle` | subtitle | `string` | `""` |
| `status` | status ↻ | `"alert" \| "error" \| "info" \| "success"` | — |

**Slots:** `icon`, default (content), `actions`

**Parts:** `root`, `status`


### `<dj-text>` · `@dojo-ng/text`

Typographic wrapper. size/weight/uppercase/truncated/inverse. Part: `base`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `size` | size | `"x-small"\|"small"\|"medium"\|"large"\|"x-large"\|"xx-large"` | `"medium"` |
| `weight` | weight | `"light"\|"normal"\|"heavy"` | `"normal"` |
| `inverse` | inverse | `boolean` | `false` |
| `truncated` | truncated | `boolean` | `false` |
| `uppercase` | uppercase | `boolean` | `false` |

**Slots:** default

**Parts:** `base`


## Charts


### `<dj-chart>` · `@dojo-ng/chart`

A themeable, accessible SVG chart.

Set `data` (an array of rows) and `series`. The chart is built on D3's scales and shapes, but the SVG is real DOM owned by the component, so you can theme it with `--dj-*` tokens and `::part()`, and assistive technology can read it. It is not a form control.

#### Chart types

`type` selects the mark:

- Cartesian (`line`, `area`, `bar`) reads `category-key` for the x axis.
- X/Y (`scatter`, `bubble`) reads `x-key` for a numeric x, and `size-key` for the bubble radius.
- Radial (`pie`, `donut`) draws one series as slices by category.
- `stacked` stacks bars and areas. A series can override `type` to make a combination chart.

#### Interaction

- `legend-toggle` lets users show and hide a series from its legend item.
- `brush` adds an overview strip below a cartesian chart for choosing the visible range of categories. Double-click the strip to reset it.

#### Live data

- `appendData()` adds rows without rebuilding the `data` array, for cheap live updates. `max-points` limits how many rows it keeps.

#### Sizing

- The chart fills its container's width and takes its height from `--dj-chart-height` (default `18rem`). Set that property to resize it.
- A fixed `height` on a wrapper element does not limit the chart, and a wrapper shorter than the chart lets the legend overflow. The legend sits below the plot, inside that height.

#### Accessibility

- A visually hidden data table is the accessible equivalent of the chart.
- The chart has `role="img"` and a generated summary.
- Animation follows `prefers-reduced-motion`.
- The series colors are the `--dj-chart-1` to `--dj-chart-8` tokens.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `data` | — | `ChartDatum[]` | `[]` |
| `series` | — | `ChartSeries[]` | `[]` |
| `categoryKey` | category-key | `string` | `""` |
| `type` | type ↻ | `ChartType` | `"line"` |
| `orientation` | orientation ↻ | `"vertical" \| "horizontal"` | `"vertical"` |
| `stacked` | stacked | `boolean` | `false` |
| `showLegend` | show-legend | `boolean` | `true` |
| `showGrid` | show-grid | `boolean` | `true` |
| `xLabel` | x-label | `string` | — |
| `yLabel` | y-label | `string` | — |
| `yLabelRight` | y-label-right | `string` | — |
| `label` | label | `string` | — |
| `markers` | markers | `boolean` | `false` |
| `xKey` | x-key | `string` | `""` |
| `sizeKey` | size-key | `string` | — |
| `innerRadius` | inner-radius | `number` | — |
| `centerLabel` | center-label | `string` | — |
| `centerSubLabel` | center-sub-label | `string` | — |
| `legendToggle` | legend-toggle | `boolean` | `false` |
| `brush` | brush | `boolean` | `false` |
| `numberFormat` | — | `Intl.NumberFormatOptions` | — |
| `formatY` | — | `(value: number) => string` | — |
| `formatX` | — | `(category: string) => string` | — |
| `maxPoints` | max-points | `number` | `0` |
| `renderer` | renderer ↻ | `ChartRenderer` | `"svg"` |
| `missing` | missing ↻ | `MissingMode` | `"gap"` |
| `pointLabels` | point-labels | `boolean` | `false` |
| `formatPoint` | — | `(value: number, row: ChartDatum, series: ChartSeries) => string` | — |
| `yScale` | y-scale ↻ | `ScaleKind` | `"linear"` |
| `yScaleRight` | y-scale-right ↻ | `ScaleKind` | `"linear"` |
| `plugins` | — | `ChartPlugin[]` | `[]` |

**Parts:** `plot`, `axis`, `grid`, `series`, `bar`, `line`, `point`, `slice`, `legend`, `legend-item`, `brush-handle`, `tooltip`, `plot-canvas`, `center-label`, `center-sub-label`, `point-labels`, `point-label`

**Events:** `dj-legend-toggle` (detail `{ key, hidden }`), `dj-hover` (detail `{ category }` or `null`; cartesian and radial)

**Methods:** `appendData(rows: ChartDatum[])` (Append rows without rebuilding `data` yourself: cheap live updates for streaming sources. Multiple calls within the same animation frame coalesce into a single `data` assignment. Trims from the front to `max-points` when set, and clears an active brush selection (its indices are into the pre-append data and would otherwise point at the wrong window).), `toSvg(): string` (Serializes the current plot as a standalone SVG string: presentational styles inlined (no external stylesheet or theme tokens needed to render it correctly elsewhere) and, when the canvas renderer is actually in effect (`effectiveRendererNow`, never the raw `renderer` property — they differ whenever a fallback applies, and a chart that asked for canvas but fell back must not get an empty bitmap composited over it), its drawn bitmap composited in at the same position and stacking it renders on screen. `""` when the chart isn't {@link ready} (no data, zero measured size) — the same gate `render()` uses for its placeholder.), `toPng(scale): Promise<Blob>` (Rasterizes {@link toSvg}'s output to a PNG `Blob` at `scale`× (default 2, for retina and for print). Rejects if the chart isn't {@link ready} ({@link toSvg} would return `""`).)

**CSS properties:** `--dj-chart-height` (default `18rem`; Overall chart height (width fills the container).), `--dj-chart-label-size` (default `0.6875rem`; Point-label font size.), `--dj-chart-label-color` (Point-label text color; defaults to `--dj-color-text`.), `--dj-chart-label-halo` (Point-label halo stroke; defaults to `--dj-color-background`.), `--dj-chart-1` (default `#2563eb`; Categorical series color 1.), `--dj-chart-2` (default `#16a34a`; Categorical series color 2.), `--dj-chart-3` (default `#d97706`; Categorical series color 3.), `--dj-chart-4` (default `#dc2626`; Categorical series color 4.), `--dj-chart-5` (default `#7c3aed`; Categorical series color 5.), `--dj-chart-6` (default `#0891b2`; Categorical series color 6.), `--dj-chart-7` (default `#db2777`; Categorical series color 7.), `--dj-chart-8` (default `#65a30d`; Categorical series color 8.)


### `<dj-sparkline>` · `@dojo-ng/chart`

A tiny inline chart of one numeric series, with no axes, grid, legend, tooltip, or margins.

`data` is a plain array of numbers. For a full chart with axes and interaction, use `<dj-chart>`: the sparkline shares its math but is a separate, much smaller component.

#### Live data

- `push()` appends one or more values without rebuilding `data`, for cheap live updates. `max-points` limits how many values it keeps.

#### Accessibility

- With a `label`, the sparkline has `role="img"`, that name, and a generated summary ("N points, min X, max Y, last Z") in the page's locale.
- Without a `label` it is `aria-hidden`. That is the common case, when text next to it already states the value, as in a row of key figures with a trend beside each number.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `data` | — | `number[]` | `[]` |
| `type` | type ↻ | `SparklineType` | `"line"` |
| `label` | label | `string` | — |
| `marker` | marker ↻ | `boolean` | `false` |
| `min` | min | `number` | — |
| `max` | max | `number` | — |
| `maxPoints` | max-points | `number` | `0` |

**Parts:** `base`, `marker`

**Methods:** `push(value: number | number[])` (Append one or more values without rebuilding `data` yourself. Multiple calls within the same animation frame coalesce into a single `data` assignment. Trims from the front to `max-points` when set. Sparklines have no transitions, so nothing else changes on append.)

**CSS properties:** `--dj-sparkline-width` (default `8em`; Host width.), `--dj-sparkline-height` (default `1.5em`; Host height.), `--dj-sparkline-color` (Line/area/bar color; defaults to dj-chart's series-1 token (`--dj-chart-1`, #2563eb).), `--dj-sparkline-marker-size` (default `0.25em`; Diameter of the last-point marker dot.)


## Editing


### `<dj-rich-text>` · `@dojo-ng/rich-text`

A form-associated WYSIWYG editor built on Lexical.

The value is HTML by default. Formatting, headings, lists, links, and other content types come from plugins, through the same plugin API that third-party plugins use.

#### Plugins

- Bold, italic, underline, undo, and redo are the default plugin set, `defaultPlugins`.
- Setting `plugins` replaces the defaults, so spread `...defaultPlugins` to keep them.
- Lexical needs its node types when the editor is created, so changing `plugins` later rebuilds the editor, keeping its content. Set `plugins` before `value`.
- `format` selects another serializer that a plugin contributes, such as Markdown.

#### The value

- `value` can be read and written at any time. Writing it replaces the whole document, clears the selection and the undo history, and does not emit `dj-change`, like a native input's `value`.
- `dj-change` fires when the user edits the content.

#### Pasting

- Pasted HTML is cleaned against an allowlist by default. Scripts, styles, event handlers, inline styles, and unsafe `javascript:` and `data:` URLs are removed. Unknown tags are removed but their text is kept.
- Set `sanitizePaste = false` from JavaScript to turn this off, or set `pasteSanitizer` to your own `(html) => html` function. The default is exported as `sanitizeHtml`.
- Plain-text pastes are not cleaned, since they contain no markup.

#### Light DOM

- The editable area renders in the light DOM, because Lexical's selection handling is not reliable inside a shadow root. `--dj-*` theme tokens still apply.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `name` | name ↻ | `string` | — |
| `label` | label | `string` | — |
| `placeholder` | placeholder | `string` | `""` |
| `disabled` | disabled ↻ | `boolean` | `false` |
| `plugins` | — | `RichTextPlugin[]` | `[]` |
| `format` | format ↻ | `string` | `"html"` |
| `sanitizePaste` | — | `boolean` | `true` |
| `pasteSanitizer` | — | `(html: string) => string` | — |

**Events:** `dj-change`

**Methods:** `checkValidity(): boolean`, `focus(o: FocusOptions)`, `setHtml(htmlString: string)` (Replace the document with the given HTML (regardless of the active `format`).)


## Feedback


### `<dj-alert>` · `@dojo-ng/alert`

An inline status banner.

It sits in the page flow, next to the content it concerns. For a short message that floats and goes away, use `dj-snackbar`. For a full-page outcome, use `dj-result`.

#### Showing and closing

- An alert in markup shows by default (`open` is true).
- `close()` hides it and emits `dj-close`. A closed alert takes no space.
- Add `closable` for a close button. Its label is the localized `close` message.

#### Variants

- `info` and `success` announce politely (`role="status"`).
- `warning` and `danger` announce immediately (`role="alert"`).
- Each variant has a default icon. Replace it with the `icon` slot.
- Colors come from the theme's semantic scales. To change one alert, set `--dj-alert-background`, `--dj-alert-color`, and `--dj-alert-accent-color` on it.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `variant` | variant ↻ | `AlertVariant` | `"info"` |
| `closable` | closable | `boolean` | `false` |
| `open` | open ↻ | `boolean` | `true` |

**Slots:** default (the message), `icon` (replaces the default variant glyph)

**Parts:** `base`, `icon`, `message`, `close`

**Events:** `dj-close` (after the alert closes)

**Methods:** `close()` (Close the alert: hides it and emits `dj-close` once. No-op if already closed.)

**CSS properties:** `--dj-alert-background` (default `per-variant tint`; Banner background; defaults to the variant's `--dj-color-*-100`.), `--dj-alert-color` (default `per-variant ink`; Text color; defaults to the variant's `--dj-color-*-700`.), `--dj-alert-accent-color` (default `per-variant accent`; Icon + leading-border color; defaults to the variant's `--dj-color-*-600`.), `--dj-alert-radius` (default `var(--dj-input-border-radius-medium)`; Corner radius.)


### `<dj-progress>` · `@dojo-ng/progress`

Determinate progress bar. value within min..max; `show-output` shows percent. Part: `bar`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `min` | min | `number` | `0` |
| `max` | max | `number` | `100` |
| `value` | value | `number` | `0` |
| `showOutput` | show-output | `boolean` | `false` |
| `label` | label | `string` | — |

**Parts:** `bar`

**CSS properties:** `--dj-progress-height` (default `8px`; Thickness of the progress bar.)


### `<dj-loading-indicator>` · `@dojo-ng/loading-indicator`

A linear bar or circular spinner. `active` (default true) toggles visibility while preserving layout. Exposes role="progressbar".

| Property | Attribute | Type | Default |
|---|---|---|---|
| `active` | active ↻ | `boolean` | `true` |
| `type` | type ↻ | `LoadingType` | `"linear"` |
| `label` | label | `string` | — |

**Parts:** `base`

**CSS properties:** `--dj-loading-linear-height` (default `4px`; Thickness of the linear (bar) indicator.)


### `<dj-skeleton>` · `@dojo-ng/skeleton`

A loading placeholder that stands in for content while it loads.

#### Size and shape

- Style the host with CSS; there are no shape properties. It is `display: block`, `1em` high by default, with the theme's border radius.
- For a line of text, give it a short height and a width. For an avatar, make it square and add `border-radius: 50%`.
- `effect="sheen"` (the default) shows a moving sheen; `effect="none"` shows a still surface.

#### Accessibility

- The skeleton is always `aria-hidden="true"`, because it is decoration.
- Mark the region that is loading with `aria-busy="true"` until the real content arrives. Screen readers then announce the loading state once for the region, not once per placeholder.
- Under `prefers-reduced-motion`, the sheen does not move, whatever `effect` says.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `effect` | effect ↻ | `SkeletonEffect` | `"sheen"` |

**Parts:** `base` (the placeholder surface)


### `<dj-global-event>` · `@dojo-ng/global-event`

Non-visual; attaches listeners to window/document for its lifetime. Set `windowListeners` / `documentListeners` (maps of event name → handler) as properties.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `windowListeners` | — | `Listeners` | `{}` |
| `documentListeners` | — | `Listeners` | `{}` |


## Animation


### `<dj-transition>` · `@dojo-ng/transition`

Runs an enter or leave effect when `show` changes.

The component defines no effects itself. It sets a `state` attribute on the host, and your page CSS attaches the animation to it.

#### States

- `state` moves through `entering`, `entered`, `leaving`, and `left`.
- Attach the enter effect to `dj-transition[state="entering"]` and the leave effect to `dj-transition[state="leaving"]`.
- The content stays visible through the leave effect, then is hidden with `display: none` at `state="left"`.

#### Effects

- An enter effect must be a `@keyframes` animation.
- A leave effect can be an animation or a CSS transition.
- If `show` changes again during an effect, that effect stops cleanly and its event does not fire.

#### Not built

- Enter effects made with CSS transitions.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

| Property | Attribute | Type | Default |
|---|---|---|---|
| `show` | show ↻ | `boolean` | `false` |
| `appear` | appear ↻ | `boolean` | `false` |
| `state` | state ↻ | `"entering" \| "entered" \| "leaving" \| "left"` | — |

**Slots:** default

**Events:** `dj-after-enter`, `dj-after-leave`


### `<dj-transition-group>` · `@dojo-ng/transition-group`

Staggers the `show` of its `dj-transition` children.

The effects live on the children. The group only sets each child's `show`, with a delay.

#### How it works

- When the group's `show` changes, it sets each child's `show` in DOM order. Child `i` starts after `i * stagger` milliseconds, for both enter and leave.
- When every child has finished, the group emits one `dj-after-enter` or `dj-after-leave`.
- Slotted elements that are not `dj-transition` are ignored.

#### Not built

- List-move (FLIP) animation.
- Forwarding `appear` to the children. Set `appear` on each child instead.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

| Property | Attribute | Type | Default |
|---|---|---|---|
| `show` | show ↻ | `boolean` | `false` |
| `stagger` | stagger | `number` | `0` |

**Slots:** default


## Media


### `<dj-audio>` · `@dojo-ng/audio`

A themed audio player.

It wraps the native `HTMLAudioElement`, hidden in the shadow root, with Dojo NG controls: a play/pause button, a seek slider, and a readout of the current and total time. It needs no third-party player.

#### Accessibility

- Give the player a `label`. It becomes the accessible name.
- Keyboard support comes from the button and the slider.

#### Playback state

- The play/pause button follows the media's real `play` and `pause` events, not the click. It stays correct when you control playback through `media()`.
- The seek slider's maximum comes from the media duration, and its value follows playback.

#### Events and analytics

- `dj-time` fires at most once per second.
- Put analytics, xAPI statements, and saved resume positions in your own event listeners, not in the component.
- `media()` returns the raw audio element for advanced use. Code that uses it is not supported.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `src` | src | `string` | — |
| `label` | label | `string` | — |
| `preload` | preload | `string` | `"metadata"` |

**Parts:** `bar` (the control row), `play` (the play/pause button), `seek` (the slider), `time`

**Events:** `dj-play`, `dj-pause`, `dj-ended`, `dj-time`

**Methods:** `play()` (Start playback.), `pause()` (Pause playback.), `media(): HTMLAudioElement | null` (The underlying `HTMLAudioElement`. Advanced escape hatch; no support implied.)


### `<dj-video>` · `@dojo-ng/video`

A themed video player built on video.js.

video.js (version 8, which includes HLS support) plays the video and draws its own control bar. The component handles setup, theming, and events.

#### Before you use it

Load two things at the document level, because the component does not bundle them:

- The video.js stylesheet, with a `<link>` in the page head.
- video.js itself, resolved by your bundler or an import map.

#### Changing properties

- `src`, `sources`, and `poster` update the playing video.
- `muted`, `autoplay`, `loop`, `tracks`, and `label` recreate the player.

#### Events and methods

- `dj-play`, `dj-pause`, and `dj-ended` follow playback. `dj-time` reports `{ current, duration }` at most once per second.
- Use these events for analytics, xAPI statements, or saving the playback position.
- `play()` and `pause()` control playback. `player()` returns the video.js instance itself, for advanced use; the component does not support what you do with it.

#### Light DOM

- The player renders in the light DOM, because video.js adds its own DOM and styles, and its fullscreen and track menus do not work well inside a shadow root.

#### Not built

- Custom video controls. The video.js control bar is used as it is.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

| Property | Attribute | Type | Default |
|---|---|---|---|
| `sources` | — | `VideoJsSource[]` | — |
| `src` | src | `string` | — |
| `poster` | poster | `string` | — |
| `muted` | muted | `boolean` | `false` |
| `autoplay` | autoplay | `boolean` | `false` |
| `loop` | loop | `boolean` | `false` |
| `tracks` | — | `unknown[]` | — |
| `label` | label | `string` | — |

**Events:** `dj-play`, `dj-pause`, `dj-ended`, `dj-time`

**Methods:** `play()` (Start playback.), `pause()` (Pause playback.), `player(): VideoJsPlayer | null` (The underlying video.js player instance. Advanced escape hatch; no support implied.)


## Utilities and infrastructure

Not custom elements (except `<dj-theme>`); these support theming and app-level state.

- **`@dojo-ng/dojo-element`** — `DojoElement`, the Lit base class every component extends (typed `emit()`, idempotent `define()`, auto-registered `dependencies`); plus the `DojoFormControl` interface and shared `baseStyles`.
- **`@dojo-ng/theme`** — `theme.css` (the `--dj-*` token layers, light/dark/OS) and `<dj-theme theme="light|dark|auto">` for scoped theming.
- **`@dojo-ng/store`** — `createStore` (Zustand vanilla) and `StoreController`, a Lit reactive controller that re-renders a host on a selected store slice.
- **`@dojo-ng/context`** — the typed context-key registry (`storeContext`, `localeContext`) plus the `@lit/context` provider/consumer primitives.