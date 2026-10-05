# @dojo-ng/context

Typed keys for sharing values down the DOM tree with the Context Protocol.

A provider and its consumers import the same key, so they connect even when they come from different packages or bundles. The keys use `Symbol.for`, so each key is the same everywhere.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/context
```

## Usage

Provide the store once near the top of the page. Any descendant can consume it with the same key.

```js
import { LitElement, html } from "lit";
import { ContextProvider, ContextConsumer, storeContext } from "@dojo-ng/context";
import { createStore, StoreController } from "@dojo-ng/store";

const store = createStore(() => ({ user: "Ada" }));

class AppShell extends LitElement {
  #provider = new ContextProvider(this, { context: storeContext, initialValue: store });
  render() {
    return html`<user-name></user-name>`;
  }
}

class UserName extends LitElement {
  #user;
  #consumer = new ContextConsumer(this, {
    context: storeContext,
    callback: (store) => {
      this.#user = new StoreController(this, store, (s) => s.user);
    },
  });
  render() {
    return html`${this.#user?.value}`;
  }
}

customElements.define("app-shell", AppShell);
customElements.define("user-name", UserName);
```

## Keys

- `storeContext`: the app's shared store, as a `ReadableStore` from `@dojo-ng/store`. Consumers cast it to their own state type.
- `localeContext`: the current BCP 47 locale string, such as `fr-CA`.

## Also exported

- `createContext`, `ContextProvider`, `ContextConsumer`, `consume`, and `provide`, re-exported from `@lit/context`, so you can import everything from one place.
