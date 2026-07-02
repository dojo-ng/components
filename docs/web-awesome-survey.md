# Web Awesome survey: component ideas and cross-framework gotchas

Web Awesome is the successor to Shoelace, from the Font Awesome team: a framework-agnostic
web component library themed with CSS custom properties, loaded as ES modules, with a free
tier and a paid Pro tier. It is the closest peer to Dojo NG in approach, so it is a useful
source for two things: components worth considering for our roadmap, and the cross-framework
problems they have already hit and documented. Surveyed June 2026 against the Shoelace
component list (the stable, fully published catalog) and Web Awesome's additions.

## Component ideas

Mapped against the current Dojo NG set. Equivalents we already ship are listed so the gap is
honest.

Worth considering (we have no equivalent):

- Color picker: HEX/RGB/HSL/HSV with an optional alpha channel. Common in real apps; we lack
  it.
- Alert: an inline, optionally dismissible status banner. Distinct from our `dj-snackbar`
  (transient, floating) and `dj-result` (full-page state).
- Badge: a small count or status marker. Related to `dj-chip` but a separate, simpler role.
- Skeleton: content-shaped loading placeholders. We have `dj-loading-indicator` (spinner and
  linear) but no skeleton.
- Split panel: a draggable divider between two resizable panes. Our layouts are fixed; this
  is interactive.
- Carousel: a slide/scroll gallery with controls. No equivalent.
- Dropdown and menu primitive: Web Awesome and Shoelace ship a generic dropdown plus menu and
  menu item. We have `dj-context-menu` and the popups, but not a general dropdown/menu pair.
- File input: a styled file picker. We have the input family but no file input. Web Awesome
  ships this as a free component.
- Copy button: one-click copy with feedback. Small, frequently wanted.

Already covered by a Dojo NG equivalent:

- Drawer maps to `dj-slide-pane`; toast to `dj-snackbar`; popover to `dj-popup` /
  `dj-trigger-popup`; combobox to `dj-typeahead`; tag to `dj-chip`; details to `dj-accordion`
  and `dj-title-pane`; spinner to `dj-loading-indicator`; the format helpers (bytes, date,
  number, relative time) to our `@dojo-ng/i18n` formatting components; the observer wrappers
  (mutation, resize, intersection) to `@dojo-ng/global-event` and component-internal
  observers; rating to `dj-rate`; range to `dj-slider` / `dj-range-slider`.

Lower priority or niche: QR code, image comparer, markdown renderer, animated image,
animation, video and video playlist, zoomable frame, scroller, include (HTML partial loader).
Web Awesome also sells "Patterns," which are copy-paste HTML, not custom elements, so they are
out of scope for a component library.

## Cross-framework gotchas

The useful part. Several of these we already handle; a couple are points in our favor worth
keeping.

Form participation and listener timing. Shoelace and Web Awesome predate broad
form-associated-custom-element support, so they collect form values by listening for the
form's `formdata` event and appending values there. The documented consequence: if you also
add a `submit` or `formdata` listener, you must add it after the controls are defined, or your
handler runs before the library injects its data. Dojo NG instead uses form-associated custom
elements through `ElementInternals`, so the browser collects values natively at submit time
and this ordering gotcha does not arise. Keep that as an advantage of our approach, and keep
loading `element-internals-polyfill` for Safari below 16.4 where it is needed.

`form.elements` visibility. With the `formdata`-event approach, shadow-DOM controls do not
appear in `HTMLFormElement.elements`, so Shoelace ships a `getFormControls()` helper. Our
form-associated controls appear in `form.elements` natively, since the browser knows them as
form-associated, so no helper is needed. Confirmed in a browser (June 2026): `dj-text-input`,
`dj-text-area`, `dj-checkbox`, `dj-switch`, and `dj-radio` all enumerate in `form.elements`
alongside a native input, and `form.elements.namedItem("username")` resolves to the
`dj-text-input`. Add this as a QA test case.

React. Before React 19, React passed all props as attributes (rich data became
`"[object Object]"`) and could not bind custom events without a wrapper; the common fix was a
generated wrapper such as `@shoelace-style/react-wrapper` or listening with `onSlInput`-style
handlers. React 19 sets matching DOM properties and supports custom events. Our guidance
already says this, our property-first renderer does it, and the consumer usage linter's DUS002
catches array/object data passed as an attribute.

Validation-state styling hook. Shoelace exposes validity for styling through data attributes
(`data-user-invalid`, `data-user-valid`, `data-required`, and so on), a deliberate workaround
until `ElementInternals.states` and custom validity pseudo-classes are widely supported. Our
controls own validity through `ElementInternals`; consider exposing similar state hooks (data
attributes or `::part` selectors) so consumers can style invalid and valid states without
reaching into the shadow root. This is a small, consumer-facing addition worth a backlog item.

SSR. Web Awesome notes the standard position: components render as custom-element HTML, full
hydration needs JavaScript, and declarative shadow DOM is the path to no-JS initial render.
Relevant only if Dojo NG pursues SSR later.

## What this validates about the Dojo NG approach

Web Awesome's Charts component is a wrapper around Chart.js, which draws to canvas. That is
opaque to CSS tokens, `::part()`, and assistive tech, the same problem we avoided by building
`dj-chart` on D3 math with our own SVG. The comparison supports the anti-canvas choice.

The rest of their model matches ours and confirms the direction: framework-agnostic custom
elements, three-layer token theming (global tokens, component properties, `::part`), built-in
accessibility, and lazy loading by import. Where we differ deliberately, it is toward newer
platform features (form-associated elements over the `formdata` event) and toward owning the
SVG for charts.

## Actions taken

- Component ideas folded into `widget-gap-analysis.md` under a Web Awesome comparison.
- The cross-framework gotchas relevant to consumers added to the `dojo-ng` skill's
  `framework-app-composition` reference.
- Candidate new components and the validation-state styling hook proposed as backlog items for
  triage (not yet committed).

## Sources

- [Web Awesome components](https://webawesome.com/docs/components)
- [Shoelace component list and Form Controls page](https://shoelace.style/getting-started/form-controls)
- [Shoelace React wrapper](https://github.com/shoelace-style/react-wrapper)
- [Framework-agnostic UI with Web Awesome (OpenReplay)](https://blog.openreplay.com/framework-agnostic-ui-web-awesome/)
- [Complete free/pro component list discussion](https://github.com/shoelace-style/webawesome/discussions/1353)
