# The element-internals-polyfill

## Who needs it

Our browser baseline is evergreen browsers plus Safari 15 and later. `ElementInternals`
with form association landed in Safari 16.4 (Chrome has had it since version 77, Firefox
since 93, Edge since 79). If a consumer's own support matrix includes Safari 15 through
16.3, or an older WebKit-based engine, they need the polyfill. Everyone else can skip it.

## What happens without it

Every form-associated `dj-*` control calls `attachInternals()` in its constructor. On a
browser without `ElementInternals`, that call throws, so the element fails to construct.
The control simply does not appear on the page: no error banner, no fallback markup, just
a missing element where a `dj-text-input` or `dj-select` should be.

## How to load it

Add `element-internals-polyfill` to the import map and import it before the first `dj-*`
import:

```html
<script type="importmap">
  {
    "imports": {
      "element-internals-polyfill": "https://esm.sh/element-internals-polyfill",
      "@dojo-ng/text-input": "https://esm.sh/@dojo-ng/text-input"
    }
  }
</script>
<script type="module">
  import "element-internals-polyfill";
  import "@dojo-ng/text-input";
</script>
```

Loading it in a browser that already supports `ElementInternals` is harmless: the polyfill
feature-detects and no-ops when the native API is present, so there is no need to branch
on user agent.

## How our own test suite handles it

`tests/setup.js` installs a minimal `attachInternals` shim for happy-dom, which ships no
`ElementInternals` support. The shim exists so component tests can run without pulling in
the full polyfill; it is not a substitute for it in a real browser, and the polyfill is not
a dependency of the test suite.

## Forms still work natively

Because the controls are form-associated through `ElementInternals`, they contribute to
`FormData` and appear in `form.elements` without a serialization helper, whether or not the
polyfill is loaded. A `submit` listener does not need to wait for the controls to attach,
unlike libraries that collect values through a `formdata` event and require listeners
attached after the controls are defined.
