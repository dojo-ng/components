# Dojo NG localization guide

How to localize an app built with Dojo NG: set the locale, format dates and numbers, translate
the components' built-in strings, and translate your own content. The package is `@dojo-ng/i18n`.
For the design rationale behind these choices, see `i18n-proposal.md`.

## Mental model

Four pieces, each usable on its own.

The locale is read from the `lang` attribute. A component uses the `lang` of its nearest
ancestor that sets one, so you set the locale by setting `lang` on `<html>` or on any container,
exactly as the platform intends. Direction comes from `dir` the same way.

Formatting goes through native `Intl`, wrapped in small memoized helpers. Dates, numbers, times,
plurals, lists, and so on are formatted for the active locale.

Messages are plain key/value bundles, grouped by namespace and locale, resolved through a
fallback chain. Components ship English defaults; you supply translations.

A loader is how translations arrive. It is an interface you implement (or one of the two
built-in defaults), so the library never dictates where your translations live.

## Setting the locale

Set `lang` on the document or a container:

```html
<html lang="de-DE">
```

Everything under that element formats and resolves messages for German. To scope a locale to
part of the page, set `lang` on a closer ancestor; the nearest one wins. Change `lang` at
runtime and every Dojo NG component on the page updates, because the package watches for
`lang`/`dir` changes with a shared observer.

Resolution order, from most to least specific: the nearest ancestor `lang`, then the document's
`lang`, then the configured default (`en`). `setDefaultLocale("fr")` only changes that last
fallback; it does not override a `lang` set on the page. For right-to-left, set `dir="rtl"`
(usually alongside `lang`), which the components mirror through CSS logical properties.

## What you get for free

Several components already format for the active locale once you set `lang`: the calendar and
date input (month, weekday, and day names), the time picker (option labels), and the sliders and
progress bar (numeric output). No code is needed beyond setting `lang`. The calendar and date
input still accept an explicit `locale` property when you need to override the ambient one.

## Localizing the components' built-in strings

The components carry a handful of English strings: the close labels, "Open calendar", "Select…",
the password show/hide labels, the range label, the confirmation buttons, and the calendar's
month-navigation labels. They all live in one message namespace, `dj`, so you translate them in a
single place.

Register a translation bundle for each locale you support:

```js
import { messages } from "@dojo-ng/i18n";

messages.register("dj", "de", {
  close: "Schließen",
  openCalendar: "Kalender öffnen",
  showPassword: "Passwort anzeigen",
  hidePassword: "Passwort verbergen",
  selectPlaceholder: "Auswählen…",
  rangeLabel: "Bereich",
  confirm: "OK",
  cancel: "Abbrechen",
  prevMonth: "Voriger Monat",
  nextMonth: "Nächster Monat",
});
```

You only need the keys you want to change; anything you omit falls back to English. A component's
explicit property still wins over the resolved message, so `<dj-dialog close-text="...">` always
shows exactly what you set.

## Localizing your own content

Use your own namespace for your app's strings. Register the bundles, then resolve keys for the
active locale. A component reads the locale through a `LocaleController`, which also re-renders
the component when the locale changes.

```js
import { LitElement, html } from "lit";
import { LocaleController, messages, format, plural } from "@dojo-ng/i18n";

messages.register("checkout", "en", {
  title: "Checkout",
  greeting: "Hello, {name}",
  items: "{count} item",
  itemsOther: "{count} items",
});

class CheckoutPanel extends LitElement {
  #i18n = new LocaleController(this);

  render() {
    const loc = this.#i18n.locale;
    const t = (key, params) => messages.resolve("checkout", loc, key, params) ?? key;
    return html`
      <h1>${t("title")}</h1>
      <p>${t("greeting", { name: this.user })}</p>
      <p>${plural(loc, this.count, { one: t("items"), other: t("itemsOther") })}</p>
    `;
  }
}
```

`format(template, params)` replaces `{name}` placeholders. `plural(locale, count, forms)` picks a
CLDR form ("one", "other", and so on) from the locale's rules and interpolates `{count}`.
For dates and numbers, call the formatting helpers with the active locale: `formatDate(value,
loc, options?)`, `formatNumber(value, loc, options?)`, and `formatList(items, loc, options?)`,
plus direct access to the memoized `Intl` factories (`dateTimeFormat`, `numberFormat`,
`relativeTimeFormat`, `pluralRules`, `listFormat`, `collator`, `displayNames`) when you need them.

## Loading translations

How translations reach the store is your choice. Implement the `MessageLoader` interface, or use
one of the two built-ins.

```ts
interface MessageLoader {
  namespaces?(): Promise<string[]>;
  load(namespace: string, locale: string): Promise<Messages>;
}
```

`staticLoader(map)` resolves bundles from an in-memory object, for apps that bundle their
translations at build time:

```js
import { messages, staticLoader } from "@dojo-ng/i18n";

messages.setLoader(staticLoader({
  checkout: { de: { title: "Kasse" }, fr: { title: "Paiement" } },
}));
await messages.load("checkout", "de"); // fetches and registers, de-duplicated
```

`fetchLoader(pattern)` fetches one JSON file per namespace and locale (default
`"/i18n/{ns}.{locale}.json"`). Caching and revalidation are deliberately left to you. To carry
forward the dynamic, cached loading that Holmes Corp's DYNLS provided, supply a loader that calls
your service and caches as you see fit:

```js
const cachingRpcLoader = {
  async namespaces() { return rpc.listNamespaces(); },
  async load(namespace, locale) {
    const cached = await idb.get(namespace, locale);
    if (cached && !stale(cached)) return cached.messages;
    const fresh = await rpc.getMessages(namespace, locale);
    await idb.put(namespace, locale, fresh);
    return fresh;
  },
};
messages.setLoader(cachingRpcLoader);
```

The transport, the cache, and the staleness policy stay in your app, so the library never depends
on a specific backend.

## Keep translations and configuration separate

Message bundles are for human-readable text, nothing else. It is tempting to deliver feature
flags, numeric thresholds, endpoint URLs, or JSON blobs through the same channel, because a
loader already gives you cached, server-driven, namespaced key/value delivery. Resist it. That
path turns a translation catalog into an undocumented configuration store that is hard to reason
about and validate. Put dynamic configuration in its own channel, such as `@dojo-ng/store` or
`@dojo-ng/context`, and keep the `i18n` namespaces limited to text.

## Right-to-left

Direction follows the `dir` attribute, which the browser inherits into component shadow DOM, so
the components' CSS logical properties resolve correctly with no extra work. Set `dir="rtl"` on
the document or a container and layout mirrors. The range slider also mirrors its click-to-set
behavior so a press on the track moves the correct thumb. If you read direction in your own code,
`getDir(element)` returns `"ltr"` or `"rtl"` using the same nearest-ancestor rule as the locale,
and `LocaleController` exposes the host's current `dir`.

## API reference

Locale: `getLocale(el?)`, `getDir(el?)`, `localeChain(locale, fallback?)`,
`setDefaultLocale(locale)`, `getDefaultLocale()`, `onLocaleChange(listener)`, and the
`LocaleController` reactive controller (`.locale`, `.dir`).

Formatting: `formatDate`, `formatNumber`, `formatList`, `format`, `plural`, the memoized `Intl`
factories listed above, and `clearIntlCache()`.

Messages: the `MessageStore` class, the shared `messages` instance (`register`, `has`, `get`,
`resolve`, `load`, `setLoader`, `version`), and `registerDefaults(namespace, defaults)` for
component authors.

Loading: the `MessageLoader` interface, `staticLoader(map)`, and `fetchLoader(pattern?)`.

## Known limitations

Locale changes set on `lang` inside a shadow root are not observed; set `lang` in light DOM (the
document or a container), which is the normal case. The built-in `format` covers placeholder
interpolation and simple pluralization through `Intl.PluralRules`; if you need full ICU
MessageFormat with nested selects, wrap a library behind your own resolve call. Reduced-motion
handling is a separate accessibility concern, not part of this package.
