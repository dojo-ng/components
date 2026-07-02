# Dojo framework VDOM: fit with web components and next steps

## The question

The plan is to keep `@dojo/framework` as a utility rather than as a widget toolkit. Most of what the framework offers, the class and functional widget system, the registry, the DOM-measuring middleware, the theming layer, and the custom-element compiler, is redundant once the UI is built from Dojo NG web components that own their own behavior and encapsulation. The piece worth keeping is the VDOM renderer: a small reactive layer that composes a tree and updates it efficiently.

The first thing to settle is whether that renderer can drive a site built mostly from web components. It can. This document records how the VDOM talks to the DOM, what the proofs showed, where the friction is, and what to do next. The framework version examined is 8.0.0, as vendored in `dojo-components/prototype`.

## How the Dojo 8 VDOM talks to the DOM

The renderer sets values on a real DOM node in `core/vdom.js`, in `setProperties`. The dispatch is simple and predictable:

- A string value is written with `setAttribute`. So you address a string-valued prop by its attribute name, in dash-case (`category-key`, `x-label`).
- A non-string value (object, array, number, boolean) is written as a DOM property, literally `node[key] = value`. So you address it by the property name, in camelCase (`data`, `series`, `showGrid`).
- A function prop whose name starts with `on` becomes `addEventListener` with the name after `on`. This covers dash-named custom events: `ondj-hover` binds `dj-hover`.

This maps almost exactly onto the contract a Lit component exposes. Rich data flows in through properties, simple flags and labels flow in through attributes that the component reflects back to properties, and component-emitted events are caught by ordinary listeners. The renderer works on the light DOM and never reaches into a component's shadow root, so the two layers stay cleanly separated.

## What the proofs showed

Three harnesses ran against the real Dojo 8 renderer driving the real `dj-chart`, under Node with happy-dom. All passed.

Interop, 10 of 10. The renderer created the `<dj-chart>` element. The `data` and `series` arrays arrived as DOM properties. The `category-key` and `type` strings arrived as attributes, and the component observed them into its properties. The `showGrid` boolean arrived as a property. The component rendered its SVG with the expected six bars, and a dispatched `dj-hover` reached the `ondj-hover` handler.

Node reuse and state preservation, four of four. A functional widget held the chart's data in `icache` and re-rendered it with new data via an `icache.set`. Across that update the renderer reused the same element instance, an expando stamped on the element survived, the new `data` prop was applied, and the component's internal `@state` (the hovered category, which no prop drives) was preserved. The renderer updates the existing element in place rather than recreating it, so component-local state lives through re-renders.

Keyed list diffing, six of six. A widget rendered a list of charts keyed by id, in order `a, b, c`. After an `icache.set` changed the order to `c, a, d`, the DOM order matched, the surviving `c` and `a` were the same instances moved by key, the new `d` was a freshly created element, and the removed `b` was detached. Keyed reconciliation behaves correctly with custom elements, which is what dynamic lists of components depend on.

Value-bearing form controls, verified separately. The renderer special-cases a prop named `value`, routing it through a `setValue` path. For our custom elements that path reduces to setting the `value` property when it changes, which is correct. A Node POC confirmed value applied as a property, `name` applied as the form-key attribute, controlled re-renders updating the value, and two-way binding through an `oninput` handler back into widget state. A real-browser pass confirmed `FormData` participation: a text-input, checkbox, switch, and radio rendered with programmatic values all contributed correctly, and flipping them programmatically updated `FormData`.

That browser pass also surfaced a defect worth recording. Five controls (checkbox, radio, switch, typeahead, chip-typeahead) pushed their form value into `ElementInternals` only on user interaction, not on a programmatic property change. Controlled rendering through the VDOM sets properties, so those controls updated visually while leaving their form value stale. This is a latent component bug, not a renderer issue: any code that sets `.checked` or `.value` hits it. It is fixed by syncing the form value in `updated()`, matching what text-input and the other correct controls already do. After the fix, the browser `FormData` test passes for all of them.

One caveat on method: happy-dom is a Node DOM, so the Node proofs cover the renderer's DOM operations and the component contract, not pixel layout or real-browser event timing. The form-participation and value-update behavior was confirmed in a real browser, as above.

## How well it fits the web component universe

The fit is good. The renderer's value-dispatch model and its event binding already speak the web-component language, so no shim sits between the two. It is a small reactive layer rather than a framework demanding the whole app conform to it, which suits a component-first design. Keyed diffing gives efficient updates for dynamic lists without per-component bookkeeping. There is also continuity: app3 already leans on the Dojo store, router, and i18n, so keeping the renderer keeps a migration path open instead of forcing a rewrite of the app shell.

The friction is small and now mostly addressed. The string-versus-non-string split (dash-case attribute names for strings, camelCase property names for everything else) is removed by the property-first change described below: the renderer now sets a custom element's string props as properties when the property exists. Custom events bind through `on<name>`, including the dash, which works but reads oddly in app code. The remaining gap is TypeScript. Dojo's `tsx` and `v` do not type arbitrary custom elements. That is a types-and-DX problem, not a runtime one, and the fix is a custom-elements-manifest that generates typings, which serves every framework rather than only Dojo. The `value` special-case is no longer an open risk; it was verified for both controlled updates and form participation, and the audit it prompted fixed five controls that were not syncing their form value on programmatic change.

The honest open question is whether an app built entirely from components needs a VDOM at all, or whether app-level Lit `html` templates would do. The renderer earns its place where there is heavy dynamic composition, keyed lists, and existing Dojo app code to carry forward. That case should be made deliberately, not by default.

## Custom Elements Everywhere

Dojo 8 already passes the Custom Elements Everywhere suite. The suite measures runtime data and event flow, not types or developer experience: passing primitives, arrays, and objects into a custom element, and listening declaratively to events named in lowercase, kebab-case, camelCase, CAPS, and PascalCase. Running the suite's own assertions against the real renderer, with faithful copies of its `ce-with-properties` and `ce-with-event` elements and the exact bindings the suite uses, gives 24 of 24 weighted points with no failures. Non-string values become DOM properties (so arrays, objects, and the camelCase-named property test pass), strings become attributes (the suite accepts either for primitives), and event binding strips the `on` prefix while preserving case and dashes, so every event-name style binds.

The suite does miss one real case: a string value whose target is a camelCase property with no matching dash attribute. The suite's camelCase test uses an object, which Dojo already sets as a property, so the string path is never exercised. The property-first change below closes that gap. An official badge is just plumbing: a Dojo library folder in the suite's repo, no framework changes, roughly half a day.

## Property-first rendering

Backward compatibility with upstream Dojo is not a goal for this fork, so the renderer is changed to be property-first for custom elements, matching React 19 and Angular. In `setProperties`, a string value for a custom element (a tag containing a hyphen) whose instance has a matching property is now assigned as a DOM property; otherwise it falls back to an attribute. Native elements and non-property strings (`data-*`, `aria-*`, `class`) are unchanged, so attributes are still set where attributes are correct. The change is about five lines. The exact patch is in `docs/framework-patches/property-first.md`, ready to apply when the fork repo is stood up.

This needs one companion change in the component library. Form-associated controls associate by the `name` attribute, not the property: a property-only `name` yields an empty `FormData`, confirmed in a browser. Under property-first the renderer sets `name` as a property, so the controls now reflect it (`@property({ reflect: true }) name`), applied to the 11 form controls that expose `name` (the input variants inherit text-input). Verified in a browser: setting `name` as a property reflects to the attribute and the form key appears in `FormData`. The patched renderer was also re-run against the full Custom Elements Everywhere suite and a property-first probe (camelCase string lands as a property, `data-*` and `aria-*` stay attributes, native elements untouched), all passing.

## What to remove from the framework

The renderer's dependency closure is small, and smaller still on an evergreen target. `core/vdom` imports `Registry`, `RegistryHandler`, `diff`, `has`, five `shim` modules (`Map`, `Set`, `WeakMap`, `array`, `global`), and `tslib`. The shims are there for IE11 and are unnecessary for modern browsers: `Map`/`Set`/`WeakMap` are used only as constructors and become the native classes, the `array` shim is used only for `.flat` (native since ES2019), and `global` is `globalThis` (ES2020). `tslib` also drops out if the fork compiles to ES2018 or later, where TypeScript emits native spread and `Object.assign` instead of helpers. So the real keep set is pure framework code with no runtime polyfills.

Keep: `core/vdom` (the renderer: `v`, `w`, `create`, `tsx`), its framework-code closure (`Registry`, `RegistryHandler`, `diff`, `has`), and `core/middleware/icache` for local widget state. Replace the shim imports with native `Map`/`Set`/`WeakMap`, `Array.prototype.flat`, and `globalThis`.

Cut: `core/registerCustomElement` (the widget-to-custom-element compiler), `core/mixins`, `core/decorators`, and `core/meta` (legacy widget authoring); the DOM-measuring and interaction middleware (`dimensions`, `resize`, `intersection`, `drag`, `focus`, `inert`, `breakpoint`), which components own internally; `core/middleware/theme` (components theme through CSS tokens); `core/middleware/validity` (components own validity through `ElementInternals`); and `core/animations`.

Evaluate, deciding by what app3 actually uses: `stores` with `core/middleware/store` and `injector` (Dojo NG has `@dojo-ng/store`, so transitional), `routing` (no Dojo NG replacement yet, so keep), `i18n` (Dojo NG has `@dojo-ng/i18n`, so transitional), `core/middleware/resources`, `block`, and `cache` (keep only where used), and `testing` (replace the widget harness with the Vitest and Web Test Runner plan; a renderer-only assertion helper may be worth keeping). The precise minimal size should be measured by tree-shaking once the fork exists.

## Next steps

1. Stand up the `@dojo-ng/framework` repository (decided) and apply the property-first patch from `docs/framework-patches/property-first.md` to the renderer source.
2. Trim the framework to the keep set above and measure it: bundle size of a renderer-only import against the full framework.
3. Ship a custom-elements-manifest for the components, then generate typings from it. This is the cross-framework answer to the TypeScript gap and replaces the idea of a hand-written interop layer.
4. Run a browser-level app proof through the renderer: a few components, a dynamic keyed list, and a form, confirming interaction, focus, and event flow end to end.
5. Confirm the store, router, and i18n work standalone against a component UI, which establishes the app3 migration path.
6. Optionally publish a Dojo library folder in the Custom Elements Everywhere repo for the badge.
7. Write a short guide on using Dojo NG components from the renderer.
