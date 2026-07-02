# Dojo NG internationalization proposal

How Dojo NG components localize text, format locale-sensitive values, and load translations.
The design serves the project's guiding principles in order: code quality, performance,
suitability for large web apps, and easy dynamic addition to an SPA. It is framework-agnostic
and leans on the platform.

This is a proposal for review, not built yet. It reflects four decisions already made: a
proposal first; locale carried on the `lang` attribute with a reactive controller; native
`Intl` plus a small interpolation helper with no library dependency; and a pluggable async
loader that keeps the good part of Holmes Corp's DYNLS without its coupling.

## What we keep from DYNLS, and what we don't

DYNLS in app3 is a dynamic NLS loader. It fetches the list of namespaces from a service, loads
each namespace bundle on demand, caches bundles in IndexedDB compressed, and refreshes them in
the background when they are more than two hours old. It returns Dojo `Bundle` objects with
lazy per-locale loaders. The shape is good: namespaced, asynchronous, cached, and
stale-while-revalidate, behind a single service call.

The problem is not the loader. It is what got loaded through it. Because DYNLS delivers
server-driven, cached, namespaced key/value data for free, callers put non-text data in it. The
ML study-plan code reads `recommended_to_flag` from the `ditabook` namespace and parses it to an
integer. The resource parsers read `messages[topicid]` as a JSON string. The glossary builds a
service URL from `messages.glossary_url`. Whole namespaces such as `settings` and `open` hold
application config and state rather than translations. DYNLS became the de facto dynamic-config
and feature-flag channel.

The lesson drives two choices. Keep the loader shape as a clean, pluggable abstraction. Keep
localization and dynamic configuration as separate concerns so translations do not become a
junk drawer again. Dojo NG's i18n loads messages; it does not become an app's config bus.

## Scope

Two surfaces need internationalization.

Component-internal text is small. Only the calendar formats locale-sensitive output today
(month and weekday names through `Intl`). About eight components carry hardcoded English
defaults for ARIA labels and placeholders: the dialog, slide pane, and tab close labels, the
date input's "Open calendar", the password reveal labels, the select placeholder, the range
slider's "Range", and the confirmation popup's "OK" and "Cancel". Most are already overridable
through properties, so the work is to give each a localizable default rather than a bare English
string.

Locale-sensitive formatting is the larger win: dates in the calendar and date input, times in
the time picker, and numbers wherever they appear, all through `Intl`, plus a shared locale
signal so every component on the page reacts together when the locale changes.

Application message bundles are the third surface. Apps built on Dojo NG need to localize their
own content, and they need the dynamic-loading capability DYNLS provided. The package serves
this without prescribing where bundles come from.

## The package: `@dojo-ng/i18n`

A small package with four parts, each usable on its own.

A locale signal. The current locale is read from the `lang` attribute on the closest ancestor
that sets one, falling back to the document and then to a configured default. This is the
platform-native mechanism, it works in any framework, and it needs no provider in the tree. A
`LocaleController` (the same reactive-controller pattern as `StoreController`) makes a component
re-render when the effective locale changes, watching for `lang` changes with a
`MutationObserver` and a small shared registry so one observer serves many components. An
optional `<dj-locale lang="fr-CA">` element is sugar for setting `lang` on a subtree and, when
asked, for supplying a message loader to its descendants.

Formatting helpers over native `Intl`. Thin, memoized wrappers around `Intl.DateTimeFormat`,
`NumberFormat`, `RelativeTimeFormat`, `PluralRules`, `ListFormat`, `Collator`, and
`DisplayNames`. Memoizing the `Intl` constructors matters: they are expensive to build, so we
cache them by locale and options. These helpers take an explicit locale or read the ambient one
from the controller.

A message resolver. Messages are plain objects keyed by namespace, so `{ namespace: { key:
value } }`. Resolution walks a fallback chain: the requested locale, its base language, then the
default locale. A small `format(message, params)` helper does `{name}` placeholder
interpolation and basic pluralization through `Intl.PluralRules`, which covers the common cases
without an ICU library. If full ICU MessageFormat is ever needed, it can be added behind the
same `format` call.

A pluggable loader. This is DYNLS's good part, decoupled. The loader is an interface, not an
implementation:

```ts
interface MessageLoader {
  namespaces?(): Promise<string[]>;
  load(namespace: string, locale: string): Promise<Messages>;
}
```

The package ships a simple default that fetches a JSON file per namespace and locale, and a
static loader that resolves from an in-memory map for apps that bundle their messages. An app
that wants DYNLS's behavior supplies its own loader that calls its RPC service and caches in
IndexedDB with stale-while-revalidate. The caching, transport, and compression stay in the
app, not in the library, so Dojo NG never depends on a specific backend, on Dexie, or on
`window.hcstatic`. A small in-memory cache and request de-duplication live in the resolver so
repeated lookups do not refetch.

## How a component uses it

A component installs a `LocaleController`, reads its own default bundle, and overlays any
app-provided messages for its namespace. User-facing strings resolve through the message
resolver with the component's English defaults as the final fallback, so a component is always
fully labeled even with no messages loaded. Explicit properties such as `close-text` still win,
because an author who sets a string means it.

Formatting-heavy components ask the controller for the ambient locale and pass it to the `Intl`
helpers. The calendar already takes a `locale` property; that stays as an override, with the
ambient locale as the default.

## Right-to-left and bidi

Direction follows the `dir` attribute, the platform-native signal, which the browser already
propagates. Components lean on CSS logical properties (`inline-start`, `margin-inline`, and so
on) so layout mirrors without extra code; the existing styles largely do this already and the
retrofit will close the gaps. One known issue: the range slider's track-click maps the pointer
position left to right and needs a right-to-left branch. That is folded into this work.

## Component retrofit

The retrofit is mechanical and proceeds component by component. Replace each hardcoded English
default with a resolved message that falls back to the same English string, so behavior is
identical until messages are supplied. Route the calendar, date input, and time picker through
the shared `Intl` helpers and the ambient locale. Audit number rendering. Audit each component's
styles for physical properties that should be logical for right-to-left. None of this changes a
component's public API; it adds localization underneath.

## Migration from Dojo i18n and DYNLS

For a Holmes app moving onto Dojo NG, the mapping is direct. A Dojo `Bundle` becomes a namespace
of messages. The DYNLS service call becomes a `MessageLoader` the app provides, reusing its
existing RPC and IndexedDB code. The lazy per-locale loaders map onto the resolver's
locale-aware `load`. The one deliberate change: data that is not text moves out of message
namespaces. A separate dynamic-config channel, built on `@dojo-ng/store` or `@dojo-ng/context`,
is the right home for flags, URLs, tuning numbers, and per-topic JSON. Documenting this boundary
is part of the work so the next generation of code does not refill the junk drawer.

## Phasing

1. Build `@dojo-ng/i18n`: the locale controller, the memoized `Intl` helpers, the resolver with
   interpolation and pluralization, the loader interface, and the static and fetch default
   loaders. Verify in isolation.
2. Retrofit the formatting components first (calendar, date input, time picker, number display),
   since they deliver the most visible benefit.
3. Retrofit component-internal strings across the labeled components, each with an English
   default fallback.
4. Right-to-left audit, including the range-slider fix.
5. Documentation: a localization guide, the loader contract, and the i18n-versus-config
   boundary. Add a locale switch to the playground for manual confirmation.

## Open questions

- Default locale and fallback: assume `en` as the final fallback unless the app configures
  otherwise. Confirm whether a regioned default (`en-US`) is wanted.
- Whether the `<dj-locale>` element ships in the first cut or waits until an app needs subtree
  scoping. The `lang` attribute alone covers the common case.
- Whether to provide a thin reference implementation of a caching RPC loader as a separate,
  optional package so apps are not rebuilding DYNLS from scratch, while keeping it out of the
  core.
