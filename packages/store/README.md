# @dojo-ng/store

Connects Lit components to an external store, so a component re-renders when the state it uses changes.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/store
```

## Usage

Create a store, then select the value a component uses.

```js
import { LitElement, html } from "lit";
import { createStore, StoreController } from "@dojo-ng/store";

export const counter = createStore((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));

class CountButton extends LitElement {
  // Re-renders only when `count` changes.
  #count = new StoreController(this, counter, (s) => s.count);

  render() {
    return html`<button @click=${() => counter.getState().increment()}>
      Clicked ${this.#count.value} times
    </button>`;
  }
}
customElements.define("count-button", CountButton);
```

## What is in the package

- `StoreController`: a Lit reactive controller. Pass a store and a selector. The host re-renders only when the selected value changes (compared with `Object.is`).
- `createStore`: re-exported from Zustand's vanilla build, for an app that does not have a store yet.
- `ReadableStore`: the type the controller needs. Any object with `getState()` and `subscribe(listener)` works, so you can use Zustand, Valtio, Nano Stores (with a small adapter), or your own store.

## Observable interop

- These helpers are for apps that already use RxJS or another library that follows the `Symbol.observable` protocol. Nothing in this package needs RxJS.
- `toObservable(store)`: an observable that emits the current state at once, then every change.
- `fromObservable(input, initial)`: a `ReadableStore` that follows an observable. `initial` is required, because an observable has no current value until it emits.
- `ObservableController`: re-renders the host on every value from an observable.

## Examples

### Bridge to RxJS

Turn an observable into a store, or a store into an observable.

```js
import { from, interval } from "rxjs";
import { fromObservable, toObservable } from "@dojo-ng/store";
import { counter } from "./counter.js";

// An observable as a store. Use it with StoreController or the context registry.
const ticks = fromObservable(interval(1000), 0);
ticks.getState(); // 0 until the first tick

// A store as an observable. Use it with RxJS operators.
from(toObservable(counter)).subscribe((state) => console.log(state.count));
```
