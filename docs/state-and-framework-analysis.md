# How much framework do Dojo NG components need?

The question is how much framework the component library should carry to support
interactions between components and the mostly invisible objects around them: shared state,
data, and services. The answer has to respect the project's principles, especially
suitability for large applications and being easy to drop into an SPA. The short version:
keep the components framework-agnostic and lean on web-standard mechanisms, providing thin
optional adapters rather than a bespoke runtime.

## What Dojo 2 provided

Dojo's framework gave components four kinds of support, all coupled to its virtual-DOM
reactivity:

- `icache`: invalidating local state, including async values, so a widget could hold state and re-render when it changed.
- `stores`: a global store using JSON-pointer paths and `process` commands to mutate state, injected into widgets through a registry. This is a Redux-shaped central store.
- `resources`: a data layer for collections, with paged read requests and responses, memoized through `icache`.
- `injector` / registry: dependency injection, used to provide the store, the theme, and i18n to widgets without threading them through properties.

This is real capability, but it is Dojo's runtime. A component written against it only runs
inside a Dojo application. For a library whose goal is to replace those widgets with
standard custom elements that work anywhere, re-creating that runtime would reintroduce the
lock-in we are trying to shed.

How Holmes Corp actually coordinates state today is also worth noting: the app3 widgets use
`@holmescorp/pub-sub` for cross-widget messaging and keep authoritative state such as quiz
session progress on the server, keyed by session id. The component library should be able to
participate in that world without depending on it.

## The layered answer for web components

Most needs are met by mechanisms the platform and Lit already give us, in increasing order
of scope. Reach for the lightest one that solves the problem.

Local component state is a solved problem: Lit reactive properties for simple cases and
reactive controllers for reusable stateful behavior. No framework required.

Parent-to-child and child-to-parent communication uses the native contract: set properties
and attributes downward, dispatch events upward. Our `DojoElement.emit()` already
standardizes composed, bubbling custom events for this. A component exposes a clean
attribute/property/event surface and nothing more, which is exactly what makes it usable
from React, Angular, Vue, or no framework at all.

Ambient services and shared dependencies, where prop drilling would be painful, are the job
of the W3C Context Protocol, implemented by `@lit/context`. A provider near the top of the
tree exposes a value (a service, a store handle, the current user), and any descendant
consumes it by context key without the intervening components knowing about it. It is a
community-protocol standard, so providers and consumers interoperate even across different
implementations, which fits a large, mixed codebase.

Shared, observable state, the "invisible objects" that several components read and write, is
where a real choice exists. Three reasonable options:

1. Signals. The TC39 Signals proposal, integrated via `@lit-labs/signals`, gives fine-grained reactivity: components that watch a signal update when it changes, with deep observability that Lit's own shallow property reactivity does not provide. It is the most ergonomic fit, but as of 2026 it is still a Labs package tracking a proposal, so it carries churn risk.
2. An external store. A small store library (for example Zustand-, Valtio-, or Redux-style) held as a plain object and surfaced to components through a reactive controller and/or context. Mature and framework-neutral, at the cost of a little more wiring.
3. Their existing pub-sub. Bridge `@holmescorp/pub-sub` (or any event bus) behind a controller so components subscribe and re-render. Useful for fitting into the current app without imposing a new model.

Data fetching and caching should live outside the components entirely, in a query/resource
layer (a TanStack-Query-style cache, or simple controllers) provided through context.
Components receive data as properties and emit intent as events; they do not fetch. This
keeps them presentational and testable and avoids baking a data runtime into the library.

## Recommendation

Do not build a Dojo-style framework into the library. Make the baseline contract
properties-in, events-out, so every component is a standard custom element with no runtime
dependency beyond Lit. Adopt the Context Protocol as the one sanctioned way to inject
services and store handles. For shared reactive state, standardize on a single small
abstraction, exposed through a controller so the components never import a specific store
directly; start with an external store for stability and adopt signals once they settle.
Keep data and services as plain objects provided through context, never as components.

Ship any of this that proves reusable as thin, optional adapter packages
(`@dojo-ng/context-*`, a store controller) rather than a single framework dependency. A
component must remain useful with none of them loaded.

This keeps the library suitable for large applications, where teams already have their own
state and data stacks and need components that cooperate rather than dictate, and it keeps
components easy to add to any SPA, since the only hard dependency is the web platform plus
Lit. The cost is that we provide patterns and small helpers instead of a single batteries-
included runtime, which is the right trade for a component set meant to outlive any one
application framework.

## Findings from the first form controls

Building text-input, checkbox, radio, and switch tested the recommendation against real
components, and it held up. None of them needed a framework.

Form participation came entirely from the platform. Form-associated custom elements
(`static formAssociated = true`, `attachInternals()`, `setFormValue`, `setValidity`,
`formResetCallback`) let each control join a native `<form>`, contribute to `FormData`,
report constraint validity, and reset, with no library. This is the clearest evidence that
the data/forms job Dojo's framework used to do is now a web standard.

Three patterns emerged that are worth standardizing but are not framework needs. Native
`for`/`id` label association does not cross shadow boundaries, so composing `<dj-label>`
needed a small click handler to move focus. The `change` event is not composed and does not
escape a shadow root, so controls re-dispatch it from the host, while `input` is composed
and crosses on its own. Radio grouping is not automatic for custom elements, so radios find
their same-name peers through the associated form (or root) and uncheck them.

The key point for the framework decision: nothing here wanted shared cross-component state.
Properties-in, events-out plus ElementInternals covered every case. The first real pull
toward shared state will come with components that coordinate a set, such as a radio-group
wrapper, or select and typeahead in the next tiers. That is the right moment to introduce
the single shared-state abstraction, and not before, which is exactly what this analysis
recommended.

## Decision and implementation (2026-06-19)

Settled: adopt an external store, surfaced through the Context Protocol. The store library
is Zustand's vanilla core (`zustand/vanilla`), chosen for being small, framework-agnostic,
and well-supported. Two packages implement it:

- `@dojo-ng/store` exposes a minimal `ReadableStore` interface (`getState` + `subscribe`) and a `StoreController` Lit reactive controller that re-renders a host when a selected slice changes. Because the controller depends only on that interface, the store library is swappable (Valtio, Nano Stores) without touching components.
- `@dojo-ng/context` is the context-key registry: typed keys (`storeContext`, `localeContext`) built with `@lit/context`'s `createContext`, plus re-exports of the provider/consumer primitives.

The pattern: the store holds shared state, the Context Protocol delivers a store handle by
key so components never import the store module directly, and the registry is the typed
list of keys providers and consumers agree on. A shared-counter demo in the playground
proves it: one store, provided once, consumed by two independent views that stay in sync.

### Decision note: store vs pub/sub vs events

A store and a pub/sub bus are the same observer pattern, and each can be built on the
other, so the choice is by intent, not capability:

- Shared state (what is true now, always readable, reconciled): the store, reached through context.
- A component telling its surroundings something happened: a native bubbling DOM event (`emit()`).
- An ownerless, cross-cutting, transient broadcast with no retained value: a bus.

Pub/sub interop is settled by wrapping, not punting. `@dojo-ng/pubsub` provides the familiar
`publish`/`subscribe` API backed by the store: it retains the last payload per topic and
replays it to late subscribers by default, which matches what most pub/sub callers actually
expect, and it notifies on every publish even when the payload is unchanged. This covers the
roughly 95% of pub/sub usage that is really last-value-wins shared state, so developers used
to `@holmescorp/pub-sub` get the API they expect while the data consolidates onto the store
(the bus exposes its backing `store`, so the same state is also readable via StoreController
and context). True fire-and-forget event traffic that should not retain a value can use
`replay: false` or a plain event. Exact signature alignment with `@holmescorp/pub-sub` can be
tuned once we confirm its API.

`@dojo-ng/pubsub` itself now lives in the `framework` repo, not here (`framework-monorepo-spec.md`
Track C, 2026-08-23) — the integration described above is structural, not a dependency: `store` and
`context` stay in `components`, `ReadableStore` is a shape (`getState`/`subscribe`) that both repos
declare independently, and a `PubSub` built in `framework` satisfies `StoreController`'s parameter
here with no adapter, no cast, and no import across the repo boundary in either direction.

## Open questions to settle

- Which shared-state primitive to standardize on first: an external store now, or wait for signals to stabilize. This affects what the first stateful tier-1 components (select, typeahead, list) are built against.
- Whether to publish a context key registry (a documented set of well-known context keys for theme, locale, and app services) so providers and consumers across the codebase agree.
- (Resolved) Pub/sub interop: provide a store-backed `publish`/`subscribe` wrapper (`@dojo-ng/pubsub`) so existing pub-sub habits keep working while state consolidates on the store. Remaining: confirm `@holmescorp/pub-sub`'s exact signature and align, and decide how server-held session state feeds the store.

## References

- Lit, Context: https://lit.dev/docs/data/context/
- `@lit/context`: https://www.npmjs.com/package/@lit/context
- Lit, Signals: https://lit.dev/docs/data/signals/
- Bringing Signals to Lit Labs: https://lit.dev/blog/2024-10-08-signals/
