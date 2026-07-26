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

**Slots:** default (the button label), `icon` (an icon, placed per `icon-position`)

**Parts:** `base` (the native button), `label`, `icon`

**Methods:** `focus(options: FocusOptions)` (Move focus to the underlying native button.), `blur()` (Remove focus from the underlying native button.)

**CSS properties:** `--dj-button-font-size-small` (default `var(--dj-font-size-small)`; Font size of a small button.), `--dj-button-font-size-medium` (default `var(--dj-font-size-medium)`; Font size of a medium button.), `--dj-button-font-size-large` (default `1.125rem`; Font size of a large button.)


### `<dj-action-button>` · `@dojo-ng/action-button`

*Extends `DjButton`; inherits its properties and behavior.*

A button that inherits the surrounding theme rather than imposing its own. Mirrors the Dojo `action-button`, which renders `Button` with `variant="inherit"`. Because --dj-* tokens inherit through the shadow boundary, subclassing DjButton with no token overrides already yields inherited theming.


### `<dj-floating-action-button>` · `@dojo-ng/floating-action-button`

*Extends `DjButton`; inherits its properties and behavior.*

A circular (or extended/pill) action button, optionally fixed to a screen position. Subclasses `<dj-button>`; default-slot label, `icon` slot. @cssprop [--dj-fab-z-index=800] - Stacking order of the floating action button.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `size` | size ↻ | `FabSize` | `"normal"` |
| `position` | position ↻ | `FabPosition` | — |

**CSS properties:** `--dj-fab-z-index` (default `800`; Stacking order of the floating action button.)


### `<dj-copy-button>` · `@dojo-ng/copy-button`

An icon-only button that copies text to the clipboard and flashes feedback. It composes `<dj-button>`, so focus, keyboard, and button ARIA come for free. Copy the literal `value`, or point `from` at an element id in the same root to copy that element's `value` (form controls) or `textContent` (`value` wins when both are set). Copying uses `navigator.clipboard.writeText`, which requires a secure context (https or localhost); there is no legacy `execCommand` fallback. If the clipboard is unavailable or the write is rejected, the button shows an error state and emits `dj-error`. The icon swaps copy → check (success) → error for `feedback-duration` ms, then reverts, and the button's accessible name changes with it (Copy / Copied / Copy failed) so assistive tech hears the result.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `value` | value | `string` | `""` |
| `from` | from | `string` | — |
| `feedbackDuration` | feedback-duration | `number` | `2000` |

**Parts:** `button` (the composed `<dj-button>`)

**Events:** `dj-copy` (detail `{ value }`), `dj-error`

**Methods:** `focus(options: FocusOptions)`


### `<dj-label>` · `@dojo-ng/label`

A form label. Content goes in the default slot. Note: native `for`/`id` association does not cross shadow boundaries, so associate by wrapping the control in the label's light DOM, or rely on the consuming field component to wire ARIA. `for-id` is still reflected for same-root cases. Deviates from the Dojo widget in one name: the visually-hidden flag is `visually-hidden` (not `hidden`) to avoid clobbering the native `hidden` attribute.

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

Multi-select typeahead: type to filter `options`, pick from the popup `<dj-list>`, selections render as removable `<dj-chip>`s. Backspace on an empty input removes the last chip. Form-associated (submits each value under `name`). Composes chip, list, popup, label. Event: `change` (detail: selected values). With `allow-new`, Enter on non-empty input text creates a chip from the literal trimmed value (a free-text tag), unless the popup has an active (highlighted) option — that keeps picking. New values respect `duplicates`, clear the input, and join the form value like picked ones. Only Enter commits; comma is left alone (it is a valid character in many locales).

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

A search field: free text plus typed `key:value` filters. Typing a configured `key:` enters token mode; keys with `options` open a suggestion popup (pick to commit), keys without take a free-typed value committed by Enter or the terminating space (values may be `"quoted"` to hold spaces). A committed filter becomes a closeable `<dj-chip>` before the input; an unconfigured `word:` stays plain text. Backspace with the caret at the start removes the last chip. Read-only `query` = `{ text, tokens }`; set it with `setQuery`. Not form-associated.

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

Coordinates a set of `<dj-radio>` into a single-choice control. Provide choices either with the `options` array (rendered for you) or by slotting `<dj-radio>` children. The group owns selection (exclusivity), roving-arrow keyboard navigation, and form participation: it is the one form-associated element, submitting the selected `value` under `name`. Child radios should not carry their own `name`. This is local parent-child coordination, so it uses DOM, properties, and events — no external store needed.

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

An inline color picker with a 2D saturation/brightness area, a hue slider, an optional opacity slider, a text field, and optional swatches. Form-associated: it submits the formatted color string under `name`. There is no built-in trigger or popup — compose `dj-popup` to make it a dropdown. The internal model is HSV + alpha; `value` is a color STRING formatted through `format` (`hex`/`rgb`/`hsl`). Parts: `area`, `thumb`, `hue`, `alpha`, `input`, `swatches`, `swatch`.

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

A form-associated file selector with a button (opens the OS picker) and a focusable drop zone. Files arrive by picker, drop, paste (a screenshot pasted while the drop zone has focus), or the public `addFiles` method; all four route through one intake that applies `accept` + `multiple` + max-size. Selected files are copied into component state, shown as a removable list; the element only SELECTS files (no upload/preview). Form value: a single `File` normally, or a `FormData` with one entry per file (under `name`) when `multiple`. Parts: `button`, `dropzone`, `list`, `item`, `remove`. Event: `dj-change` (`{ files }`) on add and remove.

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

Positions slotted content as an overlay, flipping to the opposite side when there isn't room in the preferred position. Anchor it by setting the `anchor` property to an element, or supply viewport coordinates via the `x-*`/`y-*` attributes. While open it locks body scroll and closes on Escape or underlay click, emitting a `dj-close` event. Content goes in the default slot.

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

The APG menu-button glue over the existing `<dj-popup>` and `<dj-list>`. Put the trigger (usually a `<dj-button>`) in the `trigger` slot and the content — typically one `<dj-list>` — in the default slot; the content renders in a `<dj-popup>` anchored to the trigger. Behavior: clicking the trigger toggles it. ArrowDown / Enter / Space open it; on open, if the content is a `<dj-list>`, its `menu` mode is switched on, it is focused, and its first item is activated. Escape closes and returns focus to the trigger; choosing an item (the list's `change` event) closes and refocuses too — the `change` event still reaches the consumer untouched. Non-list content is allowed as an arbitrary panel: then dj-dropdown only does open/close/Escape/focus-return, with no list steering.

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

A modal dialog. Slots: `title`, default (content), `actions`. Locks body scroll while open, closes on Escape and the close button, and on underlay click unless `modal`. `role="alertdialog"` is always modal. Restores focus to the previously focused element on close. Emits `dj-close`. Parts: `underlay`, `dialog`, `title`, `close`, `content`, `actions`. @cssprop [--dj-dialog-z-index=941] - Stacking order of the dialog. @cssprop [--dj-dialog-underlay-z-index=940] - Stacking order of the dialog underlay (scrim).

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

A panel that slides in from an edge. Slots: `title`, default (content). Closes on Escape, the close button, and underlay click. Locks body scroll while open. Emits `dj-close`. Width/height comes from `width` (px). Parts: `underlay`, `pane`, `title`, `close`, `content`. @cssprop [--dj-slide-pane-size=320px] - Width (left/right) or height (top/bottom) of the pane. @cssprop [--dj-slide-pane-z-index=931] - Stacking order of the pane. @cssprop [--dj-slide-pane-underlay-z-index=930] - Stacking order of the pane underlay (scrim).

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

A toast. `open` shows it; `type` success/error tints; slots: default (message), `actions`. @cssprop [--dj-snackbar-z-index=960] - Stacking order of the snackbar.

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

Two resizable panes with a draggable divider between them. The `start` and `end` slots hold the panes; the divider is a shadow-side bar (put custom grip content in the optional `divider` slot). `position` is the start pane's share as a percent (0–100); the layout is a CSS grid whose start/end tracks are `position`fr and `(100 − position)`fr, so the panes always divide in that ratio. Minimum pane sizes come from CSS, not props: the tracks are `minmax(var(--dj-split-panel-min-start), …)` / `minmax(var(--dj-split-panel-min-end), …)`, so a consumer sets a floor in any length unit and the browser clamps the drag against it. The host needs a size (for `horizontal`, a height) since the panes fill it. `orientation="horizontal"` (default) puts the panes side by side with a vertical divider; `vertical` stacks them with a horizontal divider. Column order follows the host's writing direction, so in RTL the start pane sits on the right with no extra work. The divider is a `role="separator"` with `aria-valuenow/valuemin/valuemax` tracking `position` and `aria-orientation` set to the divider's own visual axis (vertical for a horizontal split). Dragging uses pointer events with pointer capture, so mouse, trackpad, and touch all work; the divider position is read from the pointer's offset within the host rect (RTL-mirrored for a horizontal split — a pointer at the visual left is 100%). Because dragging is a pointer gesture, WCAG 2.5.7 needs a non-drag path: the focused divider takes Arrow keys (±1, Shift = ±10) mapped through reading direction for horizontal and Up/Down for vertical, plus Home (0) and End (100). `dj-reposition` fires on settle: once on pointer-up for a drag, and once per keypress.

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

A slotted, swipeable carousel. Each top-level element in the default slot is one item (cards, images, tiles — arbitrary content). The item strip is a native horizontal scroll container with CSS scroll-snap, so touch and trackpad swiping is real scrolling: there is no pointer/drag code and no WCAG 2.5.7 (dragging) concern — the prev/next buttons are the non-drag path. `per-view` sizes items to show N at once (gap-adjusted); `dots` adds one dot per navigable page (with `per-view` &gt; 1 the trailing items can't lead, so pages = items − per-view + 1); `nav` (default on) shows prev/next buttons that disable at the ends (no looping in v1). The settled index is detected from element rects (not `scrollLeft`, which is RTL-inconsistent), debounced after scrolling. `next`/`previous`/`goTo` smooth-scroll the target into view and, because a headless environment has no layout, update `index` and emit optimistically; the scroll listener reconciles in a real browser (guarded so an unchanged index does not re-emit). Under `prefers-reduced-motion` navigation jumps instantly (the composed `reducedMotion` snippet forces `scroll-behavior: auto`, and button navigation passes `behavior: "auto"`). ARIA follows the APG carousel pattern: the region carries `aria-roledescription="carousel"` and the `label`; each slotted item gets `role="group"`, `aria-roledescription="slide"`, and an "{n} of {total}" label, reconciled on every `slotchange` and locale change. Keyboard: with the viewport focused, ArrowRight/ArrowLeft move forward/back in the reading direction (RTL-aware). Deferred (not built): `loop`, autoplay (an accessibility liability), and vertical orientation.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `perView` | per-view | `number` | `1` |
| `nav` | nav | `boolean` | `true` |
| `dots` | dots | `boolean` | `false` |
| `label` | label | `string` | — |

**Slots:** default

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

App header bar. `sticky` pins it. Slots: `leading`, default (title), `trailing`. @cssprop [--dj-header-z-index=700] - Stacking order of the header.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `sticky` | sticky | `boolean` | `false` |

**Slots:** `leading`, default (title), `trailing`

**CSS properties:** `--dj-header-z-index` (default `700`; Stacking order of the header.)


### `<dj-toolbar>` · `@dojo-ng/toolbar`

A horizontal action bar. Slots: `leading` (logo, menu/back button), default (title or content), `actions` (primary action buttons, end-aligned). Secondary actions can collapse into an overflow menu: set the `overflow` property to a list of options and a `⋮` button renders a popup `<dj-list>` of them, emitting `dj-action` with the chosen value. `sticky` pins the bar to the top. `role="toolbar"`. Composes popup, list, icon. The overflow menu closes on selection, Escape, outside click, and on tab-out. (Automatic width-based collapsing of slotted actions is a future addition; for now the app decides which actions are primary and which go in `overflow`.)

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

A hierarchical tree from `nodes`. Each node may carry an `icon` (a registered icon name) and a `count` (a trailing badge, e.g. an unread count). Selection is controlled by `value` (a node id) and emits `dj-select`; expansion is controlled by `expanded` (an array of node ids) and emits `dj-expand-change`. The component knows nothing about what the tree holds — a file tree, a mail folder list, or a MIME structure are all just nodes. A row click selects; the chevron expands. Set `expand-on-row-click` when the tree has rows that exist only to contain others, where selecting one means nothing and the click would be dead. Keyboard follows the APG tree pattern with a roving tabindex: exactly one row is tabbable (the selected row if visible, else the first visible row), and the arrow keys move focus without selecting. Down/Up walk the visible rows; Right expands a closed parent, steps into an open one, and does nothing on a leaf; Left collapses an open parent or moves to the parent row; Home/End jump to the first/last visible row; Enter or Space selects the focused row. Indentation is a logical `margin-inline-start`, so it flips in RTL, and the chevron mirrors with the reading direction. Deferred (not built): drag-drop, virtualization, checkboxes, lazy loading.

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


## Data display


### `<dj-board>` · `@dojo-ng/board`

A Kanban board over plain records. Lanes are the values of one field (`group-by`); cards are the records of `data`, ordered within a lane by their order of appearance. The board is CONTROLLED: it never mutates `data` — every move (menu, keyboard) emits `dj-card-move` and the app applies it (the exported `applyCardMove` helper makes that one line); focus then follows the moved card and the move is announced to assistive tech once the app's data update lands. Card content comes from `renderCard`, rendered inside the component-owned accessible shell (so custom cards cannot regress accessibility), or defaults to a `dj-card` showing the `card-title` field. Keyboard: one tab stop (roving); arrows move between cards and lanes, Home/End within a lane, Enter activates, Space or M opens the move menu, and Ctrl/Cmd+arrows move the card itself. WIP limits are advisory (`n/limit` count and an over-limit style hook, never blocking).

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

**CSS properties:** `--dj-board-lane-width` (default `18rem`; Fixed width of each lane.), `--dj-board-gap` (default `1rem`; Gap between lanes.)


### `<dj-list>` · `@dojo-ng/list`

A single-select list/menu driven by `options`. Uses the active-descendant pattern (one tab stop; arrow/Home/End move the active item, Enter/Space selects). `menu` switches roles to menu/menuitem. Form-associated (submits `value`). Shows a spinner when `loading`. With `reorderable`, items can be dragged (pointer/touch) or moved by keyboard (space to grab, arrows to move, space to drop, escape to cancel) — controlled: it emits `dj-reorder` and the consumer reorders `options`. Virtualization is deferred. Parts: `list`, `item`. @cssprop [--dj-list-max-height=none] - Maximum height before the list scrolls.

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

**CSS properties:** `--dj-list-max-height` (default `none`; Maximum height before the list scrolls.)


### `<dj-grid>` · `@dojo-ng/grid`

A data grid from `columns` + `rows`. Click a sortable header to sort (emits `dj-sort`). Functional core: no virtualization, paging, editing, or column resize yet. Part: `table`.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `columns` | columns | `GridColumn[]` | `[]` |
| `rows` | rows | `Record<string, unknown>[]` | `[]` |

**Parts:** `table`

**Events:** `dj-sort`


### `<dj-data-grid>` · `@dojo-ng/data-grid`

A virtualized, sortable, selectable data grid built on TanStack Table (column/sort/selection model) and TanStack Virtual (row virtualization). Core scope: columns, in-memory `data`, sort, virtual rows, row selection, keyboard row navigation, and calculated columns (`GridColumn.compute`). Filtering, pagination, inline editing, tree rows, grouping, CSV export, and master-detail arrive as PLUGINS via the `plugins` property (plain objects from factory functions; see {@link DataGridPlugin}). A bare grid with `plugins=[]` behaves exactly as before. ARIA role=grid. `activation` separates opening a row from selecting rows: under `"click"` or `"double"` a plain click activates and emits `dj-activate` instead of toggling selection, Enter activates while Space still selects, and modifier-clicks stay reserved for selection. The default `"none"` keeps the original behavior, so this is purely additive.

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

**Events:** `dj-sort`, `dj-selection-change`, `dj-activate` (detail `{ row, index }`, where `row` is
the original row data)

**Methods:** `toggleAt(index: number)`, `activateAt(index: number)` (Emit `dj-activate` for a row-model index. Fires regardless of `selectionMode` (a read-only list with clickable rows is a real case) but never under `activation="none"`.)


### `<dj-calendar>` · `@dojo-ng/calendar`

A form-associated month-grid date picker. `value` is an ISO date (yyyy-mm-dd). Localizes month and weekday names via Intl (set `locale`). Keyboard: arrows move by day/week, PageUp/PageDown change month, Enter/Space select. `min`/`max` (ISO) bound selection. Composes `<dj-icon>` for navigation. Functional core; year-picker popup and range selection are deferred. Parts: `header`, `grid`, `day`.

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

A small count or status label that decorates other content. Presentational: it carries no ARIA role. When a badge shows a count for a control (e.g. an unread count on a button), put the accessible name on the CONTROL — `aria-label="Notifications, 4 unread"` — not on the badge, so assistive tech reads the meaning rather than a bare number. Content is the default slot.

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

A presentational icon. Supply a glyph either by `type` (a name registered via `registerIcon`, resolved from the SVG icon registry) or by slotting an inline `<svg>`. `alt-text` makes the icon meaningful to assistive tech; without it the icon is aria-hidden.

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

A themeable, accessible SVG chart. Set `data` (array of rows) and `series`. `type` selects the mark: cartesian (`line`, `area`, `bar`) reads `category-key` for x; x/y (`scatter`, `bubble`) reads `x-key` for a numeric x (and `size-key` for bubble radius); radial (`pie`, `donut`) draws one series as slices by category. `stacked` stacks bars and areas; a series may override `type` for combos. Built on D3 math (scales, shapes) with the SVG owned here, so marks are themeable via `--dj-*` tokens (a `--dj-chart-1..8` ramp) and `::part()`, and the chart is real DOM for assistive tech. It exposes a visually-hidden data table as the accessible equivalent, carries `role="img"` with a generated summary, and honors reduced motion. Not a form control. `legend-toggle` makes legend items toggle series visibility; `brush` adds an overview strip below cartesian charts for selecting the visible category window (double-click resets).

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

**Parts:** `plot`, `axis`, `grid`, `series`, `bar`, `line`, `point`, `slice`, `legend`, `legend-item`, `brush-handle`, `tooltip`, `center-label`, `center-sub-label`

**Events:** `dj-legend-toggle` (detail `{ key, hidden }`), `dj-hover` (detail `{ category }` or `null`; cartesian and radial)

**CSS properties:** `--dj-chart-height` (default `18rem`; Overall chart height (width fills the container).), `--dj-chart-1` (default `#2563eb`; Categorical series color 1.), `--dj-chart-2` (default `#16a34a`; Categorical series color 2.), `--dj-chart-3` (default `#d97706`; Categorical series color 3.), `--dj-chart-4` (default `#dc2626`; Categorical series color 4.), `--dj-chart-5` (default `#7c3aed`; Categorical series color 5.), `--dj-chart-6` (default `#0891b2`; Categorical series color 6.), `--dj-chart-7` (default `#db2777`; Categorical series color 7.), `--dj-chart-8` (default `#65a30d`; Categorical series color 8.)


## Editing


### `<dj-rich-text>` · `@dojo-ng/rich-text`

A form-associated WYSIWYG editor built on the Lexical core. The editable region renders in LIGHT DOM (Lexical's selection handling is not reliable inside a shadow root yet), so this component overrides `createRenderRoot`; theming still works because `--dj-*` tokens cascade in light DOM. The editor is a PLUGIN HOST: bold/italic/underline and undo/redo ship as the default plugin set (`default-plugins.ts`) and flow through the same {@link RichTextPlugin} API third-party plugins use. Foundational behavior (`registerRichText`, value sync, root-element setup) stays as core. Toolbar controls, node registration, and output formats all come from plugins. Constraint: Lexical needs node classes at creation, so a `plugins` change after creation rebuilds the editor (serialize → recreate → deserialize). Value is HTML by default; the `format` property selects an alternate serializer contributed by a plugin. Event: `dj-change`.

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

An inline status banner. It sits in the page flow (unlike the transient, floating `dj-snackbar`, and unlike the full-page `dj-result`); use it to call out a persistent state next to the content it concerns. An alert written in markup shows by default (`open`); closing it sets `open` false and it takes no space. Info/success announce politely (`role="status"`); warning/danger announce assertively (`role="alert"`).

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

Determinate progress bar. value within min..max; `show-output` shows percent. Part: `bar`. @cssprop [--dj-progress-height=8px] - Thickness of the progress bar.

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

A loading placeholder that stands in for content while it loads. Shape and size come from consumer CSS on the host: it is `display: block` with a default height of `1em` and a token border-radius. Style the host to size each placeholder — a circular avatar is `border-radius: 50%`, a text line is a short height with a width. No shape prop is needed. Always `aria-hidden="true"`: the placeholder itself is decorative. Mark the region that is loading with `aria-busy="true"` until the real content lands, so assistive tech announces the loading state once for the whole region. `prefers-reduced-motion` disables the sheen regardless of `effect` (the shared reducedMotion snippet collapses the animation).

| Property | Attribute | Type | Default |
|---|---|---|---|
| `effect` | effect ↻ | `SkeletonEffect` | `"sheen"` |

**Parts:** `base` (the placeholder surface)

**CSS properties:** `--dj-skeleton-color` (default `var(--dj-color-neutral-200)`; Placeholder fill.), `--dj-skeleton-sheen-color` (default `rgb(255 255 255 / 0.55)`; Color of the sweeping sheen band.), `--dj-skeleton-radius` (default `var(--dj-input-border-radius-small)`; Corner radius.)


### `<dj-global-event>` · `@dojo-ng/global-event`

Non-visual; attaches listeners to window/document for its lifetime. Set `windowListeners` / `documentListeners` (maps of event name → handler) as properties.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `windowListeners` | — | `Listeners` | `{}` |
| `documentListeners` | — | `Listeners` | `{}` |


## Animation


### `<dj-transition>` · `@dojo-ng/transition`

Runs an enter/leave effect when `show` toggles. It defines no effects itself: it reflects a `state` attribute (`entering` | `entered` | `leaving` | `left`) on the host, and the consumer's page CSS attaches the animation to `dj-transition[state="entering"]` / `dj-transition[state="leaving"]`. Enter effects must be `@keyframes` animations (enter-by-transition is not supported in v1); leave effects may be an animation or transitioned properties. The wrapper stays mounted through the leave effect, then hides via `display: none` at `state="left"`. Rapid toggling cancels the in-flight phase cleanly and fires no event for it.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `show` | show ↻ | `boolean` | `false` |
| `appear` | appear ↻ | `boolean` | `false` |
| `state` | state ↻ | `"entering" \| "entered" \| "leaving" \| "left"` | — |

**Slots:** default

**Events:** `dj-after-enter`, `dj-after-leave`


### `<dj-transition-group>` · `@dojo-ng/transition-group`

Coordinates slotted `dj-transition` children, staggering their `show` toggles. When the group's `show` changes it drives each child's `show` in DOM order, child `i` after `i * stagger` ms, for both enter and leave. When every child has completed its phase it emits one group `dj-after-enter` (or `dj-after-leave`). v1 is stagger only: no FLIP/list-move animation and no `appear` forwarding (set `appear` on the children directly). Non-`dj-transition` slotted elements are ignored.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `show` | show ↻ | `boolean` | `false` |
| `stagger` | stagger | `number` | `0` |

**Slots:** default


## Media


### `<dj-audio>` · `@dojo-ng/audio`

A themed audio player wrapping the native `HTMLAudioElement`. The `<audio>` element is ours (hidden in the shadow root); the UI is dj- controls: a play/pause `<dj-button>` whose icon and localized label follow the media's real `play`/`pause` events (not the click, so the button stays correct if the media is driven through `media()`), a seek `<dj-slider>` whose max is set from the media duration and whose value tracks playback, and a current/total time readout. No vendor engine — audio needs none.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `src` | src | `string` | — |
| `label` | label | `string` | — |
| `preload` | preload | `string` | `"metadata"` |

**Parts:** `bar` (the control row), `play` (the play/pause button), `seek` (the slider), `time`

**Events:** `dj-play`, `dj-pause`, `dj-ended`, `dj-time`

**Methods:** `play()` (Start playback.), `pause()` (Pause playback.), `media(): HTMLAudioElement | null` (The underlying `HTMLAudioElement`. Advanced escape hatch; no support implied.)


### `<dj-video>` · `@dojo-ng/video`

A themed video player wrapping video.js (the product's engine; v8, which bundles HLS). We own integration; video.js owns playback and renders its own control bar (`controls: true` — we do NOT rebuild video controls in v1). LIGHT DOM: this component renders its player region into light DOM (`createRenderRoot()` returns `this`, the dj-rich-text precedent) because video.js injects DOM, needs its global stylesheet, and its fullscreen/track menus misbehave inside a shadow root. video.js's stylesheet is a documented APP PREREQUISITE, loaded at document level (see the README's link tag) — the same arrangement as element-internals-polyfill. Test seam: the engine is only ever created through `protected createPlayer(el, options)`, which defaults to lazily importing the real video.js factory. Tests replace it with a stub player.

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
- **`@dojo-ng/pubsub`** — `createPubSub()`: a publish/subscribe facade backed by the store (last value retained + replayed to late subscribers).