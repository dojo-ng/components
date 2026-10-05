# @dojo-ng/dojo-element

The base class for every Dojo NG component, plus shared helpers for building your own.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/dojo-element
```

## Usage

Extend the base class, emit events with `emit()`, and register the tag with `define()`.

```js
import DojoElement from "@dojo-ng/dojo-element";
import { html } from "lit";

export class MyGreeting extends DojoElement {
  static properties = { name: {} };

  render() {
    return html`<button @click=${() => this.emit("my-greet", { detail: { name: this.name } })}>
      Hello, ${this.name}
    </button>`;
  }
}
MyGreeting.define("my-greeting");
```

## DojoElement

- It extends `LitElement`. Import it as the default export.
- `emit(name, options)` dispatches a `CustomEvent` that bubbles and crosses shadow boundaries (`composed`) by default.
- `static define(tag)` registers the element. Registering the same tag again does nothing. If the versions differ, it logs a warning instead of throwing an error.
- `static dependencies` lists child elements to register when the element is created.

## Form controls

- `FormControl(DojoElement)` is a mixin for form-associated controls.
- A control inside a disabled `<fieldset>` or form is disabled too.
- State is restored after back and forward navigation and after autofill.
- Validity is mirrored onto the host as `data-dj-required`, `data-dj-valid`, `data-dj-invalid`, `data-dj-user-valid`, and `data-dj-user-invalid`. The `user-` states turn on only after the user has interacted with the control.

## Helpers

- Focus: `trapTabKey`, `collectFocusables`, `firstFocusable`, `isFocusable`, `deepActiveElement`, `isFocusWithin`, and `dismissOnFocusOut`.
- `lockBodyScroll()` stops the page from scrolling behind a modal and returns a function that unlocks it. Nested locks are counted.
- `TokenFlagController` reads a true or false flag from a `--dj-*` custom property. The value `1` means true.
- `baseStyles` and `reducedMotion` are shared styles for component shadow roots.

## Examples

### Style invalid fields

Form controls mirror their validity onto the host, so page CSS can react to it. Here a hint turns red after the user leaves the field invalid.

```html
<style>
  .field:has(dj-text-input[data-dj-user-invalid]) .hint {
    color: var(--dj-color-danger-600);
  }
</style>
<div class="field">
  <dj-text-input label="Email" type="email" required></dj-text-input>
  <p class="hint">Enter an address like name@example.com.</p>
</div>
```
