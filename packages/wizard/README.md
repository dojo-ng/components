# @dojo-ng/wizard

`<dj-wizard>` — Step progress indicator.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Step progress indicator. `steps` describes each step; `active-step` derives statuses (before=complete, at=inProgress, after=pending) unless a step sets its own. When `clickable`, clicking a step emits `dj-step` with its index. Part: `step`.

## Install

```bash
npm install @dojo-ng/wizard
```

## Usage

Import the package to register the custom element, then use the tag.

Provide `steps`; set `active-index` as the user progresses.

```html
<dj-wizard id="wz" active-index="1"></dj-wizard>
<script type="module">
  import "@dojo-ng/wizard";
  document.getElementById("wz").steps = [
    { title: "Account" }, { title: "Profile" }, { title: "Done" },
  ];
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `steps` | steps | `Step[]` | `[]` |
| `activeStep` | active-step | `number` | — |
| `direction` | direction ↻ | `"horizontal" \| "vertical"` | `"horizontal"` |
| `clickable` | clickable | `boolean` | `false` |

**Parts:** `step`

**Events:** `dj-step`

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
