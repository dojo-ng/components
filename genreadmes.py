"""Generate a first-pass README.md for each package from its source.

Source extraction lives in genlib.py (shared with gencem.py / gendocs.py). For
component packages (those with an `export class Dj...`), emits: description,
install, usage, properties table, and any slots/parts/events, plus
theming/accessibility/i18n pointers and a playground link. For infrastructure
packages (no component class), emits a short README from the package.json
description with a pointer to the relevant guide.
"""
import re, os, json
import genlib as G

PKGS = "packages"

# Infra packages: package dir -> the guide doc to point at.
INFRA_DOC = {
    "dojo-element": "component-conventions.md",
    "theme": "theming-proposal.md",
    "store": "state-and-framework-analysis.md",
    "context": "state-and-framework-analysis.md",
    "pubsub": "state-and-framework-analysis.md",
    "i18n": "i18n-guide.md",
}

# Migration pointers for Dojo widgets superseded by a differently-named component.
NOTES = {
    "typeahead": "Coming from Dojo's **ComboBox**? Typeahead is its successor: an editable field that filters a list. For multi-select, see [`@dojo-ng/chip-typeahead`](../chip-typeahead/README.md).",
    "list": "Coming from Dojo's **Listbox**? Use this component: it provides the selectable listbox role and keyboard model that Listbox did. Set `reorderable` to let items be reordered by drag or keyboard (space to grab, arrows to move, space to drop, escape to cancel); it is controlled — the list emits `dj-reorder` and you reorder `options`.",
    "chart": "Sizing: the chart fills its width and takes its height from the `--dj-chart-height` custom property (default `18rem`). Set that property to resize it; a fixed `height` on a wrapper element will not constrain the chart, and a wrapper shorter than the chart's height will let the legend overflow. The legend sits below the plot and is included in that height.",
    "transition": "The component defines no effects itself: it reflects a `state` attribute you animate with page CSS. Enter effects must be `@keyframes` animations on `dj-transition[state=\"entering\"]`; enter-by-transition is not supported. Leave effects may be an animation on `[state=\"leaving\"]` or transitioned properties.",
    "transition-group": "Coordinates slotted `dj-transition` children only (v1 is stagger, no list-move animation). The effects live on the children; the group just drives their `show` with a delay. Set `appear` on the children directly.",
    "carousel": "Swiping is native scroll-snap, so touch and trackpad work with no drag code and no WCAG 2.5.7 concern; the prev/next buttons are the non-drag path. `loop`, autoplay, and vertical orientation are intentionally not built (autoplay is an accessibility liability). Under `prefers-reduced-motion` button navigation jumps instantly instead of smooth-scrolling. Give the carousel a `label` so the region has an accessible name.",
}

# Worked examples per package: list of (title, description, code). The first is used as the
# primary Usage example; any others render under an Examples section. Code is HTML (with a
# module script where wiring is needed), copy-pasteable into a page that can resolve the
# `@dojo-ng/*` bare imports (an import map or bundler).
EXAMPLES = {
 "button": [
  ("Kinds", "The `kind` property selects contained, outlined, or text styling.",
   '<dj-button kind="contained">Save</dj-button>\n<dj-button kind="outlined">Cancel</dj-button>\n<dj-button kind="text">Learn more</dj-button>'),
  ("With an icon", "Slot an icon and place it with `icon-position`.",
   '<dj-button icon-position="before">\n  <svg slot="icon" viewBox="0 0 24 24" width="18" height="18"><path d="M5 12h14M12 5v14" stroke="currentColor" stroke-width="2" fill="none"/></svg>\n  Add item\n</dj-button>'),
 ],
 "action-button": [
  ("Inherit the surrounding theme", "Renders without imposing its own color, inheriting `--dj-*` tokens from context.",
   '<dj-action-button>Inherit colors</dj-action-button>'),
 ],
 "floating-action-button": [
  ("Fixed position", "Pin it to a screen corner with `position`.",
   '<dj-floating-action-button position="bottom-right" aria-label="Add">\n  <svg slot="icon" viewBox="0 0 24 24" width="22" height="22"><path d="M5 12h14M12 5v14" stroke="currentColor" stroke-width="2" fill="none"/></svg>\n</dj-floating-action-button>'),
 ],
 "text-input": [
  ("Labeled field with validation", "Set `label`, `required`, and read the value from the `input` event.",
   '<dj-text-input label="Email" type="email" required helper-text="We never share it"></dj-text-input>\n<script type="module">\n  import "@dojo-ng/text-input";\n  document.querySelector("dj-text-input").addEventListener("input", (e) => console.log(e.target.value));\n</script>'),
  ("Leading and trailing slots", "Add affixes around the field.",
   '<dj-text-input label="Amount">\n  <span slot="leading">$</span>\n  <span slot="trailing">.00</span>\n</dj-text-input>'),
 ],
 "email-input": [
  ("Required email", "Defaults to `type=\"email\"`; native email validity applies.",
   '<dj-email-input label="Email" required></dj-email-input>'),
 ],
 "number-input": [
  ("Bounded number", "`min`, `max`, and `step` constrain the value.",
   '<dj-number-input label="Quantity" min="1" max="99" step="1" value="1"></dj-number-input>'),
 ],
 "password-input": [
  ("Password with reveal", "A show/hide toggle is built into the trailing slot.",
   '<dj-password-input label="Password" required minlength="8"></dj-password-input>'),
 ],
 "constrained-input": [
  ("Custom validator", "Pass a function returning an error message, or undefined when valid.",
   '<dj-constrained-input label="Username"></dj-constrained-input>\n<script type="module">\n  import "@dojo-ng/constrained-input";\n  document.querySelector("dj-constrained-input").validator = (v) =>\n    /^[a-z0-9_]+$/.test(v) ? undefined : "Lowercase letters, digits, and underscores only";\n</script>'),
 ],
 "text-area": [
  ("Multi-line field", "Set `rows` for the initial height.",
   '<dj-text-area label="Notes" rows="4" maxlength="500"></dj-text-area>'),
 ],
 "native-select": [
  ("Options as data", "Drive the native select from an `options` array.",
   '<dj-native-select label="Country" id="country"></dj-native-select>\n<script type="module">\n  import "@dojo-ng/native-select";\n  document.getElementById("country").options = [\n    { value: "us", label: "United States" },\n    { value: "ca", label: "Canada" },\n  ];\n</script>'),
 ],
 "select": [
  ("Single-select combobox", "Provide `options`; read the choice from the `change` event.",
   '<dj-select label="Fruit" id="fruit"></dj-select>\n<script type="module">\n  import "@dojo-ng/select";\n  const el = document.getElementById("fruit");\n  el.options = [{ value: "a", label: "Apple" }, { value: "b", label: "Banana" }];\n  el.addEventListener("change", () => console.log(el.value));\n</script>'),
 ],
 "typeahead": [
  ("Filter as you type", "`strict` (default) requires the value to match an option.",
   '<dj-typeahead label="Search fruit" id="ta"></dj-typeahead>\n<script type="module">\n  import "@dojo-ng/typeahead";\n  document.getElementById("ta").options = [\n    { value: "apple", label: "Apple" }, { value: "apricot", label: "Apricot" }, { value: "banana", label: "Banana" },\n  ];\n</script>'),
 ],
 "chip-typeahead": [
  ("Multi-select with chips", "Selections render as removable chips; submits each value under `name`.",
   '<dj-chip-typeahead label="Tags" name="tags" id="ct"></dj-chip-typeahead>\n<script type="module">\n  import "@dojo-ng/chip-typeahead";\n  document.getElementById("ct").options = [\n    { value: "red", label: "Red" }, { value: "green", label: "Green" }, { value: "blue", label: "Blue" },\n  ];\n</script>'),
 ],
 "checkbox": [
  ("Labeled checkbox", "Slot the label; listen for `change`.",
   '<dj-checkbox name="terms" value="accepted">I agree to the terms</dj-checkbox>'),
 ],
 "checkbox-group": [
  ("Group from data", "Submits each checked value under `name`.",
   '<dj-checkbox-group label="Toppings" name="toppings" id="tg"></dj-checkbox-group>\n<script type="module">\n  import "@dojo-ng/checkbox-group";\n  document.getElementById("tg").options = [\n    { value: "cheese", label: "Cheese" }, { value: "olives", label: "Olives" },\n  ];\n</script>'),
 ],
 "radio-group": [
  ("Single choice from data", "Provide `options`; the group owns selection and form participation.",
   '<dj-radio-group label="Size" name="size" value="m" id="rg"></dj-radio-group>\n<script type="module">\n  import "@dojo-ng/radio-group";\n  document.getElementById("rg").options = [\n    { value: "s", label: "Small" }, { value: "m", label: "Medium" }, { value: "l", label: "Large" },\n  ];\n</script>'),
 ],
 "radio": [
  ("Standalone radios", "Radios sharing a `name` are mutually exclusive. Prefer `dj-radio-group` for a managed set.",
   '<dj-radio name="plan" value="free" checked>Free</dj-radio>\n<dj-radio name="plan" value="pro">Pro</dj-radio>'),
 ],
 "switch": [
  ("On/off toggle", "Modeled like a checkbox; the flag is `checked`.",
   '<dj-switch name="notify" checked>Email notifications</dj-switch>'),
 ],
 "slider": [
  ("Value with output", "`show-output` displays the current value.",
   '<dj-slider label="Volume" min="0" max="100" value="40" show-output></dj-slider>'),
 ],
 "range-slider": [
  ("Two-thumb range", "Reads back as `{ min, max }`; submits `<name>_min` and `<name>_max`.",
   '<dj-range-slider label="Price" name="price" min="0" max="500" value-min="100" value-max="400" show-output></dj-range-slider>'),
 ],
 "rate": [
  ("Star rating", "0..max stars; form-associated.",
   '<dj-rate name="score" max="5" value="3"></dj-rate>'),
 ],
 "date-input": [
  ("ISO date with calendar", "Type `yyyy-mm-dd` or pick from the popup calendar.",
   '<dj-date-input label="Start date" value="2026-06-15"></dj-date-input>'),
 ],
 "time-picker": [
  ("Time with step", "`step` (seconds) controls the option interval; `format` is 12 or 24.",
   '<dj-time-picker label="Start time" step="1800" format="12"></dj-time-picker>'),
 ],
 "calendar": [
  ("Date picker", "Set `locale` to localize month and weekday names; listen for `change`.",
   '<dj-calendar value="2026-06-15" locale="en-US"></dj-calendar>'),
 ],
 "form": [
  ("Gather field values", "Wrap form-associated components; `dj-submit` carries the values.",
   '<dj-form id="signup">\n  <dj-text-input name="email" label="Email" type="email" required></dj-text-input>\n  <dj-switch name="newsletter">Subscribe</dj-switch>\n  <dj-button type="submit">Sign up</dj-button>\n</dj-form>\n<script type="module">\n  import "@dojo-ng/form";\n  document.getElementById("signup").addEventListener("dj-submit", (e) => console.log(e.detail));\n</script>'),
 ],
 "dialog": [
  ("Open and close", "Toggle `open`; listen for `dj-close`.",
   '<dj-button id="open">Open dialog</dj-button>\n<dj-dialog id="dlg">\n  <span slot="title">Confirm</span>\n  Delete this item?\n  <div slot="actions">\n    <dj-button kind="text" id="no">Cancel</dj-button>\n    <dj-button id="yes">Delete</dj-button>\n  </div>\n</dj-dialog>\n<script type="module">\n  import "@dojo-ng/dialog"; import "@dojo-ng/button";\n  const dlg = document.getElementById("dlg");\n  document.getElementById("open").addEventListener("click", () => (dlg.open = true));\n  document.getElementById("no").addEventListener("click", () => (dlg.open = false));\n</script>'),
 ],
 "slide-pane": [
  ("Edge panel", "Slides in from `align`; toggle `open`.",
   '<dj-button id="open-pane">Open pane</dj-button>\n<dj-slide-pane id="pane" align="right">\n  <span slot="title">Filters</span>\n  Panel content here.\n</dj-slide-pane>\n<script type="module">\n  import "@dojo-ng/slide-pane"; import "@dojo-ng/button";\n  document.getElementById("open-pane").addEventListener("click", () => (document.getElementById("pane").open = true));\n</script>'),
 ],
 "tooltip": [
  ("Hover hint", "Wrap a trigger; content shows on hover/focus.",
   '<dj-tooltip>\n  <dj-button>Hover me</dj-button>\n  <span slot="content">Saves your work</span>\n</dj-tooltip>'),
 ],
 "snackbar": [
  ("Transient message", "Toggle `open`; `type` tints success/error.",
   '<dj-snackbar open type="success">Saved</dj-snackbar>'),
 ],
 "popup-confirmation": [
  ("Confirm before acting", "A trigger opens a small confirm popup; listen for `dj-confirm`.",
   '<dj-popup-confirmation id="pc">\n  <dj-button>Delete</dj-button>\n  <span slot="content">Are you sure?</span>\n</dj-popup-confirmation>\n<script type="module">\n  import "@dojo-ng/popup-confirmation"; import "@dojo-ng/button";\n  document.getElementById("pc").addEventListener("dj-confirm", () => console.log("confirmed"));\n</script>'),
 ],
 "trigger-popup": [
  ("Click to open", "The `trigger` slot toggles the default-slot content.",
   '<dj-trigger-popup>\n  <dj-button slot="trigger">Menu</dj-button>\n  <div>Popup content</div>\n</dj-trigger-popup>'),
 ],
 "card": [
  ("Card with actions", "Title, body, and an actions slot.",
   '<dj-card title="Mont Blanc" subtitle="4,808 m">\n  The highest mountain in the Alps.\n  <div slot="actions">\n    <dj-button kind="text">Details</dj-button>\n  </div>\n</dj-card>'),
 ],
 "header-card": [
  ("Card with a header region", "Slot header content above the body.",
   '<dj-header-card title="Profile">\n  <span slot="header">Avatar and name</span>\n  Body content.\n</dj-header-card>'),
 ],
 "title-pane": [
  ("Collapsible section", "Toggle `open`; the title is the trigger.",
   '<dj-title-pane title="Advanced options" open>\n  Hidden settings live here.\n</dj-title-pane>'),
 ],
 "accordion": [
  ("Stacked panes", "Compose title panes; set `exclusive` to allow only one open.",
   '<dj-accordion exclusive>\n  <dj-title-pane title="One">First</dj-title-pane>\n  <dj-title-pane title="Two">Second</dj-title-pane>\n</dj-accordion>'),
 ],
 "tab-container": [
  ("Tabs with panels", "Provide `tabs`; slot one panel per tab in order.",
   '<dj-tab-container id="tabs">\n  <div>Panel A</div>\n  <div>Panel B</div>\n</dj-tab-container>\n<script type="module">\n  import "@dojo-ng/tab-container";\n  document.getElementById("tabs").tabs = [{ name: "A" }, { name: "B" }];\n</script>'),
 ],
 "wizard": [
  ("Step indicator", "Provide `steps`; set `active-index` as the user progresses.",
   '<dj-wizard id="wz" active-index="1"></dj-wizard>\n<script type="module">\n  import "@dojo-ng/wizard";\n  document.getElementById("wz").steps = [\n    { title: "Account" }, { title: "Profile" }, { title: "Done" },\n  ];\n</script>'),
 ],
 "breadcrumb-group": [
  ("Breadcrumb trail", "Provide `items`; the last is the current page.",
   '<dj-breadcrumb-group id="bc"></dj-breadcrumb-group>\n<script type="module">\n  import "@dojo-ng/breadcrumb-group";\n  document.getElementById("bc").items = [\n    { label: "Home", href: "/" }, { label: "Library", href: "/library" }, { label: "Data", current: true },\n  ];\n</script>'),
 ],
 "pagination": [
  ("Pager", "Set `total` pages and the current `page`; listen for `change`.",
   '<dj-pagination total="10" page="1" id="pg"></dj-pagination>\n<script type="module">\n  import "@dojo-ng/pagination";\n  document.getElementById("pg").addEventListener("change", (e) => console.log(e.detail));\n</script>'),
 ],
 "speed-dial": [
  ("Expanding actions", "A FAB that reveals actions on open.",
   '<dj-speed-dial id="sd"></dj-speed-dial>\n<script type="module">\n  import "@dojo-ng/speed-dial";\n  document.getElementById("sd").actions = [{ label: "Copy" }, { label: "Share" }];\n</script>'),
 ],
 "tree": [
  ("Hierarchy", "Provide `nodes`; `value` is the selected node id.",
   '<dj-tree id="tr" value="src"></dj-tree>\n<script type="module">\n  import "@dojo-ng/tree";\n  document.getElementById("tr").nodes = [\n    { id: "src", label: "src", children: [{ id: "index", label: "index.ts" }] },\n  ];\n</script>'),
 ],
 "list": [
  ("Selectable list", "Provide `options`; read `value` from the `change` event.",
   '<dj-list id="ls"></dj-list>\n<script type="module">\n  import "@dojo-ng/list";\n  const el = document.getElementById("ls");\n  el.options = [{ value: "a", label: "Apple" }, { value: "b", label: "Banana" }];\n  el.addEventListener("change", () => console.log(el.value));\n</script>'),
 ],
 "grid": [
  ("Simple data table", "Provide `columns` and `rows`.",
   '<dj-grid id="gr"></dj-grid>\n<script type="module">\n  import "@dojo-ng/grid";\n  const el = document.getElementById("gr");\n  el.columns = [{ id: "name", header: "Name" }, { id: "role", header: "Role" }];\n  el.rows = [{ name: "Ada", role: "Engineer" }, { name: "Linus", role: "Maintainer" }];\n</script>'),
 ],
 "data-grid": [
  ("Virtualized, sortable grid", "TanStack-backed; provide `columns` and `data`, set a `height`.",
   '<dj-data-grid id="dg" height="320px" selection-mode="multiple"></dj-data-grid>\n<script type="module">\n  import "@dojo-ng/data-grid";\n  const el = document.getElementById("dg");\n  el.columns = [{ id: "name", header: "Name" }, { id: "age", header: "Age" }];\n  el.data = Array.from({ length: 1000 }, (_, i) => ({ name: "Row " + i, age: i }));\n</script>'),
 ],
 "rich-text": [
  ("Rich text editor", "Lexical-based; set and read `value` (HTML).",
   '<dj-rich-text id="rt" label="Description"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  document.getElementById("rt").value = "<p>Hello <strong>world</strong></p>";\n</script>'),
 ],
 "avatar": [
  ("Image or initials", "Show an image, or fall back to initials.",
   '<dj-avatar src="https://example.com/a.jpg" name="Ada Lovelace"></dj-avatar>\n<dj-avatar>AL</dj-avatar>'),
 ],
 "chip": [
  ("Removable chip", "`closeable` adds a remove button; listen for `dj-close`.",
   '<dj-chip closeable>Design</dj-chip>'),
 ],
 "icon": [
  ("Inline SVG icon", "Slot an SVG; it inherits `currentColor` and sizing.",
   '<dj-icon>\n  <svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z" fill="currentColor"/></svg>\n</dj-icon>'),
 ],
 "result": [
  ("Empty or status state", "Compose a heading, message, and actions.",
   '<dj-result>\n  <span slot="title">No results</span>\n  Try a different search.\n</dj-result>'),
 ],
 "text": [
  ("Typographic text", "A small typography primitive.",
   '<dj-text>Body copy.</dj-text>'),
 ],
 "progress": [
  ("Determinate bar", "`show-output` prints the percentage.",
   '<dj-progress value="65" show-output></dj-progress>'),
 ],
 "loading-indicator": [
  ("Spinner", "Pick a `type` (e.g. circular).",
   '<dj-loading-indicator type="circular-small"></dj-loading-indicator>'),
 ],
 "label": [
  ("Label a control", "Wrap the control in the label\'s light DOM for association.",
   '<dj-label>Remember me <dj-checkbox name="remember"></dj-checkbox></dj-label>'),
 ],
 "helper-text": [
  ("Supporting text", "`valid` (tri-state) tints the text for validation feedback.",
   '<dj-helper-text text="Must be at least 8 characters"></dj-helper-text>'),
 ],
 "stack": [
  ("Vertical stack", "Evenly spaces its children.",
   '<dj-stack>\n  <dj-button>One</dj-button>\n  <dj-button>Two</dj-button>\n</dj-stack>'),
 ],
 "carousel": [
  ("Swipeable carousel", "Each top-level slotted element is one item. `per-view` shows N at once (gap-adjusted), `dots` adds a dot per navigable page (pages = items − per-view + 1), and `nav` (default) shows prev/next buttons that disable at the ends. Swiping is native scroll-snap. `dj-slide-change` fires with the settled `{ index }`. Give it a `label` for the region.",
   '<dj-carousel label="Featured" per-view="2" dots>\n  <dj-card>One</dj-card>\n  <dj-card>Two</dj-card>\n  <dj-card>Three</dj-card>\n</dj-carousel>\n<script type="module">\n  import "@dojo-ng/carousel";\n  import "@dojo-ng/card";\n  const c = document.querySelector("dj-carousel");\n  c.addEventListener("dj-slide-change", (e) => console.log("slide", e.detail.index));\n</script>'),
 ],
 "two-column-layout": [
  ("Two columns", "Slot `leading` and `trailing` content.",
   '<dj-two-column-layout>\n  <nav slot="leading">Sidebar</nav>\n  <main>Content</main>\n</dj-two-column-layout>'),
 ],
 "tooltip": [
  ("Hover hint", "Wrap a trigger; content shows on hover/focus.",
   '<dj-tooltip>\n  <dj-button>Hover me</dj-button>\n  <span slot="content">Saves your work</span>\n</dj-tooltip>'),
 ],
 "theme": [
  ("Scoped theme island", "Force a theme for a subtree.",
   '<dj-theme theme="dark">\n  <dj-button>Always dark</dj-button>\n</dj-theme>'),
 ],
 "header": [
  ("App header", "Slot `leading`/`trailing` content around the title; `sticky` pins it.",
   '<dj-header sticky>\n  <button slot="leading">Menu</button>\n  My App\n  <button slot="trailing">Profile</button>\n</dj-header>'),
 ],
 "toolbar": [
  ("Action bar", "Slot `leading`, a title (default), and `actions`; secondary actions collapse into an overflow menu via the `overflow` property.",
   '<dj-toolbar label="Records" id="tb">\n  <dj-button slot="leading" kind="text">Back</dj-button>\n  Records\n  <dj-button slot="actions">New</dj-button>\n</dj-toolbar>\n<script type="module">\n  import "@dojo-ng/toolbar"; import "@dojo-ng/button";\n  const tb = document.getElementById("tb");\n  tb.overflow = [{ value: "export", label: "Export" }, { value: "delete", label: "Delete" }];\n  tb.addEventListener("dj-action", (e) => console.log(e.detail.value));\n</script>'),
 ],
 "chart": [
  ("Line, area, and bar", "Set `data` (array of rows), `series` (one entry per plotted value), and `category-key` (the x accessor). `type` picks the default mark; set `stacked` to stack bars or areas. The chart is responsive, themes via the `--dj-chart-1..8` ramp, and ships a visually-hidden data table plus `role=\"img\"` summary for assistive tech.",
   '<div style="width: 480px; height: 280px">\n  <dj-chart id="c" type="bar" category-key="month" label="Monthly revenue" show-grid x-label="Month" y-label="USD (k)"></dj-chart>\n</div>\n<script type="module">\n  import "@dojo-ng/chart";\n  const c = document.getElementById("c");\n  c.series = [{ key: "revenue", label: "Revenue" }, { key: "target", label: "Target" }];\n  c.data = [\n    { month: "Jan", revenue: 42, target: 40 },\n    { month: "Feb", revenue: 50, target: 45 },\n    { month: "Mar", revenue: 47, target: 48 },\n  ];\n  c.addEventListener("dj-hover", (e) => console.log(e.detail.category));\n</script>'),
  ("Stacked", "Add `stacked` to stack the series (works for bars and areas). Each series takes a color from the theme ramp unless you set `color` on the series.",
   '<div style="width: 480px; height: 280px">\n  <dj-chart id="s" type="bar" stacked category-key="month" label="Revenue by region"></dj-chart>\n</div>\n<script type="module">\n  import "@dojo-ng/chart";\n  const s = document.getElementById("s");\n  s.series = [{ key: "west", label: "West" }, { key: "east", label: "East" }];\n  s.data = [{ month: "Jan", west: 18, east: 14 }, { month: "Feb", west: 22, east: 16 }];\n</script>'),
  ("Horizontal bars", "Set `orientation=\"horizontal\"` on a `bar` chart to put categories on the Y axis and values on the X axis; bars grow rightward from zero. Grouped and stacked both work. The `brush` and a secondary (right) axis are vertical-only, so they are ignored (with a console warning) when horizontal.",
   '<div style="width: 480px; height: 280px">\n  <dj-chart id="h" type="bar" orientation="horizontal" category-key="team" label="Tickets by team" show-grid y-label="Tickets"></dj-chart>\n</div>\n<script type="module">\n  import "@dojo-ng/chart";\n  const h = document.getElementById("h");\n  h.series = [{ key: "open", label: "Open" }, { key: "closed", label: "Closed" }];\n  h.data = [\n    { team: "Platform", open: 12, closed: 40 },\n    { team: "Payments", open: 7, closed: 33 },\n    { team: "Growth", open: 18, closed: 21 },\n  ];\n</script>'),
  ("Markers and number formatting", "Add `markers` to show a point at each datum on line and area series. `numberFormat` (Intl options) formats the y-axis ticks and tooltip values, locale-aware via the document or ancestor `lang`; `formatY` and `formatX` take function overrides. Enter and update transitions honor `prefers-reduced-motion`.",
   '<div style="width: 480px; height: 280px">\n  <dj-chart id="m" type="line" markers category-key="month" label="Monthly revenue" y-label="USD"></dj-chart>\n</div>\n<script type="module">\n  import "@dojo-ng/chart";\n  const m = document.getElementById("m");\n  m.series = [{ key: "revenue", label: "Revenue" }];\n  m.numberFormat = { style: "currency", currency: "USD", maximumFractionDigits: 0 };\n  m.data = [\n    { month: "Jan", revenue: 42000 },\n    { month: "Feb", revenue: 50000 },\n    { month: "Mar", revenue: 47000 },\n  ];\n</script>'),
  ("Scatter and bubble", "`type=\"scatter\"` plots a numeric `x-key` against each series value on linear axes. `type=\"bubble\"` adds a `size-key` that area-encodes the radius. Each point gets a tooltip; the accessible table uses the x value as its row header.",
   '<div style="width: 480px; height: 280px">\n  <dj-chart id="sc" type="bubble" x-key="spend" size-key="deals" label="Spend vs revenue" show-grid x-label="Spend" y-label="Revenue"></dj-chart>\n</div>\n<script type="module">\n  import "@dojo-ng/chart";\n  const sc = document.getElementById("sc");\n  sc.series = [{ key: "revenue", label: "Revenue" }];\n  sc.data = [\n    { spend: 10, revenue: 42, deals: 8 },\n    { spend: 22, revenue: 47, deals: 20 },\n    { spend: 40, revenue: 92, deals: 33 },\n  ];\n</script>'),
  ("Pie and donut", "`type=\"pie\"` (or `\"donut\"`) draws the first series as slices, one per `category-key` value. `inner-radius` (a fraction of the radius) sets the hole; donut defaults to 0.6. The legend lists categories and each slice has a tooltip.",
   '<div style="width: 360px; height: 280px">\n  <dj-chart id="pie" type="donut" category-key="region" label="Revenue share"></dj-chart>\n</div>\n<script type="module">\n  import "@dojo-ng/chart";\n  const pie = document.getElementById("pie");\n  pie.series = [{ key: "value" }];\n  pie.data = [\n    { region: "West", value: 148 },\n    { region: "East", value: 104 },\n    { region: "Central", value: 81 },\n  ];\n</script>'),
  ("Donut with a center label", "On a `donut`, `center-label` renders centered text in the hole (with an optional smaller `center-sub-label` below). It is sized from the hole radius, token-colored, exposed as `part=\"center-label\"`, and appended to the chart's `aria-label` so assistive tech hears it. Ignored for non-donut types.",
   '<div style="width: 360px; height: 280px">\n  <dj-chart id="dl" type="donut" category-key="region" label="Quota attainment" center-label="72%" center-sub-label="of goal"></dj-chart>\n</div>\n<script type="module">\n  import "@dojo-ng/chart";\n  const dl = document.getElementById("dl");\n  dl.series = [{ key: "value" }];\n  dl.data = [\n    { region: "Attained", value: 72 },\n    { region: "Remaining", value: 28 },\n  ];\n</script>'),
  ("Combo with a secondary axis", "A series can override `type` to combine marks (a line over bars), and set `axis: \"right\"` to plot on a secondary y-axis with its own scale. `y-label-right` titles that axis. Useful when two measures share categories but not units (revenue and growth %).",
   '<div style="width: 480px; height: 280px">\n  <dj-chart id="cm" type="bar" category-key="month" label="Revenue and growth" show-grid y-label="USD (k)" y-label-right="Growth %"></dj-chart>\n</div>\n<script type="module">\n  import "@dojo-ng/chart";\n  const cm = document.getElementById("cm");\n  cm.series = [\n    { key: "revenue", label: "Revenue" },\n    { key: "growth", label: "Growth %", type: "line", axis: "right" },\n  ];\n  cm.data = [\n    { month: "Jan", revenue: 42, growth: 4 },\n    { month: "Feb", revenue: 50, growth: 12 },\n    { month: "Mar", revenue: 47, growth: 8 },\n  ];\n</script>'),
  ("Interaction: legend toggle and brush", "`legend-toggle` turns legend items into buttons that show and hide their series (the axes rescale to the visible series). `brush` adds an overview strip below cartesian charts with two draggable, keyboard-focusable handles that set the visible category window; double-click the strip to reset. Emits `dj-legend-toggle` (detail `{ key, hidden }`).",
   '<div style="width: 520px; height: 300px">\n  <dj-chart id="iv" type="line" markers legend-toggle brush category-key="month" label="Revenue vs target" show-grid y-label="USD (k)"></dj-chart>\n</div>\n<script type="module">\n  import "@dojo-ng/chart";\n  const iv = document.getElementById("iv");\n  iv.series = [{ key: "revenue", label: "Revenue" }, { key: "target", label: "Target" }];\n  iv.data = [\n    { month: "Jan", revenue: 42, target: 40 }, { month: "Feb", revenue: 50, target: 45 },\n    { month: "Mar", revenue: 47, target: 48 }, { month: "Apr", revenue: 61, target: 52 },\n    { month: "May", revenue: 58, target: 55 }, { month: "Jun", revenue: 70, target: 60 },\n  ];\n  iv.addEventListener("dj-legend-toggle", (e) => console.log(e.detail));\n</script>'),
 ],
 "three-column-layout": [
  ("Three regions", "Slot `leading`, `center`, and `trailing` content.",
   '<dj-three-column-layout>\n  <nav slot="leading">Left</nav>\n  <main slot="center">Center</main>\n  <aside slot="trailing">Right</aside>\n</dj-three-column-layout>'),
 ],
 "context-popup": [
  ("Right-click popup", "The default slot is the trigger; `content` is shown on right-click.",
   '<dj-context-popup>\n  <div>Right-click this area</div>\n  <div slot="content">Context actions</div>\n</dj-context-popup>'),
 ],
 "context-menu": [
  ("Right-click menu", "Provide `options`; listen for `dj-select`.",
   '<dj-context-menu id="cm">Right-click me</dj-context-menu>\n<script type="module">\n  import "@dojo-ng/context-menu";\n  const el = document.getElementById("cm");\n  el.options = [{ value: "copy", label: "Copy" }, { value: "paste", label: "Paste" }];\n  el.addEventListener("dj-select", (e) => console.log(e.detail.value));\n</script>'),
 ],
 "global-event": [
  ("Bind window/document events", "Attach listeners declaratively; they are added and cleaned up with the element.",
   '<dj-global-event id="ge"></dj-global-event>\n<script type="module">\n  import "@dojo-ng/global-event";\n  document.getElementById("ge").windowListeners = { resize: () => console.log(window.innerWidth) };\n</script>'),
 ],
 "popup": [
  ("Anchored overlay", "A low-level primitive; most apps use it through `trigger-popup`, `select`, and similar. Set `anchor` in JS and toggle `open`.",
   '<dj-button id="anchor">Anchor</dj-button>\n<dj-popup id="pop" position="below">Floating content</dj-popup>\n<script type="module">\n  import "@dojo-ng/popup"; import "@dojo-ng/button";\n  const pop = document.getElementById("pop");\n  pop.anchor = document.getElementById("anchor");\n  document.getElementById("anchor").addEventListener("click", () => (pop.open = !pop.open));\n</script>'),
 ],
 "transition": [
  ("Fade a panel in and out", "Toggle `show`; the component reflects a `state` attribute that your page CSS animates. Enter must be a keyframe animation; leave may be an animation or transitioned properties. The wrapper stays mounted through the leave, then hides.",
   '<style>\n  dj-transition[state="entering"] { animation: fade-in 200ms both; }\n  dj-transition[state="leaving"]  { animation: fade-out 200ms both; }\n  @keyframes fade-in  { from { opacity: 0; transform: translateY(4px); } }\n  @keyframes fade-out { to   { opacity: 0; } }\n</style>\n<button id="toggle">Toggle</button>\n<dj-transition id="panel" show>\n  <section>Now you see me.</section>\n</dj-transition>\n<script type="module">\n  import "@dojo-ng/transition";\n  const panel = document.getElementById("panel");\n  document.getElementById("toggle").addEventListener("click", () => (panel.show = !panel.show));\n  panel.addEventListener("dj-after-leave", () => console.log("left"));\n</script>'),
 ],
 "transition-group": [
  ("Stagger a list in", "Wrap each item in a `dj-transition` and let the group drive them with a delay. The effect lives on the children; the group emits one `dj-after-enter` when all have finished.",
   '<style>\n  dj-transition[state="entering"] { animation: fade-in 200ms both; }\n  @keyframes fade-in { from { opacity: 0; transform: translateY(6px); } }\n</style>\n<button id="reveal">Reveal</button>\n<ul>\n  <dj-transition-group id="grp" stagger="80">\n    <dj-transition><li>One</li></dj-transition>\n    <dj-transition><li>Two</li></dj-transition>\n    <dj-transition><li>Three</li></dj-transition>\n  </dj-transition-group>\n</ul>\n<script type="module">\n  import "@dojo-ng/transition"; import "@dojo-ng/transition-group";\n  const grp = document.getElementById("grp");\n  document.getElementById("reveal").addEventListener("click", () => (grp.show = !grp.show));\n</script>'),
 ],
}

def pkg_desc(pkg):
    try:
        return json.load(open(f"{PKGS}/{pkg}/package.json")).get("description", "")
    except Exception:
        return ""

def first_sentence(text):
    m = re.split(r"(?<=[.])\s", text, maxsplit=1)
    return m[0] if m else text

def component_readme(pkg, s):
    tag = G.tag_of(pkg)
    doc = G.classdoc(s)
    desc = G.description(doc, tag)
    desc = (desc[0].upper() + desc[1:]) if desc else desc
    o = [f"# @dojo-ng/{pkg}\n"]
    sup = G.superclass(s)
    tagline = f"`<{tag}>` — {first_sentence(desc)}" if desc else f"`<{tag}>`"
    o.append(G.md_safe(tagline) + "\n")
    o.append("Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.\n")
    if sup != "DojoElement":
        o.append(f"Extends `{sup}` and inherits its properties and behavior.\n")
    # Full description, only when it adds more than the one-sentence tagline already shows.
    if desc and desc.strip() != first_sentence(desc).strip():
        o.append(G.md_safe(desc) + "\n")
    note = NOTES.get(pkg)
    if note:
        o.append("> " + note + "\n")
    o.append("## Install\n")
    o.append(f"```bash\nnpm install @dojo-ng/{pkg}\n```\n")
    o.append("## Usage\n")
    o.append("Import the package to register the custom element, then use the tag.\n")
    exs = EXAMPLES.get(pkg)
    if exs:
        _, d0, code0 = exs[0]
        if d0:
            o.append(d0 + "\n")
        o.append("```html\n" + code0 + "\n```\n")
    else:
        o.append(f"```html\n<script type=\"module\">import \"@dojo-ng/{pkg}\";</script>\n<{tag}></{tag}>\n```\n")
    ps = G.parse_props(s)
    if ps:
        o.append("## Properties\n")
        o.append("`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.\n")
        o.append("| Property | Attribute | Type | Default |")
        o.append("|---|---|---|---|")
        for p in ps:
            a = (p["attr"] or "—") + (" ↻" if p["reflects"] else "")
            default = ("`" + G.cell(p["default"]) + "`") if p["default"] else "—"
            o.append(f"| `{p['name']}` | {a} | `{G.cell(p['type'])}` | {default} |")
        o.append("")
    for label, items in (("Slots", G.parse_slots(doc, s)),
                         ("Parts", G.parse_parts(doc, s)),
                         ("Events", G.parse_events(doc, s))):
        if items:
            o.append(f"**{label}:** {G.md_safe(G.fmt_named_md(items))}\n")
    methods = G.parse_methods(s)
    if methods:
        o.append(f"**Methods:** {G.md_safe(G.fmt_methods_md(methods))}\n")
    cssprops = G.parse_cssprops(doc)
    if cssprops:
        o.append(f"**CSS properties:** {G.md_safe(G.fmt_cssprops_md(cssprops))}\n")
    if exs and len(exs) > 1:
        o.append("## Examples\n")
        for title, d, code in exs[1:]:
            o.append(f"### {title}\n")
            if d:
                o.append(d + "\n")
            o.append("```html\n" + code + "\n```\n")
    o.append("## Theming\n")
    o.append("Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.\n")
    o.append("## Accessibility and i18n\n")
    o.append("Follows the project's WCAG 2.2 AA and localization conventions.\n")
    o.append("## More\n")
    o.append("Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).\n")
    return "\n".join(o)

def infra_readme(pkg):
    desc = pkg_desc(pkg)
    o = [f"# @dojo-ng/{pkg}\n"]
    if desc:
        o.append(desc + "\n")
    o.append("Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.\n")
    note = NOTES.get(pkg)
    if note:
        o.append("> " + note + "\n")
    o.append("## Install\n")
    o.append(f"```bash\nnpm install @dojo-ng/{pkg}\n```\n")
    # Support packages (data-grid plugins, rich-text plugins) carry worked examples too.
    exs = EXAMPLES.get(pkg)
    if exs:
        o.append("## Usage\n")
        _, d0, code0 = exs[0]
        if d0:
            o.append(d0 + "\n")
        o.append("```html\n" + code0 + "\n```\n")
        if len(exs) > 1:
            o.append("## Examples\n")
            for title, d, code in exs[1:]:
                o.append(f"### {title}\n")
                if d:
                    o.append(d + "\n")
                o.append("```html\n" + code + "\n```\n")
    doc = INFRA_DOC.get(pkg)
    if doc:
        o.append(f"## Usage\n\nSee the [Dojo NG documentation](../../README.md) ({doc}) for design and usage details.\n")
    return "\n".join(o)


# Data-grid plugin packages: notes + worked examples (support packages, rendered by infra_readme).
NOTES.update({
 "board": "The board is CONTROLLED: it never changes `data`. Listen for `dj-card-move`, apply it (the exported `applyCardMove` makes that one line), and assign the new array — focus then follows the moved card and the move is announced. Explicit `lanes` are recommended over the derived fallback (they fix lane order, give labels, and include empty lanes). Set `draggable` to enable pointer and touch drag between lanes (built on `@dojo-ng/dnd`); it is progressive enhancement — the move menu and keyboard shortcuts remain the accessibility contract, so drag is never the only way to move a card.",
 "dnd": "The keyboard/menu path in a consuming component is the accessibility contract (WCAG 2.5.7); drag is enhancement layered on top. The pointer core works inside shadow roots and on touch, mouse, and pen alike, with no dependency. Drops are CONTROLLED: the zone calls `onMove` and the consumer applies the change.",
 "data-grid": "Plugins: pass an array of plugin objects via the `plugins` property (JavaScript only). Recommended order: structural first (`treePlugin` OR `groupsPlugin`, never both), then `editPlugin`, `cellComponentsPlugin`, `formatsPlugin`, then chrome-only plugins (`filterPlugin`, `paginationPlugin`, `exportPlugin`, `detailPlugin`). A `plugins` change rebuilds the table.",
 "data-grid-edit": "CONTROLLED editing: the plugin never writes to `data`. Listen for `dj-cell-commit`, update your store, and assign a new `data` array. Place this plugin first in the array so its editor wins the cell.",
 "data-grid-export": "Exports RAW cell values (formatting is presentation). Default set = filtered but unpaginated rows; `all: true` exports the pre-filter set. Synthetic `__` columns (like the detail expander) are skipped.",
 "data-grid-tree": "Use `treePlugin` OR `groupsPlugin` per grid, never both (they both own expansion).",
 "data-grid-detail": "Detail rows switch the grid virtualizer to measured (variable-height) mode; grids without this plugin keep the fixed-height fast path.",
})
EXAMPLES.update({
 "dnd": [
  ("Add a drag zone to a component", "In a Lit component, construct a `DragZoneController` over the item container. Drops are controlled — apply the change in `onMove`. Zones sharing a `group` accept transfers from each other.",
   """import { DragZoneController } from "@dojo-ng/dnd";

class MyList extends LitElement {
  #zone = new DragZoneController(this, {
    container: () => this.renderRoot.querySelector(".items"),
    items: () => [...this.renderRoot.querySelectorAll("[data-key]")],
    zoneId: "list",
    axis: "y",
    onMove: ({ key, fromIndex, toIndex }) => {
      // reorder your data, then re-render
    },
  });
}"""),
  ("Keyboard grab mode", "For components without their own move UI, wire `keyboardGrabMode` to a keydown handler: space grabs the focused item, arrows move it, space drops, escape cancels. Announcements go through your callback.",
   """import { keyboardGrabMode } from "@dojo-ng/dnd";

const onKeydown = keyboardGrabMode({
  zones: () => [this.zoneConfig],
  announce: (msg) => this.liveRegion.textContent = msg,
});"""),
 ],
 "board": [
  ("A three-lane board with the controlled move handler", "Moves (menu, Ctrl/Cmd+arrows) emit `dj-card-move`; the app applies them with `applyCardMove`.",
   """<dj-board id="b" label="Sprint board" group-by="status"></dj-board>
<script type="module">
  import { applyCardMove } from "@dojo-ng/board";
  const b = document.getElementById("b");
  b.lanes = [
    { value: "todo", label: "To do" },
    { value: "doing", label: "In progress", limit: 3 },
    { value: "done", label: "Done" },
  ];
  b.data = [
    { id: "T-1", status: "todo", title: "Write the spec" },
    { id: "T-2", status: "doing", title: "Build the board" },
    { id: "T-3", status: "done", title: "Design review" },
  ];
  b.addEventListener("dj-card-move", (e) => {
    b.data = applyCardMove(b.data, e.detail, b.groupBy);
  });
  b.addEventListener("dj-card-click", (e) => console.log("open", e.detail.card));
</script>"""),
  ("Custom card content", "`renderCard` supplies the inside of the card; the accessible shell (focus, move menu) stays component-owned.",
   """<script type="module">
  import { html } from "lit";
  import "@dojo-ng/board";
  document.querySelector("dj-board").renderCard = (card) =>
    html`<dj-card kind="outlined">
      <strong>${card.title}</strong>
      <div>${card.assignee ?? "Unassigned"}</div>
    </dj-card>`;
</script>"""),
 ],
 "data-grid-formats": [
  ("Currency and date columns", "Set `format` on a column; other columns are untouched. Formatting follows the active locale (set `lang` on the grid or an ancestor).",
   """<dj-data-grid id="g"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { formatsPlugin } from "@dojo-ng/data-grid-formats";
  const g = document.getElementById("g");
  g.columns = [
    { id: "name", header: "Name" },
    { id: "price", header: "Price", format: { kind: "currency", currency: "USD" } },
    { id: "when", header: "Updated", format: { kind: "date" } },
    { id: "growth", header: "Growth", format: (v) => (v >= 0 ? "+" : "") + v + "%" },
  ];
  g.data = [{ name: "Widget", price: 1234.5, when: "2026-07-01", growth: 4 }];
  g.plugins = [formatsPlugin()];
</script>"""),
 ],
 "data-grid-cell-components": [
  ("Buttons and checkmarks in cells", "Set `render` on a column for arbitrary Lit content, or use the prebuilt helpers. Action buttons emit `dj-cell-action` with the row.",
   """<dj-data-grid id="g"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { cellComponentsPlugin, actionButton, checkmarkCell } from "@dojo-ng/data-grid-cell-components";
  const g = document.getElementById("g");
  g.columns = [
    { id: "name", header: "Name" },
    { id: "active", header: "Active", sortable: false, render: checkmarkCell() },
    { id: "act", header: "", sortable: false, render: actionButton("Open", "open") },
  ];
  g.data = [{ name: "Widget", active: true }];
  g.plugins = [cellComponentsPlugin()];
  g.addEventListener("dj-cell-action", (e) => console.log(e.detail.action, e.detail.row));
</script>"""),
 ],
 "data-grid-filter": [
  ("Quick filter plus per-column filters", "The quick filter searches all columns; columns opt into their own filter with `filter: \"text\"` or `filter: \"select\"` (distinct values).",
   """<dj-data-grid id="g"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { filterPlugin } from "@dojo-ng/data-grid-filter";
  const g = document.getElementById("g");
  g.columns = [
    { id: "name", header: "Name", filter: "text" },
    { id: "status", header: "Status", filter: "select" },
  ];
  g.data = [{ name: "Widget", status: "active" }, { name: "Gadget", status: "retired" }];
  g.plugins = [filterPlugin()];
</script>"""),
 ],
 "data-grid-pagination": [
  ("Paged rows with a size selector", "Filtering (when present) applies first, then pagination — TanStack's row-model order handles the composition.",
   """<dj-data-grid id="g"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { paginationPlugin } from "@dojo-ng/data-grid-pagination";
  const g = document.getElementById("g");
  g.columns = [{ id: "name", header: "Name" }];
  g.data = Array.from({ length: 100 }, (_, i) => ({ name: "Row " + i }));
  g.plugins = [paginationPlugin({ pageSize: 10 })];
</script>"""),
 ],
 "data-grid-edit": [
  ("Inline editing, controlled", "F2/Enter on the active row or double-click starts editing; Enter/blur commits, Escape cancels. The grid never mutates your data — apply the commit yourself.",
   """<dj-data-grid id="g"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { editPlugin } from "@dojo-ng/data-grid-edit";
  const g = document.getElementById("g");
  g.columns = [
    { id: "name", header: "Name", editable: true },
    { id: "qty", header: "Qty", editable: { control: "number" } },
    { id: "status", header: "Status", editable: { control: "select", options: [
      { value: "active", label: "Active" }, { value: "retired", label: "Retired" },
    ] } },
  ];
  let rows = [{ name: "Widget", qty: 2, status: "active" }];
  g.data = rows;
  g.plugins = [editPlugin()];
  g.addEventListener("dj-cell-commit", (e) => {
    const { row, columnId, value } = e.detail;
    rows = rows.map((r) => (r === row ? { ...r, [columnId]: value } : r));
    g.data = rows; // controlled: you own the data
  });
</script>"""),
 ],
 "data-grid-tree": [
  ("Hierarchical rows", "Nested `children` arrays become an expandable tree; ArrowRight/ArrowLeft expand and collapse the active row.",
   """<dj-data-grid id="g"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { treePlugin } from "@dojo-ng/data-grid-tree";
  const g = document.getElementById("g");
  g.columns = [{ id: "name", header: "Name" }, { id: "size", header: "Size" }];
  g.data = [
    { name: "src", size: "", children: [
      { name: "index.ts", size: "2 KB" },
      { name: "lib", size: "", children: [{ name: "util.ts", size: "1 KB" }] },
    ] },
  ];
  g.plugins = [treePlugin()];
</script>"""),
 ],
 "data-grid-groups": [
  ("Grouping with aggregates and totals", "Group rows show the value and count; aggregated columns show sums (or mean/min/max/count/custom). A totals row renders below the grid.",
   """<dj-data-grid id="g"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { groupsPlugin } from "@dojo-ng/data-grid-groups";
  const g = document.getElementById("g");
  g.columns = [
    { id: "region", header: "Region" },
    { id: "product", header: "Product" },
    { id: "sales", header: "Sales" },
  ];
  g.data = [
    { region: "West", product: "Widget", sales: 100 },
    { region: "West", product: "Gadget", sales: 50 },
    { region: "East", product: "Widget", sales: 75 },
  ];
  g.plugins = [groupsPlugin({ by: "region", aggregates: { sales: "sum" } })];
</script>"""),
 ],
 "data-grid-export": [
  ("Export the filtered view as CSV", "The chrome button downloads the current (filtered, unpaginated) rows. Import `toCsv`/`downloadCsv` and pass the grid element to build your own button.",
   """<dj-data-grid id="g"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { exportPlugin, toCsv } from "@dojo-ng/data-grid-export";
  const g = document.getElementById("g");
  g.columns = [{ id: "name", header: "Name" }];
  g.data = [{ name: "Widget" }, { name: "Gadget" }];
  g.plugins = [exportPlugin({ filename: "inventory.csv" })];
  // or, from your own UI: console.log(toCsv(g));
</script>"""),
 ],
 "data-grid-detail": [
  ("Master-detail with a nested grid", "Each row gains an expander; the detail panel renders any template — here a nested dj-data-grid (the subgrid case).",
   """<dj-data-grid id="g"></dj-data-grid>
<script type="module">
  import { html } from "lit";
  import "@dojo-ng/data-grid";
  import { detailPlugin } from "@dojo-ng/data-grid-detail";
  const g = document.getElementById("g");
  g.columns = [{ id: "order", header: "Order" }, { id: "customer", header: "Customer" }];
  g.data = [
    { order: "A-1", customer: "Acme", items: [{ sku: "W-1", qty: 2 }, { sku: "G-9", qty: 1 }] },
  ];
  g.plugins = [detailPlugin({
    render: (row) => html`<dj-data-grid
      height="8rem"
      .columns=${[{ id: "sku", header: "SKU" }, { id: "qty", header: "Qty" }]}
      .data=${row.original.items}></dj-data-grid>`,
  })];
</script>"""),
 ],
})

NOTES.update({
 "audio": "Wraps the native `HTMLAudioElement` (no vendor engine — audio needs none): the `<audio>` is ours and hidden, the UI is dj- controls, so keyboard support comes free from the button and slider. Give it a `label` for an accessible name. The play/pause state follows the media's real `play`/`pause` events, not the button click, so it stays correct even if you drive playback through `media()`. `dj-time` is throttled to at most once per second; wire xAPI/analytics/resume-position as listeners on the events, not in the component. `media()` returns the raw audio element (advanced; no support implied).",
 "video": "Wraps video.js (the product's engine; v8, which bundles HLS): video.js owns playback and renders its own control bar, we own integration and theming. TWO app prerequisites, both loaded at document level (the component does not bundle them): video.js's stylesheet (a `<link>` in the page head) and video.js itself (resolved by your bundler or an import map). The player region renders in LIGHT DOM by design — video.js injects its own DOM/CSS and its fullscreen and track menus misbehave inside a shadow root. `src`/`sources`/`poster` update the live player; `muted`/`autoplay`/`loop`/`tracks`/`label` recreate it. `dj-time` is throttled to at most once per second. `player()` returns the raw video.js instance (advanced escape hatch; no support implied).",
})
EXAMPLES.update({
 "audio": [
  ("Basic audio player", "Set `src` and a `label`. The play/pause button, seek slider, and time readout are dj- controls; keyboard works out of the box. Listen for `dj-play`/`dj-pause`/`dj-ended` and the throttled `dj-time` `{ current, duration }`.",
   '<dj-audio src="/media/episode-1.mp3" label="Episode 1"></dj-audio>\n<script type="module">\n  import "@dojo-ng/audio";\n  const a = document.querySelector("dj-audio");\n  a.addEventListener("dj-time", (e) => console.log(e.detail.current, "/", e.detail.duration));\n</script>'),
 ],
 "video": [
  ("Video player with sources", "video.js needs its stylesheet loaded at the document level (an app prerequisite, like a polyfill) and the engine resolvable as `video.js`. Pass ordered `sources` (`{ src, type }`); video.js draws its own controls. `player()` is an advanced escape hatch onto the raw video.js instance — no support implied.",
   '<!-- App prerequisite: load video.js\'s stylesheet once, in the page head. -->\n<link rel="stylesheet" href="https://vjs.zencdn.net/8.10.0/video-js.css" />\n\n<dj-video\n  label="Intro"\n  poster="/media/intro-poster.jpg"\n  .sources=${[{ src: "/media/intro.m3u8", type: "application/x-mpegURL" }]}\n></dj-video>\n<script type="module">\n  import "@dojo-ng/video";\n  const v = document.querySelector("dj-video");\n  v.addEventListener("dj-play", () => console.log("playing"));\n  // Advanced, no support implied:\n  // v.player().requestFullscreen();\n</script>'),
 ],
})
NOTES.update({
 "rich-text": "Pasted HTML is sanitized against an allowlist by default (scripts, styles, event handlers, inline styles, and unsafe `javascript:`/`data:` URLs are stripped; unknown tags are unwrapped, keeping their text) — a security and consistency hook, not a nicety. Set `sanitizePaste = false` in JS to turn it off, or supply your own `pasteSanitizer(html) => html`. Plain-text pastes bypass it. The exported `sanitizeHtml(html)` is the default and can be reused. Formatting, headings/lists/links, and other node types come from plugins; setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep the basics.",
})
NOTES.update({
 "rich-text-links": "An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). Setting `plugins` REPLACES the default set, so spread `...defaultPlugins` to keep bold/italic/underline + undo/redo. The one toolbar button reflects whether the selection is a link (`aria-pressed`) and, on click, asks for a URL — an empty value removes the link, a new value sets or updates it, cancelling changes nothing. The default URL prompt is `window.prompt`; pass your own via `createLinksPlugin({ promptForUrl })` (it may be async — return a Promise) to drive it from an overlay. Auto-linking on paste/typing is a later addition.",
})
EXAMPLES.update({
 "rich-text-links": [
  ("Add links to the editor", "Compose the links plugin with the default set. `createLinksPlugin({ promptForUrl })` swaps the built-in `window.prompt` for your own (overlay) URL editor.",
   '<dj-rich-text id="editor" label="Article"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { linksPlugin } from "@dojo-ng/rich-text-links";\n  document.getElementById("editor").plugins = [...defaultPlugins, linksPlugin];\n</script>'),
 ],
})
NOTES.update({
 "rich-text-lists": "An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). It contributes the `ListNode`/`ListItemNode` classes, installs Lexical's list behaviour, and adds three toolbar buttons that toggle the current block into and out of a bulleted, numbered, or check list. Setting `plugins` REPLACES the default set, so spread `...defaultPlugins`. Exports `listsPlugin`. CHECKLISTS: the installed `@lexical/list` does not export `registerCheckList`, so the plugin owns the interaction — it registers `INSERT_CHECK_LIST_COMMAND` (via `insertList(editor, \"check\")`), reflects each check item's state onto its `<li>` as `data-dj-checked=\"true|false\"` plus `role=\"checkbox\"` and `aria-checked` (theme-independent, keyed by CSS), toggles on a click in the ~1.6em marker zone (LTR left edge, RTL right edge — clicking the text just places the caret), and toggles on Space at the start of an item. Checked state round-trips through the `value` HTML on Lexical 0.21's native list export/import (the emitted markup is `<ul __lexicallisttype=\"check\"><li role=\"checkbox\" aria-checked=\"true|false\">…</li></ul>`), so no serialization overrides are needed; consuming sites can style the exported `data-dj-checked`/`aria-checked` attributes themselves. DEFERRED: nested-checklist indent styling beyond what lists already do, and read-only interactive checkboxes outside the editor.",
})
EXAMPLES.update({
 "rich-text-lists": [
  ("Bulleted, numbered, and check lists", "Compose the lists plugin with the default set; the toolbar gains bulleted, numbered, and checklist toggles. Click a checkbox (or press Space at the start of an item) to toggle it.",
   '<dj-rich-text id="editor" label="Article"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { listsPlugin } from "@dojo-ng/rich-text-lists";\n  document.getElementById("editor").plugins = [...defaultPlugins, listsPlugin];\n</script>'),
 ],
})
NOTES.update({
 "rich-text-table": "An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). It contributes the three `@lexical/table` node classes (`TableNode`, `TableRowNode`, `TableCellNode`), registers `INSERT_TABLE_COMMAND` and Lexical's grid mouse-selection + Tab/arrow cell navigation, and adds two toolbar controls. \"Insert table\" opens an 8×8 grid picker (hover to size, click to insert); \"Table menu\" is enabled only when the caret is inside a table and offers insert row above/below, insert column left/right, delete row, delete column, toggle header row, and delete table. Exports `tablePlugin` and `createTablePlugin()`. Setting `plugins` REPLACES the default set, so spread `...defaultPlugins`. PASTE: with this plugin loaded a pasted `<table>` imports as a real table (the paste sanitizer allowlists table markup); WITHOUT the plugin, pasted table elements degrade to paragraphs. DEFERRED: merge/split cells, column widths/resizing, caption UI (the tag survives paste, nothing more), nested-table styling beyond level 1.",
})
EXAMPLES.update({
 "rich-text-table": [
  ("Add tables to the editor", "Compose the table plugin with the default set. Insert from the 8×8 grid picker, then edit rows and columns from the table menu.",
   '<dj-rich-text id="editor" label="Article"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { tablePlugin } from "@dojo-ng/rich-text-table";\n  document.getElementById("editor").plugins = [...defaultPlugins, tablePlugin];\n</script>'),
 ],
})
NOTES.update({
 "rich-text-menu": "Internal plumbing for `@dojo-ng/rich-text` caret-anchored menus (used by the mentions and slash-command plugins) — not a custom element and not a plugin you load directly. Exports `createEditorMenu(ctx, config)` plus the `EditorMenuConfig`/`MenuMatch` types and the pure `computeMatch(textBeforeCaret, matchFn)` helper. You give it a `config` with `match(textBeforeCaret) => { start, query } | null` (locate the trigger + query in the caret's text), `onQueryChange(query)` (fetch/filter, then call the returned menu's `setOptions(options, loading?)`), and `onPick(option)` (called AFTER the trigger text has been removed). The menu owns a `dj-popup` + `dj-list` positioned at the caret, arrow/Enter/Tab/Escape navigation, a polite live region, and light-dismiss (outside click, Escape, or blur). Positioning and the interactive feel are browser-verified; the matcher is unit-testable via `computeMatch`.",
})
EXAMPLES.update({
 "rich-text-menu": [
  ("Build a caret menu (plugin author)", "Inside a plugin's `setup(ctx)`, create a menu from a trigger config and drive it with `setOptions`. See `@dojo-ng/rich-text-mentions` for a complete plugin built on this.",
   'import { createEditorMenu } from "@dojo-ng/rich-text-menu";\n\nexport const myPlugin = {\n  name: "at-menu",\n  setup(ctx) {\n    const menu = createEditorMenu(ctx, {\n      match: (text) => { const m = /(^|\\s)@(\\w*)$/.exec(text); return m ? { start: m.index + m[1].length, query: m[2] } : null; },\n      onQueryChange: async (q) => menu.setOptions((await fetchPeople(q)).map((p) => ({ value: p.id, label: p.name }))),\n      onPick: (opt) => ctx.editor.update(() => { /* insert something for opt */ }),\n    });\n    return () => menu.dispose();\n  },\n};'),
 ],
})
NOTES.update({
 "rich-text-mentions": "An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). Typing the trigger (default `@`) opens a caret-anchored menu (built on `@dojo-ng/rich-text-menu`); ArrowUp/Down move the highlight, Enter/Tab or a click inserts an atomic `MentionNode` (`@label`, `segmented` mode so it deletes as a unit) plus a trailing space, Escape closes. Exports `createMentionsPlugin({ source, trigger? })`, `MentionNode`, `$createMentionNode`, `$isMentionNode`, and `DEFAULT_MENTION_TRIGGER` — there is NO default `mentionsPlugin` because `source` is app-owned and REQUIRED: `source(query) => Promise<Array<{ id, label }>>` (called debounced, with a stale-response guard and a loading spinner). Setting `plugins` REPLACES the default set, so spread `...defaultPlugins`. Mentions survive the `value` round-trip via the node's own `importDOM` (`<span data-dj-mention=\"id\">@label</span>`). PASTE CAVEAT: the sanitizer keeps `span` but strips its attributes, so a pasted mention degrades to plain `@label` text. DEFERRED: multiple trigger characters, hover-cards, in-place editing, SSR guidance.",
})
EXAMPLES.update({
 "rich-text-mentions": [
  ("Add @-mentions with a static source", "Compose the mentions plugin with the default set and supply a `source`. Here it filters a static list; in production, call your directory API.",
   '<dj-rich-text id="editor" label="Comment"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { createMentionsPlugin } from "@dojo-ng/rich-text-mentions";\n  const PEOPLE = [{ id: "u1", label: "Jeff" }, { id: "u2", label: "Esther" }];\n  const mentions = createMentionsPlugin({\n    source: async (q) => PEOPLE.filter((p) => p.label.toLowerCase().includes(q.toLowerCase())),\n  });\n  document.getElementById("editor").plugins = [...defaultPlugins, mentions];\n</script>'),
 ],
})
NOTES.update({
 "rich-text-embed": "An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). It contributes an `EmbedNode` and an `INSERT_EMBED_COMMAND`, and adds a toolbar button that opens a `dj-dialog` for pasting a media URL. The URL is run through matchers, tried in order: YouTube (watch/`youtu.be`/shorts/embed URLs) and Vimeo render as privacy-enhanced iframes (`youtube-nocookie.com`, `player.vimeo.com`); a direct video file (`.mp4/.webm/.m3u8/.mov`) renders via `dj-video` and a direct audio file (`.mp3/.m4a/.ogg/.wav/.flac`) via `dj-audio`. An unsupported link shows an inline error and keeps the dialog open. Exports `embedPlugin`, `createEmbedPlugin({ matchers? })`, `EmbedNode`, `$createEmbedNode`, `$isEmbedNode`, `INSERT_EMBED_COMMAND`, `defaultMatchers`, and the `EmbedMatcher`/`EmbedPayload` types. Setting `plugins` REPLACES the default set, so spread `...defaultPlugins`. NO generic-iframe matcher ships (arbitrary iframes are a consumer decision — add your own matcher via `matchers`). APP PREREQUISITE: `dj-video` needs video.js's stylesheet + engine loaded at the document level. HTML/round-trip: an embed exports as `<div data-dj-embed data-src [data-title]>` wrapping a fallback `<a href>` (the canonical watch URL for youtube/vimeo), so a consuming site can render from the data attributes or fall back to the link; embeds survive the `value` round-trip via the node's own importDOM. PASTE: the sanitizer removes `iframe` and strips the embed div's attributes, so a pasted embed degrades to a plain link — embeds enter via the dialog, the command, or `value`. DEFERRED: oEmbed/metadata (titles, thumbnails), autoplay options, generic iframe matcher, resize/alignment UI.",
})
EXAMPLES.update({
 "rich-text-embed": [
  ("Add media embeds", "Compose the embed plugin with the default set. Load video.js at the document level for `dj-video`. Click the embed button and paste a YouTube/Vimeo URL or a direct media file URL.",
   '<!-- App prerequisite for dj-video: load video.js\'s stylesheet once, in the page head. -->\n<link rel="stylesheet" href="https://vjs.zencdn.net/8.10.0/video-js.css" />\n\n<dj-rich-text id="editor" label="Article"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { embedPlugin } from "@dojo-ng/rich-text-embed";\n  document.getElementById("editor").plugins = [...defaultPlugins, embedPlugin];\n</script>'),
  ("Add a custom matcher", "Pass `matchers` to support more hosts. A matcher is `{ kind, match(url) }` returning `{ kind, src, title? }` or undefined; `defaultMatchers` are the built-ins.",
   'import { createEmbedPlugin, defaultMatchers } from "@dojo-ng/rich-text-embed";\n\nconst loom = {\n  kind: "loom",\n  match: (url) => {\n    const m = /loom\\.com\\/share\\/(\\w+)/.exec(url);\n    return m ? { kind: "video", src: url } : undefined;\n  },\n};\nconst embed = createEmbedPlugin({ matchers: [loom, ...defaultMatchers] });'),
 ],
})
NOTES.update({
 "rich-text-slash": "An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). Typing `/` at the start of a block or after whitespace opens a caret-anchored command menu (built on `@dojo-ng/rich-text-menu`); ArrowUp/Down move the highlight, Enter/Tab or a click runs the item, Escape closes. The menu's items are aggregated from every loaded plugin's `inserts` plus any `extra` you pass, so it reflects whatever plugins you compose: headings contribute Paragraph/Heading 1–3/Quote, lists contribute Bulleted/Numbered/Checklist, image contributes Image, table contributes Table. Picking an item removes the `/query` text, then runs the item's `run(ctx)` (convert the block, insert a table, open the image dialog, …). The menu never opens when no plugin contributes an insert, and a query that matches nothing hides it. Exports `slashPlugin`, `createSlashPlugin({ extra? })`, `DEFAULT_SLASH_TRIGGER`, and the pure `aggregateInserts`/`filterInserts` helpers. Setting `plugins` REPLACES the default set, so spread `...defaultPlugins`. To expose block/insert actions from your own plugin, add an `inserts` array (or `(ctx) => items`) of `{ id, label, keywords?, run(ctx) }`.",
})
EXAMPLES.update({
 "rich-text-slash": [
  ("Add a slash-command menu", "Compose the slash plugin with the default set and the node-contributing plugins whose commands you want in the menu. Type `/` to open it; `/h` filters to headings.",
   '<dj-rich-text id="editor" label="Article"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { headingsPlugin } from "@dojo-ng/rich-text-headings";\n  import { listsPlugin } from "@dojo-ng/rich-text-lists";\n  import { imagePlugin } from "@dojo-ng/rich-text-image";\n  import { slashPlugin } from "@dojo-ng/rich-text-slash";\n  document.getElementById("editor").plugins = [...defaultPlugins, headingsPlugin, listsPlugin, imagePlugin, slashPlugin];\n</script>'),
  ("Add a custom command", "Pass `extra` items to `createSlashPlugin`. Each item is `{ id, label, keywords?, run(ctx) }`; `run` is called outside any editor update, so it can dispatch commands or open UI.",
   '<dj-rich-text id="editor" label="Article"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { createSlashPlugin } from "@dojo-ng/rich-text-slash";\n  const slash = createSlashPlugin({\n    extra: [{ id: "date", label: "Today\'s date", keywords: ["date", "now"], run: (ctx) => ctx.editor.update(() => {}) }],\n  });\n  document.getElementById("editor").plugins = [...defaultPlugins, slash];\n</script>'),
 ],
})
NOTES.update({
 "rich-text-markdown": "An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). It contributes no nodes and no toolbar: it adds a `markdown` output format (set `format=\"markdown\"` on `dj-rich-text` and the `value` getter emits Markdown, the setter parses it) and, by default, registers type-a-shortcut behaviour (`# ` for a heading, `- ` for a list, `**bold**`, and so on) even when the output format stays HTML. Setting `plugins` REPLACES the default set, so spread `...defaultPlugins` to keep bold/italic/underline + undo/redo. Markdown coverage follows the node-contributing plugins that are loaded: transformers whose node classes are not registered are dropped, so pair this with `rich-text-headings`, `rich-text-lists`, and `rich-text-links` for headings, lists, and links. Without the headings plugin, `# ` stays literal text. `createMarkdownPlugin({ shortcuts, transformers })` turns shortcuts off or supplies a custom transformer set; `usableTransformers(editor, transformers)` is exported for inspection. Requires the `@lexical/markdown` dependency. Note: pasted Markdown-looking text is not converted; Markdown enters via the `value` property or the shortcuts.",
})
EXAMPLES.update({
 "rich-text-markdown": [
  ("Markdown editing", "Compose the markdown plugin with the default set (plus headings/lists/links for full coverage) and set `format=\"markdown\"` so the value round-trips as Markdown. Typing `# ` still makes a heading.",
   '<dj-rich-text id="editor" label="Article" format="markdown"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { headingsPlugin } from "@dojo-ng/rich-text-headings";\n  import { listsPlugin } from "@dojo-ng/rich-text-lists";\n  import { linksPlugin } from "@dojo-ng/rich-text-links";\n  import { markdownPlugin } from "@dojo-ng/rich-text-markdown";\n  const el = document.getElementById("editor");\n  el.plugins = [...defaultPlugins, headingsPlugin, listsPlugin, linksPlugin, markdownPlugin];\n  el.value = "# Title\\n\\nSome **bold** text.";\n</script>'),
 ],
})
NOTES.update({
 "color-picker": "An inline color picker: a 2D saturation/brightness area, a hue slider, an optional opacity slider (`alpha`), a text field, and optional `swatches`. Form-associated — it submits the formatted color string under `name`. There is no built-in trigger or popup by design; compose `dj-popup` to make a dropdown. The model is HSV internally; `value` is a color STRING formatted through `format` (`hex`/`rgb`/`hsl`), so reading `value` after switching `format` returns the new representation. `swatches` is an array of color strings or `{ value, label }`. Emits `dj-change` (`{ value }`) on every user change, including during a drag (no separate input event). Named CSS colors are not parsed; alpha appears in the output only when the color is translucent or `alpha` is on. Parts: `area`, `thumb`, `hue`, `alpha`, `input`, `swatches`, `swatch`.",
})
EXAMPLES.update({
 "color-picker": [
  ("Picker with swatches", "Set `format`, turn on `alpha` for opacity, and pass `swatches`. Listen for `dj-change` to read the formatted `value`.",
   '<dj-color-picker id="picker" label="Brand color" format="rgb" alpha></dj-color-picker>\n<script type="module">\n  import "@dojo-ng/color-picker";\n  const p = document.getElementById("picker");\n  p.swatches = ["#e11d48", "#2563eb", { value: "#16a34a", label: "Green" }];\n  p.addEventListener("dj-change", (e) => console.log(e.detail.value));\n</script>'),
 ],
})
NOTES.update({
 "file-input": "A form-associated file selector: a `dj-button` opens the OS picker and the host doubles as a drop zone. Selected files are copied into component state and listed with their size and a remove button; the component only SELECTS files — it does no uploading or preview. `accept` filters both the picker and drops (extension, exact MIME, or `type/*`); `multiple` allows more than one (otherwise a new pick replaces the current file); `max-size` (bytes, per file) rejects an oversize file and sets a `fileTooLarge` validity error, cleared on the next change; `required` with no files reports `valueMissing`. Form value is a single `File`, or a `FormData` with one entry per file under `name` when `multiple`. Read `files` (read-only) for the current selection; call `clear()` to empty it. Emits `dj-change` (`{ files }`) on add and remove. The keyboard path is the button, so drag-and-drop adds no accessibility gap. Parts: `button`, `dropzone`, `list`, `item`, `remove`.",
})
EXAMPLES.update({
 "file-input": [
  ("Accept images, allow several", "Set `accept` and `multiple`; read the selection from `dj-change` or the `files` property.",
   '<dj-file-input id="files" label="Attachments" accept="image/*" multiple max-size="5000000"></dj-file-input>\n<script type="module">\n  import "@dojo-ng/file-input";\n  document.getElementById("files").addEventListener("dj-change", (e) => console.log(e.detail.files));\n</script>'),
 ],
})
NOTES.update({
 "rich-text-color": "An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). Color is an inline `TextNode` style, so it contributes no nodes: it patches `color` (or `background-color`) on the selection via `$patchStyleText`. Exports `colorPlugin` (text color), `backgroundColorPlugin`, and `createColorPlugin({ styleProperty, label, swatches })`. The toolbar control is a `dj-button` whose icon is a swatch chip of the selection's current color; clicking it opens a `dj-popup` with a `dj-color-picker` and a Remove color button. The picker applies live (a preview during a drag) without stealing focus; the popup light-dismisses (outside click / Escape) and focus returns to the editor. Setting `plugins` REPLACES the default set, so spread `...defaultPlugins`. PASTE CAVEAT: the default paste sanitizer strips inline `style`, so pasted colored text loses its color — color round-trips through the `value` property (which does not pass the paste sanitizer); a trusted app can supply its own `pasteSanitizer`.",
})
EXAMPLES.update({
 "rich-text-color": [
  ("Text and highlight color", "Compose the color plugins with the default set. `createColorPlugin` customizes the style property, label, or swatches.",
   '<dj-rich-text id="editor" label="Article"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { colorPlugin, backgroundColorPlugin } from "@dojo-ng/rich-text-color";\n  document.getElementById("editor").plugins = [...defaultPlugins, colorPlugin, backgroundColorPlugin];\n</script>'),
 ],
})
NOTES.update({
 "rich-text-image": "An opt-in plugin for `@dojo-ng/rich-text` (not a custom element). It contributes an `ImageNode` (a decorator node rendering an `<img>`) plus an `INSERT_IMAGE_COMMAND`, and a toolbar button that opens a `dj-dialog` for inserting an image from a file (`dj-file-input`) or a URL — the most recent source wins. Alt text is REQUIRED: the insert button stays disabled until it is non-empty, because the accessible name is mandatory. Exports `imagePlugin`, `createImagePlugin({ upload })`, `ImageNode`, `$createImageNode`, `$isImageNode`, and `INSERT_IMAGE_COMMAND`. Clicking an image selects it (a NodeSelection); Backspace/Delete then removes it (handled by Lexical). Setting `plugins` REPLACES the default set, so spread `...defaultPlugins`. DATA-URL CAVEAT: the default `upload` reads the file to a data URL, which bloats the HTML value — pass your own `upload(file) => Promise<string>` in production to host the file and return a URL. There is no size limit by default; pass `createImagePlugin({ maxSize })` (bytes) to cap the picker's file input. PASTE CAVEAT: the default paste sanitizer drops `<img>` tags, so images enter via the dialog or the `value` property, not paste. DEFERRED: resize/crop, captions, drag/paste insertion, alignment.",
})
EXAMPLES.update({
 "rich-text-image": [
  ("Insert images", "Compose the image plugin with the default set. Pass `createImagePlugin({ upload })` to host files instead of embedding data URLs.",
   '<dj-rich-text id="editor" label="Article"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { createImagePlugin } from "@dojo-ng/rich-text-image";\n  const imagePlugin = createImagePlugin({ upload: async (file) => (await myUploader(file)).url });\n  document.getElementById("editor").plugins = [...defaultPlugins, imagePlugin];\n</script>'),
 ],
})

def main():
    count = 0
    infra = 0
    for pkg in sorted(os.listdir(PKGS)):
        if not os.path.isdir(f"{PKGS}/{pkg}/src"):
            continue
        _, s = G.main_file(pkg)
        md = component_readme(pkg, s) if s else infra_readme(pkg)
        open(f"{PKGS}/{pkg}/README.md", "w").write(md)
        if s:
            count += 1
        else:
            infra += 1
    print(f"component READMEs: {count} | infra READMEs: {infra}")


if __name__ == "__main__":
    main()
