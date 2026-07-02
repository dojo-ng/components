# Dojo NG accessibility

How accessibility works across the Dojo NG components, what the library handles for you,
and what stays the application author's job. The target is WCAG 2.2 AA at the component
level. Components can't guarantee a conformant page on their own: page structure, heading
order, landmark regions, reading order, and most of the document-level success criteria
belong to the app that uses them. This doc covers the part the components own.

A note on testing. Accessibility behavior that depends on real focus, real layout, or CSS
media features can't be checked in a headless DOM. We verify logic and structure in tests
and confirm the rest in a browser. Where a claim below needs a browser to see, it says so.

## Keyboard interaction

Every interactive component is operable from the keyboard, and the visible focus indicator
follows the real focused element (see Focus visibility).

Grouped controls use a roving tabindex so the group is a single Tab stop and the arrow keys
move within it. This applies to the radio group (arrow keys move and select), the tab
container (arrows move between tabs), and the data grid (Up/Down move the active row, Home
and End jump to the ends, Space or Enter toggles selection). The selected item is the one
Tab lands on; if nothing is selected, Tab lands on the first enabled item.

Overlays manage focus. The dialog and the slide pane trap Tab and Shift+Tab inside the
overlay while open, move focus inward when they open (first interactive control, else the
close button), and restore focus to the previously focused element on close. Escape closes
them when closing is allowed. Both share one focus-trap helper in `@dojo-ng/dojo-element`
(`collectFocusables`, `trapTabKey`), so the behavior is identical.

The popup-backed inputs (select, typeahead, chip typeahead, date input, time picker) close
their popup on three actions: Escape, a click outside, and moving focus out of the
component with Tab. The focus-out case uses a shared `dismissOnFocusOut` helper that closes
the popup once focus has left the component, while leaving it open when focus moves into the
popup list itself.

### Safari and the keyboard-navigation setting

On macOS, Safari does not Tab to checkboxes, radio buttons, switches, or buttons unless the
user turns on "Keyboard navigation" (System Settings, Keyboard). This is off by default, and
it affects native controls the same way it affects ours. Our controls are built on real form
inputs, so they follow the system setting rather than working around it. If Tab appears to
skip a checkbox or radio in Safari, that is the setting, not the component; the same page
Tabs through every control in Chrome and Firefox. The library does not override this, because
doing so would make Dojo NG controls behave differently from the platform.

## Accessible names and roles

Components carry the ARIA roles their behavior implies: `combobox` and `listbox` for the
selects, `switch`, `radiogroup`, `tablist` and `tab`, `tree` and `treeitem`, `grid` with
`row`, `columnheader`, and `gridcell`, `progressbar`, `slider`, and so on. The snackbar is an
`aria-live` status region so its message is announced.

Label association does not cross the shadow boundary the way `for`/`id` does in light DOM, so
the input components set the inner control's `aria-label` from the `label` property whenever
a label is present. Clicking the visible label still focuses the control. When you supply your
own label through a slot, give the control an accessible name yourself.

## Focus visibility

Focus rings use one set of tokens: `--dj-focus-ring`, `--dj-focus-ring-color`, and
`--dj-focus-ring-offset`. A component renders the ring with `outline` on `:focus-visible`, so
the ring shows for keyboard focus and not for mouse clicks on controls where that distinction
makes sense. Re-theme the ring by overriding the tokens.

Every interactive surface has a ring, including the ones that are easy to miss: the range
slider thumbs (both of them), the breadcrumb links, a clickable card, the date input's
calendar button, and the wizard steps. The text inputs draw their focus state with a colored
border instead of an outline, which is intentional for a text field; forced-colors mode
swaps that for a real outline (see below).

## Color and contrast

Two separate mechanisms exist here, and they are easy to confuse.

The high-contrast theme is an opt-in token set: `data-dj-theme="high-contrast"`. It is black
on white with heavy borders, a thick focus ring, and saturated status and link colors. It is
a normal theme that any user or app can choose, and it is a comfortable default for anyone who
wants maximum contrast.

Forced colors is the operating-system mode, mainly Windows High Contrast Mode, exposed to CSS
as `@media (forced-colors: active)`. In that mode the OS supplies the palette and ignores most
author colors, drops `box-shadow`, and honors `outline` plus the system color keywords
(`Canvas`, `CanvasText`, `ButtonText`, `Highlight`, `HighlightText`, and the rest). The
components handle it in three ways:

- Focus rings that a component drew with `box-shadow` (the text input family, the rich-text
  editor) switch to a real `outline` so focus stays visible.
- State shown only through a background or text color uses the system selected pair
  (`Highlight` on `HighlightText`): the checked checkbox, radio, and switch; the selected list
  row, tree row, and grid row; the active tab; the selected calendar day; a checked chip.
- Elevation that relied on a shadow gets a border so the surface keeps its edge: the card,
  dialog, slide pane, tooltip, snackbar, and floating action button. Fill bars (slider, range
  slider, progress) border their track and fill with `Highlight`.

Confirm forced-colors behavior in a real environment. Chrome DevTools can emulate it: Rendering
panel, "Emulate CSS media feature forced-colors: active".

## Target size

Interactive targets are at least 24 by 24 CSS pixels, meeting WCAG 2.2's minimum. Most
controls were already larger. The small ones were brought up to size without changing how they
look: the chip and tab close buttons and the date and password field buttons now have a 24 px
hit area around a smaller icon, and the checkbox, radio, and switch keep their compact visual
size but carry an invisible 24 px hit area so the tap target is large enough. The sliders give
their pointer track a 24 px height while the thumb stays small.

## Pointer and dragging

Anything you can operate by dragging, you can also operate with a single pointer and without
dragging, per WCAG 2.5.7. The single slider moves to a clicked position on its track, which is
the native range-input behavior. The range slider does the same through an explicit handler: a
press on the track (not on a thumb) jumps the nearer thumb to that position. Both sliders are
also fully keyboard-operable with the arrow keys.

## Focus not obscured

WCAG 2.4.11 asks that a focused element not be entirely hidden by author content such as a
sticky header or footer. No component hides its own focused content: the data grid's sticky
header sits above the scrolling region rather than over it, and the overlays reposition to stay
within the viewport. A sticky bar that the application adds around or over the components is the
application's responsibility. If you add one, set `scroll-padding` on the scroll container so
focused elements scroll clear of it.

## Motion

Components honor the user's `prefers-reduced-motion` setting. Any component that animates
composes a shared `reducedMotion` rule (exported from `@dojo-ng/dojo-element`) that collapses
transition and animation durations to near-zero when the user asks for reduced motion, so
motion-conveyed state still settles instantly rather than animating. The loading indicator,
which uses keyframe animations, handles the preference directly. When you build a component that
animates, compose `reducedMotion` into its `styles` array.

## Known limitations and roadmap

- The range slider's track-click maps the pointer position left to right and does not yet
  account for right-to-left layout. This is tied to the internationalization work.
- The data grid navigates by row in v1. Cell-level keyboard navigation is a v2 feature.
- Forced-colors covers the interactive controls, state, and elevation. The loading spinner and
  a few decorative surfaces are not yet tuned for it.
- Internationalization (per-component localization, locale-aware formatting, and right-to-left)
  is tracked separately and affects some of the above.

## Quick reference for component authors

When you build or extend a component, keep these in place:

- Give the real interactive element a role and an accessible name; set `aria-label` from a
  `label` property since `for`/`id` does not cross the shadow boundary.
- Draw the focus ring from the `--dj-focus-ring` tokens on `:focus-visible`.
- Keep interactive targets at 24 px or larger, using an invisible hit area when the visible
  control must stay small.
- For grouped controls, use a roving tabindex with arrow-key movement.
- Add an `@media (forced-colors: active)` block whenever you signal state or elevation with a
  color or shadow.
- Provide a single-pointer alternative to any drag interaction.
