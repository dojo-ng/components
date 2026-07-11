# Dojo NG

A framework-agnostic web component library, built on Lit. The components run in React, Angular, Vue, Svelte, or with no framework. Dojo NG is the successor to the Dojo 2 widget set, rebuilt as standards-based custom elements. BSD-3-Clause.

## Install

Each component ships as its own package under the `@dojo-ng` scope. Install only what you use:

```bash
npm install @dojo-ng/button
```

Importing a package registers its custom element:

```html
<script type="module">import "@dojo-ng/button";</script>
<dj-button kind="outlined">Save</dj-button>
```

## Packages

Each package has its own README with properties, slots, parts, events, and worked examples.


### Form controls

| Package | Description |
|---|---|
| [`@dojo-ng/button`](packages/button/README.md) | Dojo NG button web component |
| [`@dojo-ng/action-button`](packages/action-button/README.md) | Dojo NG action-button web component |
| [`@dojo-ng/floating-action-button`](packages/floating-action-button/README.md) | Dojo NG FAB web component |
| [`@dojo-ng/label`](packages/label/README.md) | Dojo NG label web component |
| [`@dojo-ng/helper-text`](packages/helper-text/README.md) | Dojo NG helper-text web component |
| [`@dojo-ng/text-input`](packages/text-input/README.md) | Dojo NG text-input web component |
| [`@dojo-ng/email-input`](packages/email-input/README.md) | Dojo NG email-input web component |
| [`@dojo-ng/number-input`](packages/number-input/README.md) | Dojo NG number-input web component |
| [`@dojo-ng/password-input`](packages/password-input/README.md) | Dojo NG password-input web component |
| [`@dojo-ng/constrained-input`](packages/constrained-input/README.md) | Dojo NG constrained-input web component |
| [`@dojo-ng/text-area`](packages/text-area/README.md) | Dojo NG text-area web component |
| [`@dojo-ng/native-select`](packages/native-select/README.md) | Dojo NG native-select web component |
| [`@dojo-ng/select`](packages/select/README.md) | Dojo NG select web component |
| [`@dojo-ng/typeahead`](packages/typeahead/README.md) | Dojo NG typeahead web component |
| [`@dojo-ng/chip-typeahead`](packages/chip-typeahead/README.md) | Dojo NG chip-typeahead web component |
| [`@dojo-ng/checkbox`](packages/checkbox/README.md) | Dojo NG checkbox web component |
| [`@dojo-ng/checkbox-group`](packages/checkbox-group/README.md) | Dojo NG checkbox-group web component |
| [`@dojo-ng/radio`](packages/radio/README.md) | Dojo NG radio web component |
| [`@dojo-ng/radio-group`](packages/radio-group/README.md) | Dojo NG radio-group web component |
| [`@dojo-ng/switch`](packages/switch/README.md) | Dojo NG switch web component |
| [`@dojo-ng/slider`](packages/slider/README.md) | Dojo NG slider web component |
| [`@dojo-ng/range-slider`](packages/range-slider/README.md) | Dojo NG range-slider web component |
| [`@dojo-ng/rate`](packages/rate/README.md) | Dojo NG rate web component |
| [`@dojo-ng/date-input`](packages/date-input/README.md) | Dojo NG date-input web component |
| [`@dojo-ng/time-picker`](packages/time-picker/README.md) | Dojo NG time-picker web component |
| [`@dojo-ng/form`](packages/form/README.md) | Dojo NG form web component |

### Overlays

| Package | Description |
|---|---|
| [`@dojo-ng/popup`](packages/popup/README.md) | Dojo NG popup web component |
| [`@dojo-ng/trigger-popup`](packages/trigger-popup/README.md) | Dojo NG trigger-popup web component |
| [`@dojo-ng/context-popup`](packages/context-popup/README.md) | Dojo NG context-popup web component |
| [`@dojo-ng/popup-confirmation`](packages/popup-confirmation/README.md) | Dojo NG popup-confirmation web component |
| [`@dojo-ng/context-menu`](packages/context-menu/README.md) | Dojo NG context-menu web component |
| [`@dojo-ng/dialog`](packages/dialog/README.md) | Dojo NG dialog web component |
| [`@dojo-ng/slide-pane`](packages/slide-pane/README.md) | Dojo NG slide-pane web component |
| [`@dojo-ng/tooltip`](packages/tooltip/README.md) | Dojo NG tooltip web component |
| [`@dojo-ng/snackbar`](packages/snackbar/README.md) | Dojo NG snackbar web component |

### Layout

| Package | Description |
|---|---|
| [`@dojo-ng/card`](packages/card/README.md) | Dojo NG card web component |
| [`@dojo-ng/header-card`](packages/header-card/README.md) | Dojo NG header-card web component |
| [`@dojo-ng/stack`](packages/stack/README.md) | Dojo NG stack web component |
| [`@dojo-ng/two-column-layout`](packages/two-column-layout/README.md) | Dojo NG two-column-layout web component |
| [`@dojo-ng/three-column-layout`](packages/three-column-layout/README.md) | Dojo NG three-column-layout web component |
| [`@dojo-ng/title-pane`](packages/title-pane/README.md) | Dojo NG title-pane web component |
| [`@dojo-ng/accordion`](packages/accordion/README.md) | Dojo NG accordion web component |

### Navigation

| Package | Description |
|---|---|
| [`@dojo-ng/breadcrumb-group`](packages/breadcrumb-group/README.md) | Dojo NG breadcrumb-group web component |
| [`@dojo-ng/header`](packages/header/README.md) | Dojo NG header web component |
| [`@dojo-ng/toolbar`](packages/toolbar/README.md) | Dojo NG toolbar web component |
| [`@dojo-ng/pagination`](packages/pagination/README.md) | Dojo NG pagination web component |
| [`@dojo-ng/tab-container`](packages/tab-container/README.md) | Dojo NG tab-container web component |
| [`@dojo-ng/wizard`](packages/wizard/README.md) | Dojo NG wizard web component |
| [`@dojo-ng/speed-dial`](packages/speed-dial/README.md) | Dojo NG speed-dial web component |
| [`@dojo-ng/tree`](packages/tree/README.md) | Dojo NG tree web component |

### Data display

| Package | Description |
|---|---|
| [`@dojo-ng/list`](packages/list/README.md) | Dojo NG list web component |
| [`@dojo-ng/grid`](packages/grid/README.md) | Dojo NG grid web component |
| [`@dojo-ng/data-grid`](packages/data-grid/README.md) | Dojo NG virtualized data grid on TanStack |
| [`@dojo-ng/calendar`](packages/calendar/README.md) | Dojo NG calendar web component |
| [`@dojo-ng/avatar`](packages/avatar/README.md) | Dojo NG avatar web component |
| [`@dojo-ng/chip`](packages/chip/README.md) | Dojo NG chip web component |
| [`@dojo-ng/icon`](packages/icon/README.md) | Dojo NG icon web component |
| [`@dojo-ng/result`](packages/result/README.md) | Dojo NG result web component |
| [`@dojo-ng/text`](packages/text/README.md) | Dojo NG text web component |
| [`@dojo-ng/rich-text`](packages/rich-text/README.md) | Dojo NG rich-text (WYSIWYG) web component on Lexical |

### Feedback

| Package | Description |
|---|---|
| [`@dojo-ng/progress`](packages/progress/README.md) | Dojo NG progress web component |
| [`@dojo-ng/loading-indicator`](packages/loading-indicator/README.md) | Dojo NG loading-indicator web component |
| [`@dojo-ng/global-event`](packages/global-event/README.md) | Dojo NG global-event web component |

### Infrastructure

| Package | Description |
|---|---|
| [`@dojo-ng/dojo-element`](packages/dojo-element/README.md) | Dojo NG web component base class |
| [`@dojo-ng/theme`](packages/theme/README.md) | Dojo NG theme tokens and scoping element |
| [`@dojo-ng/store`](packages/store/README.md) | Dojo NG external-store controller for Lit components |
| [`@dojo-ng/context`](packages/context/README.md) | Dojo NG context-key registry (Context Protocol) |
| [`@dojo-ng/pubsub`](packages/pubsub/README.md) | Dojo NG publish/subscribe facade backed by an external store |
| [`@dojo-ng/i18n`](packages/i18n/README.md) | Dojo NG internationalization: locale signal, Intl formatting, message resolver, pluggable loader |


## Documentation

- [Component reference](docs/components-reference.md) — every component's API in one place
- [Component conventions](docs/component-conventions.md) — how the components are built
- [Theming](docs/theming-proposal.md) — the `--dj-*` token system and `<dj-theme>`
- [Accessibility](docs/accessibility.md) — keyboard, focus, forced-colors, target size, WCAG 2.2 AA
- [Localization guide](docs/i18n-guide.md) and [i18n design](docs/i18n-proposal.md)
- [State and data](docs/state-and-framework-analysis.md) — store, context, pub/sub
- [Releasing](docs/releasing.md) — Changesets-based versioning and publishing
- [QA requirements](docs/qa-requirements.md) — what we test, when, and pass/fail gates

Live, interactive examples are in `playground/index.html`.

## Testing

| Command | What it runs |
|---|---|
| `npm run build` | Type-check + build the workspace (`tsc -b`) |
| `npm run lint` | ESLint (flat config, correctness rules only) |
| `npm run test:unit` | Vitest logic unit tests (Node) |
| `npm run test:browser` | Component + axe accessibility suites on Chromium, Firefox, and WebKit |
| `npm run bench:components` | Relative performance gate (data-grid + chart), 2× tolerance |

See [docs/qa-requirements.md](docs/qa-requirements.md) for the full policy and pass/fail gates.

### Pre-commit hook

`scripts/precommit.sh` runs the fast gate (type-check + lint + unit tests) before a commit.
Mercurial hooks are per-clone, so wire it into your clone's `.hg/hgrc`:

```ini
[hooks]
precommit.qa = bash scripts/precommit.sh
```

The browser and bench suites are not in the hook (they need a browser); CI runs the full matrix.

## License

BSD-3-Clause. See [LICENSE](LICENSE).
