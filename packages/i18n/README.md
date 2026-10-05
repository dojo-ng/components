# @dojo-ng/i18n

Locale, formatting, and translated messages for Dojo NG components.

There is no provider element. A component reads `lang` and `dir` from its nearest ancestor that sets them, then from the document, then from the default locale.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.

## Install

```bash
npm install @dojo-ng/i18n
```

## Usage

Register French strings for the `dj` namespace, then set `lang`. Components on the page re-render in French.

```html
<dj-alert closable>Enregistré.</dj-alert>
<script type="module">
  import "@dojo-ng/alert";
  import { messages } from "@dojo-ng/i18n";
  messages.register("dj", "fr", { close: "Fermer" });
  document.documentElement.lang = "fr";
</script>
```

## Locale and direction

- `getLocale(el)` and `getDir(el)` return the locale and direction that apply to an element. They also look outside shadow roots.
- `LocaleController` keeps a Lit component's `locale` and `dir` current, and re-renders the component when either one changes.
- `setDefaultLocale()` sets the locale to use when no `lang` is found. The default is `en`.
- Only changes to `lang` and `dir` in the light DOM are observed. That is where they are usually set.

## Formatting

- `formatDate`, `formatNumber`, `formatList`, and `plural` use the native `Intl` APIs and take an explicit locale.
- The `Intl` objects are cached by locale and options, because they are slow to create.
- `format(template, params)` fills `{name}` placeholders.

## Messages

- `messages` is the shared `MessageStore`. It keeps message bundles by namespace and locale.
- A lookup tries the locale, then its base language, then the default locale, then `en`. For example, `fr-CA` tries `fr-ca`, then `fr`, then `en`.
- Every component registers its English strings under `en`, so it always has labels, even with no translations loaded.
- The built-in component strings use the `dj` namespace.
- Register translations before the components render, or before you change `lang`. Registering messages does not re-render components that are already on the page.

## Loaders

- `staticLoader(data)` serves bundles that you include at build time.
- `fetchLoader(pattern)` fetches one JSON file for each namespace and locale. The default pattern is `/i18n/{ns}.{locale}.json`.
- For your own transport or cache, write an object with a `load(namespace, locale)` method that returns a promise of messages.

## Examples

### Load translations from JSON files

Set a loader, load the bundle, then switch `lang`.

```js
import { messages, fetchLoader } from "@dojo-ng/i18n";

messages.setLoader(fetchLoader("/i18n/{ns}.{locale}.json"));
await messages.load("dj", "de"); // fetches /i18n/dj.de.json
document.documentElement.lang = "de";
```

### Format in your own component

`LocaleController` gives the component its locale and re-renders it when `lang` changes.

```js
import { LitElement, html } from "lit";
import { LocaleController, formatDate, plural } from "@dojo-ng/i18n";

class VisitSummary extends LitElement {
  static properties = { when: { attribute: false }, count: { type: Number } };
  #i18n = new LocaleController(this);

  render() {
    const { locale } = this.#i18n;
    return html`${formatDate(this.when, locale, { dateStyle: "medium" })}:
      ${plural(locale, this.count, { one: "{count} visit", other: "{count} visits" })}`;
  }
}
customElements.define("visit-summary", VisitSummary);
```
