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

FOSS_ROOT = "packages"
OVERLAY_ROOT = "enterprise/packages"


def _roots():
    roots = [FOSS_ROOT]
    if os.path.isdir(OVERLAY_ROOT):
        roots.append(OVERLAY_ROOT)
    return roots


PKGS = _roots()

# Migration pointers for Dojo widgets superseded by a differently-named component.
NOTES = {
    "typeahead": "Coming from Dojo's **ComboBox**? Typeahead is its successor: an editable field that filters a list. For multi-select, see [`@dojo-ng/chip-typeahead`](../chip-typeahead/README.md).",
    "data-grid-select": """
A checkbox selection column for `<dj-data-grid>`, with select-all and range selection.

#### How it works
- The plugin adds a column; it does not hold the selection. The checkboxes read and write the
  grid's own row selection, so `selection-mode`, `rowSelection`, and `dj-selection-change` stay
  the only source of truth.
- `selection-mode="multiple"` gives checkboxes and a select-all checkbox in the header, with a real
  mixed state. `"single"` gives radio buttons and no header control. `"none"` adds no column.
- Shift-click a checkbox to select the range from the last one clicked. The range covers rows that
  are not rendered yet.

#### Open rows and select them
- Combine it with `activation="click"` on the grid: a click opens a row (`dj-activate`), and the
  checkboxes build the set for bulk actions.

#### Accessibility
- Always pass `label`. Without it, a screen reader hears a column of identical "Select row"
  controls.
""",
    "data-grid-rowstate": """
Row and cell styling from your data for `<dj-data-grid>`, such as bold unread rows or flagged
items.

#### Row states
- `row()` returns state tokens for a row. Each token `T` becomes an extra shadow part `row--T` on
  that row, so you style whole rows from your own CSS:
  `dj-data-grid::part(row--unread) { font-weight: 600 }`.
- The base `row` part is always there too, so `::part(row)` rules keep working.
- Tokens must match `/^[a-z0-9-]+$/`, because a part name cannot contain spaces. An invalid token is
  dropped, with one console warning.

#### Cell styles
- `cell()` returns an inline style for one column's content, for emphasis on a single cell, such
  as a bold subject but not a bold date.

#### Rules
- Both functions are optional and use only the row data, so the grid never needs to know your
  states.
- Only one plugin can set a row's `part` attribute, so do not combine this with another plugin
  that sets row parts. The tree and groups plugins are fine, because they set other attributes.
""",
    "button": "For an icon-only button, put `aria-label` on `<dj-button>` — it forwards to the native button inside the shadow root, along with `aria-pressed`/`aria-expanded` for a toggle or disclosure trigger. `aria-labelledby`/`aria-describedby`/`aria-controls` are not forwarded: those are IDREFs, which cannot resolve across the shadow boundary.",
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
  ("Icon-only", "`aria-label` on the host reaches the native button, so an icon-only button still has an accessible name.",
   '<dj-button kind="text" aria-label="Add item">\n  <svg slot="icon" aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M5 12h14M12 5v14" stroke="currentColor" stroke-width="2" fill="none"/></svg>\n</dj-button>'),
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
  ("Style the validation state", "Every form control mirrors its validity onto the host as data attributes, so you can style invalid/valid from outside the shadow root. Use the `user-` variants so a pristine field is not flagged before the user has interacted (blurred after editing, or submitted).",
   '<style>\n  dj-text-input[data-dj-user-invalid] { --dj-input-border-color: var(--dj-color-danger-600); }\n  dj-text-input[data-dj-user-valid] { --dj-input-border-color: var(--dj-color-success-600); }\n</style>\n<dj-text-input label="Email" type="email" required helper-text="We never share it"></dj-text-input>'),
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
  ("Free-text tag editor (`allow-new`)", "With `allow-new`, Enter on text that matches no option creates a chip from the literal value, so users can add tags that are not in the list. Suggestions still work: a highlighted option is picked instead of creating a literal.",
   '<dj-chip-typeahead allow-new label="Tags" name="tags" id="tags"></dj-chip-typeahead>\n<script type="module">\n  import "@dojo-ng/chip-typeahead";\n  document.getElementById("tags").options = [\n    { value: "urgent", label: "urgent" }, { value: "later", label: "later" },\n  ];\n  // Type "roadmap" and press Enter to add a brand-new tag.\n</script>'),
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
  ("Mail folder tree", "Folders with registered icons and unread counts. The tree reports selection with `dj-select` and opened folders with `dj-expand-change`.",
   '<dj-tree id="folders" value="inbox"></dj-tree>\n<script type="module">\n  import "@dojo-ng/tree";\n  import { registerIcons } from "@dojo-ng/icon";\n  registerIcons({\n    inbox: \'<svg viewBox="0 0 24 24"><path d="M4 13h4l2 3h4l2-3h4M4 13V5h16v8M4 13v6h16v-6" fill="none" stroke="currentColor" stroke-width="2"/></svg>\',\n    folder: \'<svg viewBox="0 0 24 24"><path d="M3 7h6l2 2h10v10H3z" fill="none" stroke="currentColor" stroke-width="2"/></svg>\',\n  });\n  const t = document.getElementById("folders");\n  t.expanded = ["archive"];\n  t.nodes = [\n    { id: "inbox", label: "Inbox", icon: "inbox", count: 12 },\n    { id: "archive", label: "Archive", icon: "folder", children: [\n      { id: "y2025", label: "2025", icon: "folder" },\n      { id: "y2024", label: "2024", icon: "folder" },\n    ] },\n    { id: "trash", label: "Trash", icon: "folder" },\n  ];\n  t.addEventListener("dj-select", (e) => console.log("select", e.detail.id));\n  t.addEventListener("dj-expand-change", (e) => console.log("expanded", e.detail.expandedIds));\n</script>'),
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
  ("Master/detail: click opens, checkboxes select", "The reason `activation` exists. A plain click opens a row in the detail pane and never disturbs the selection; the checkbox column builds the set that bulk actions act on. Enter opens the active row, Space selects it.",
   """<dj-data-grid id="mail" height="320px" activation="click" selection-mode="multiple"></dj-data-grid>
<button id="archive">Archive selected</button>
<pre id="open">(nothing open)</pre>
<script type="module">
  import "@dojo-ng/data-grid";
  import { selectColumnPlugin } from "@dojo-ng/data-grid-select";
  const grid = document.getElementById("mail");
  grid.columns = [{ id: "from", header: "From" }, { id: "subject", header: "Subject" }];
  grid.data = [
    { from: "Ada", subject: "Analytical engine" },
    { from: "Grace", subject: "Compiler notes" },
    { from: "Alan", subject: "Re: decidability" },
  ];
  grid.plugins = [selectColumnPlugin({ label: (m) => `Select ${m.subject}` })];

  // Opening a row: one gesture, one event. Never inferred from the selection.
  let selected = [];
  grid.addEventListener("dj-activate", (e) => {
    document.getElementById("open").textContent = "open: " + e.detail.row.subject;
  });
  grid.addEventListener("dj-selection-change", (e) => { selected = e.detail.rows; });
  document.getElementById("archive").addEventListener("click", () => archive(selected));
</script>"""),
  ("Load more when the user reaches the end", "`dj-range-change` reports the rendered row window, so a consumer can load the next page or window its data. End-reached is a one-line derivation from it; there is no separate event. Mind the `rendered` caveat in the note above: the window is WIDER than what the user can see, because it includes the virtualizer's overscan rows.",
   """<dj-data-grid id="feed" height="320px"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";

  const PAGE = 100;
  // Stands in for your API call.
  const fetchPage = async (offset) =>
    Array.from({ length: PAGE }, (_, i) => ({ title: "Item " + (offset + i) }));

  const grid = document.getElementById("feed");
  grid.columns = [{ id: "title", header: "Title" }];
  grid.data = await fetchPage(0);

  let loading = false;
  grid.addEventListener("dj-range-change", async (e) => {
    const { start, end, count, rendered } = e.detail;
    // End reached: the last rendered row is the last row there is. No separate event needed.
    if (end >= count - 1 && !loading) {
      loading = true;
      grid.data = [...grid.data, ...(await fetchPage(grid.data.length))];
      loading = false;
    }
    // For windowing, fetch around start/end and evict far from it. `rendered` is the exact
    // index list, which is what precise eviction wants.
    console.log(`rendered rows ${start}-${end} of ${count}`, rendered.length);
  });
</script>"""),
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
 "badge": [
  ("Status variants", "`variant` picks a semantic color; `pill` fully rounds it.",
   '<dj-badge>Neutral</dj-badge>\n<dj-badge variant="info">Info</dj-badge>\n<dj-badge variant="success">Success</dj-badge>\n<dj-badge variant="warning">Warning</dj-badge>\n<dj-badge variant="danger" pill>3</dj-badge>'),
  ("Count on a control", "Put the accessible name on the control, not the badge.",
   '<dj-button aria-label="Notifications, 4 unread">\n  Inbox <dj-badge variant="danger" pill>4</dj-badge>\n</dj-button>'),
 ],
 "skeleton": [
  ("Loading card", "Size each placeholder with host CSS; mark the region `aria-busy` until content lands.",
   '<div aria-busy="true" style="display:grid;grid-template-columns:48px 1fr;gap:12px;align-items:center;max-width:320px">\n  <dj-skeleton style="width:48px;height:48px;border-radius:50%"></dj-skeleton>\n  <div style="display:grid;gap:8px">\n    <dj-skeleton style="height:12px;width:60%"></dj-skeleton>\n    <dj-skeleton style="height:12px"></dj-skeleton>\n    <dj-skeleton style="height:12px;width:80%"></dj-skeleton>\n  </div>\n</div>'),
  ("No animation", "`effect=\"none\"` for a static placeholder.",
   '<dj-skeleton effect="none" style="height:16px;width:200px"></dj-skeleton>'),
 ],
 "alert": [
  ("Variants", "Each variant has a default glyph and live-region role.",
   '<dj-alert variant="info">Heads up — a new version is available.</dj-alert>\n<dj-alert variant="success">Your changes were saved.</dj-alert>\n<dj-alert variant="warning">Your trial ends in 3 days.</dj-alert>\n<dj-alert variant="danger">Payment failed. Update your card.</dj-alert>'),
  ("Closable, with a custom icon", "`closable` adds a dismiss button; the `icon` slot replaces the glyph. Listen for `dj-close`.",
   '<dj-alert variant="success" closable>\n  <svg slot="icon" viewBox="0 0 24 24" width="20" height="20"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2"/></svg>\n  Deploy finished.\n</dj-alert>'),
 ],
 "copy-button": [
  ("Copy a literal value", "Flashes feedback; listen for `dj-copy`.",
   '<dj-copy-button value="npm install @dojo-ng/button"></dj-copy-button>'),
  ("Copy from another element", "`from` points at an element id in the same root.",
   '<code id="token">sk_live_abc123</code>\n<dj-copy-button from="token"></dj-copy-button>'),
 ],
 "search-box": [
  ("Mail search with typed filters", "Configure `keys`; `has` carries `options`, so typing `has:` opens a suggestion popup. Read the structured query off `dj-query-change` (every change) or `dj-search` (Enter).",
   '<dj-search-box id="mail-search" label="Search mail" placeholder=\'Try from:ada or has:attachment or subject:"weekly report"\'></dj-search-box>\n<pre id="query-out">{ "text": "", "tokens": [] }</pre>\n<script type="module">\n  import "@dojo-ng/search-box";\n  const box = document.getElementById("mail-search");\n  box.keys = [\n    { key: "from", label: "From" },\n    { key: "to", label: "To" },\n    { key: "tag", label: "Tag" },\n    { key: "has", label: "Has", options: [\n      { value: "attachment", label: "attachment" },\n      { value: "image", label: "image" },\n    ] },\n  ];\n  const out = document.getElementById("query-out");\n  const show = (e) => { out.textContent = JSON.stringify(e.detail.query, null, 2); };\n  box.addEventListener("dj-query-change", show);\n  box.addEventListener("dj-search", show);\n</script>'),
  ("Reuse the grammar on the server", "The component\'s tokenizer is the exported pure parser, so the same query string parses identically outside the browser.",
   'import { parseQuery, formatQuery } from "@dojo-ng/search-box";\n\nconst keys = [{ key: "from" }, { key: "has", options: [] }];\nconst q = parseQuery(\'from:ada has:attachment weekly report\', keys);\n// q.tokens -> [{ key: "from", value: "ada" }, { key: "has", value: "attachment" }]\n// q.text   -> "weekly report"\nformatQuery(q); // round-trips back to the same string'),
 ],
 "dropdown": [
  ("Actions menu", "A button trigger plus a dj-list menu. Enter/Arrow keys drive it; choosing an item closes it.",
   '<dj-dropdown>\n  <dj-button slot="trigger">Actions</dj-button>\n  <dj-list id="menu"></dj-list>\n</dj-dropdown>\n<script type="module">\n  import "@dojo-ng/dropdown";\n  import "@dojo-ng/button";\n  import "@dojo-ng/list";\n  document.getElementById("menu").options = [\n    { value: "rename", label: "Rename" },\n    { value: "duplicate", label: "Duplicate" },\n    { value: "delete", label: "Delete" },\n  ];\n</script>'),
  ("Free panel", "Non-list content is a plain anchored panel — open/close/Escape only.",
   '<dj-dropdown>\n  <dj-button slot="trigger">Filters</dj-button>\n  <div style="padding:12px">Any panel content here.</div>\n</dj-dropdown>'),
 ],
 "icon": [
  ("Inline SVG icon", "Slot an SVG; it inherits `currentColor` and sizing.",
   '<dj-icon>\n  <svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z" fill="currentColor"/></svg>\n</dj-icon>'),
  ("Registered icons and the viewBox rule", "Register icons once, usually at startup, then refer to a glyph by `type`. Each registered SVG needs a `viewBox`.",
   '<dj-icon type="star" size="large" alt-text="Favorite"></dj-icon>\n<script type="module">\n  import "@dojo-ng/icon";\n  import { registerIcon } from "@dojo-ng/icon";\n  // Good: has a viewBox, so the glyph scales to any size.\n  registerIcon("star", \'<svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z"/></svg>\');\n  // Bad: no viewBox, so the box is sized but the artwork is clipped, and this logs a console warning.\n  registerIcon("star-bad", \'<svg width="24" height="24"><path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z"/></svg>\');\n</script>'),
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
  ("Swipeable carousel", "Two items per view, with page dots. `dj-slide-change` reports the new index.",
   '<dj-carousel label="Featured" per-view="2" dots>\n  <dj-card>One</dj-card>\n  <dj-card>Two</dj-card>\n  <dj-card>Three</dj-card>\n</dj-carousel>\n<script type="module">\n  import "@dojo-ng/carousel";\n  import "@dojo-ng/card";\n  const c = document.querySelector("dj-carousel");\n  c.addEventListener("dj-slide-change", (e) => console.log("slide", e.detail.index));\n</script>'),
 ],
 "split-panel": [
  ("Resizable split", "A sidebar and content with minimum widths. `dj-reposition` reports the new position.",
   '<dj-split-panel position="40"\n  style="height: 300px; --dj-split-panel-min-start: 120px; --dj-split-panel-min-end: 160px">\n  <div slot="start">Sidebar</div>\n  <div slot="end">Content</div>\n</dj-split-panel>\n<script type="module">\n  import "@dojo-ng/split-panel";\n  const sp = document.querySelector("dj-split-panel");\n  sp.addEventListener("dj-reposition", (e) => console.log("position", e.detail.position));\n</script>'),
  ("Three panes (nested)", "Nest a splitter in a slot for a third pane. Here the end pane is itself a vertical split.",
   '<dj-split-panel style="height: 400px" position="30">\n  <nav slot="start">Files</nav>\n  <dj-split-panel slot="end" orientation="vertical" position="70">\n    <main slot="start">Editor</main>\n    <div slot="end">Terminal</div>\n  </dj-split-panel>\n</dj-split-panel>'),
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
 "nav": [
  ("Link list", "Plain links in a `<nav>` landmark. Give it a `label` for the landmark.",
   '<dj-nav label="Site">\n  <a href="/docs">Docs</a>\n  <a href="/blog">Blog</a>\n  <a href="/pricing">Pricing</a>\n  <a href="/about">About</a>\n</dj-nav>'),
  ("Permanent hamburger", "Pin the token directly for a nav that is always collapsed, on any screen — no JS, no special case in the component: it is the same threshold token an app can set on a single instance.",
   '<dj-nav label="Site" style="--dj-nav-collapsed: 1">\n  <a href="/docs">Docs</a>\n  <a href="/blog">Blog</a>\n</dj-nav>'),
  ("Moving the threshold", "`45rem` is a default, not a hardcoded number. Override it per instance with your own `@container` query on an ancestor that establishes `container-type` — set BOTH branches (the default below your threshold, `0` above it), since setting the token at all replaces the component's own rule entirely rather than adjusting it.",
   '<style>\n  #wide-nav { container-type: inline-size; }\n  #wide-nav dj-nav { --dj-nav-collapsed: 1; }\n  @container (min-width: 30rem) {\n    #wide-nav dj-nav { --dj-nav-collapsed: 0; }\n  }\n</style>\n<div id="wide-nav">\n  <dj-nav label="Site">\n    <a href="/docs">Docs</a>\n    <a href="/blog">Blog</a>\n  </dj-nav>\n</div>'),
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
  ("Interaction: legend toggle and brush", "- `legend-toggle` turns legend items into buttons that show and hide their series. The axes rescale to the visible series. Each toggle emits `dj-legend-toggle` (`{ key, hidden }`).\n- `brush` adds an overview strip below a cartesian chart. Its two handles set the visible range of categories, by drag or by keyboard. Double-click the strip to reset it.",
   '<div style="width: 520px; height: 300px">\n  <dj-chart id="iv" type="line" markers legend-toggle brush category-key="month" label="Revenue vs target" show-grid y-label="USD (k)"></dj-chart>\n</div>\n<script type="module">\n  import "@dojo-ng/chart";\n  const iv = document.getElementById("iv");\n  iv.series = [{ key: "revenue", label: "Revenue" }, { key: "target", label: "Target" }];\n  iv.data = [\n    { month: "Jan", revenue: 42, target: 40 }, { month: "Feb", revenue: 50, target: 45 },\n    { month: "Mar", revenue: 47, target: 48 }, { month: "Apr", revenue: 61, target: 52 },\n    { month: "May", revenue: 58, target: 55 }, { month: "Jun", revenue: 70, target: 60 },\n  ];\n  iv.addEventListener("dj-legend-toggle", (e) => console.log(e.detail));\n</script>'),
  ("Sparklines: a KPI table", "`<dj-sparkline>` is a second, small element in this package: a tiny inline chart for a trend next to a number. It has no axes, grid, legend, tooltip, or brush.\n\n- Set `data` (a plain array of numbers) and `type` (`line`, `area`, or `bar`).\n- `marker` adds a dot on the last point. Size it with `--dj-sparkline-marker-size` (default `0.25em`), and style it further with `::part(marker)`.\n- Size the sparkline with `--dj-sparkline-width` and `--dj-sparkline-height` (defaults `8em` and `1.5em`). Color it with `--dj-sparkline-color`, which falls back to `--dj-chart-1`.\n- A sparkline is hidden from assistive technology (`aria-hidden`), because the cell next to it already states the value. Set `label` on a sparkline that stands alone to give it an accessible name.",
   '<table>\n  <thead><tr><th>Metric</th><th>Trend</th><th>Value</th></tr></thead>\n  <tbody>\n    <tr><td>Revenue</td><td><dj-sparkline id="rev" type="area" marker></dj-sparkline></td><td>$74k</td></tr>\n    <tr><td>Signups</td><td><dj-sparkline id="signups" type="bar"></dj-sparkline></td><td>1,204</td></tr>\n    <tr><td>Churn</td><td><dj-sparkline id="churn" style="--dj-sparkline-color: var(--dj-color-danger-600, #dc2626)"></dj-sparkline></td><td>2.1%</td></tr>\n  </tbody>\n</table>\n<script type="module">\n  import "@dojo-ng/chart";\n  document.getElementById("rev").data = [42, 50, 47, 61, 58, 70, 74];\n  document.getElementById("signups").data = [180, 240, 90, 310, 260, 340, 300];\n  document.getElementById("churn").data = [3.4, 3.1, 2.9, 2.6, 2.4, 2.2, 2.1];\n</script>'),
  ("Streaming: appendData and push", "`appendData(rows)` on `<dj-chart>` (cartesian types) and `push(value)` on `<dj-sparkline>` add new data without rebuilding `data` yourself.\n\n- Several calls in the same animation frame become one update.\n- Set `max-points` to drop old points from the front as new ones arrive, so the window slides.\n- Appended data snaps into place with no enter animation.",
   '<div style="width: 480px; height: 220px">\n  <dj-chart id="live" type="line" category-key="t" label="Live requests/sec" max-points="20" show-grid y-label="req/s"></dj-chart>\n</div>\n<dj-sparkline id="spark" max-points="20" label="Live requests/sec"></dj-sparkline>\n<script type="module">\n  import "@dojo-ng/chart";\n  const live = document.getElementById("live");\n  const spark = document.getElementById("spark");\n  live.series = [{ key: "value", label: "req/s" }];\n  live.data = [];\n  let t = 0;\n  const timer = setInterval(() => {\n    const value = 40 + Math.round(Math.random() * 20);\n    live.appendData([{ t: t++, value }]);\n    spark.push(value);\n  }, 1000);\n  // clearInterval(timer) to stop.\n</script>'),
  ("Canvas escape hatch for very large series", "`renderer=\"canvas\"` (the default is `svg`) draws the series marks on a `<canvas>` instead of as SVG elements. Try it when a series has thousands of points and drawing becomes slow. Start with `svg`, and switch only if you see a problem.\n\n- Only `line`, `area`, and `scatter` use canvas. `bar`, `stacked`, pie, donut, `bubble`, and a combo with a bar series stay `svg`, with one console warning.\n- Axes, grid, legend, tooltips, legend toggles, and the brush work the same with either renderer.\n- With `forced-colors: active`, the chart uses `svg`, because a canvas cannot follow the system colors. This fallback logs no warning.\n- Line and area charts gain the most. A scatter chart keeps one invisible hover target per point, so its element count does not go down.\n\nCanvas replaces only the marks. A `category-key` chart still renders one axis label and one invisible hover band for each unique category, with either renderer. Tens of thousands of unique categories can make the browser tab stop responding, so keep the count in the low thousands. A numeric `x-key` chart (`scatter`) does not have this limit.",
   '<div style="width: 480px; height: 280px">\n  <dj-chart id="cv" type="line" category-key="i" label="2,000-point line" renderer="canvas" show-grid></dj-chart>\n</div>\n<script type="module">\n  import "@dojo-ng/chart";\n  const cv = document.getElementById("cv");\n  cv.series = [{ key: "v", label: "Value" }];\n  cv.data = Array.from({ length: 2000 }, (_, i) => ({ i, v: Math.sin(i / 200) * 50 + 50 }));\n</script>'),
  ("Plugin seam: extending the plot with your own marks", "`plugins` (default `[]`) lets your code add to a chart without changing the package. Build a plugin with `defineChartPlugin`, which `@dojo-ng/chart` also exports. A plugin can:\n\n- Draw inside the plot (`renderUnder` and `renderOver`), with the same scales the built-in series use.\n- Add a pane below the plot with its own value scale (`panes`).\n- Widen the value range to fit what it draws (`domain`).\n- Replace the tooltip content for a category.\n- Add legend entries (`legendItems`) and columns in the accessible data table (`tableRows`), so its marks are as accessible as the built-in ones.\n\nA chart with no built-in `series` at all is supported. [`@dojo-ng/chart-financial`](../chart-financial/README.md) draws candlesticks, volume, indicators, and a crosshair this way. Plugins draw SVG, so a chart with plugins ignores `renderer=\"canvas\"` and logs one warning.",
   '<div style="width: 480px; height: 280px">\n  <dj-chart id="pg" type="line" category-key="day" label="Reading with an alert threshold" show-grid y-label="Value"></dj-chart>\n</div>\n<script type="module">\n  import "@dojo-ng/chart";\n  import { defineChartPlugin } from "@dojo-ng/chart";\n  import { svg } from "lit";\n  const thresholdPlugin = (value, label) => defineChartPlugin({\n    name: "threshold",\n    domain: () => [value, value],\n    renderOver: (ctx) => svg`<line x1="0" y1="${ctx.scales.y(value)}" x2="${ctx.inner.width}" y2="${ctx.scales.y(value)}" stroke="var(--dj-color-danger-600, #dc2626)" stroke-dasharray="4 2"></line>`,\n    legendItems: () => [{ label, color: "var(--dj-color-danger-600, #dc2626)" }],\n  });\n  const pg = document.getElementById("pg");\n  pg.series = [{ key: "reading", label: "Reading" }];\n  pg.plugins = [thresholdPlugin(80, "Alert threshold")];\n  pg.data = [\n    { day: "Mon", reading: 42 },\n    { day: "Tue", reading: 65 },\n    { day: "Wed", reading: 88 },\n    { day: "Thu", reading: 71 },\n  ];\n</script>'),
  ("Missing values: gap, connect, or zero", "A `null`, `undefined`, or non-numeric cell is a missing value, not a zero. `missing` sets how it is drawn. The default is `\"gap\"`, and each series can override it with `ChartSeries.missing`.\n\n- `\"gap\"` breaks the line or area and leaves out the marker, bar, or point. The tooltip still works there and shows a dash with a localized \"no value\" label.\n- `\"connect\"` draws the line or area straight across the hole. Bars, markers, and points are still left out, because there is no value to draw.\n- `\"zero\"` draws the value as zero. Charts did this before `missing` existed, so set `missing=\"zero\"` if your chart depends on that.",
   '<div style="width: 480px; height: 280px">\n  <dj-chart id="mv" type="line" markers category-key="day" label="Sensor reading" show-grid y-label="Value"></dj-chart>\n</div>\n<script type="module">\n  import "@dojo-ng/chart";\n  const mv = document.getElementById("mv");\n  mv.series = [{ key: "reading", label: "Reading" }];\n  // day 3\'s sensor dropped out: null, not a real 0. The default missing="gap" breaks the\n  // line there instead of drawing a false reading; missing="connect" would span it with a\n  // straight segment; missing="zero" restores the older behavior of plotting it as 0.\n  mv.data = [\n    { day: "Mon", reading: 42 },\n    { day: "Tue", reading: 45 },\n    { day: "Wed", reading: null },\n    { day: "Thu", reading: 48 },\n    { day: "Fri", reading: 50 },\n  ];\n  // mv.missing = "connect";\n  // mv.missing = "zero"; // the old behavior, if some consumer depended on it\n</script>'),
  ("Point labels", "`point-labels` draws a value label at each point, bar end, or slice. Each series can override it with `ChartSeries.pointLabels`.\n\n- Line, area, scatter, and bubble: above the point. Grouped bars: past the end of the bar. Stacked bars: centered in the segment. Pie and donut: outside the slice.\n- The text uses the same formatting as the value axis, so `numberFormat` and `formatY` apply. For other text, such as a name from another column, set `formatPoint(value, row, series)`. The accessible data table then shows the same text after the raw number.\n- A missing value gets no label.\n- Labels that would overlap an earlier label are skipped. The overlap check estimates text width from the number of characters. Above about 150 labels, no labels are drawn.\n- Style the text with `--dj-chart-label-size`, `--dj-chart-label-color`, and `--dj-chart-label-halo`. The halo is an outline behind the text that keeps it readable over marks and grid lines.",
   '<div style="width: 480px; height: 280px">\n  <dj-chart id="pl" type="bar" point-labels category-key="month" label="Revenue" show-grid y-label="USD (k)"></dj-chart>\n</div>\n<script type="module">\n  import "@dojo-ng/chart";\n  const pl = document.getElementById("pl");\n  pl.series = [{ key: "revenue", label: "Revenue" }];\n  pl.data = [\n    { month: "Jan", revenue: 42 },\n    { month: "Feb", revenue: 50 },\n    { month: "Mar", revenue: 47 },\n    { month: "Apr", revenue: 61 },\n  ];\n  // A name instead of the number, mirrored into the accessible table automatically:\n  // pl.formatPoint = (value, row) => row.month + " revenue";\n</script>'),
  ("Logarithmic value scale", "`y-scale=\"log\"` makes the value axis logarithmic. `y-scale-right` does the same for the secondary axis. It always applies to the value axis, so on horizontal bars it changes the x-axis.\n\n- A log axis never includes zero. It runs from the smallest positive value to the largest value, rounded out to whole powers of 10.\n- Zero and negative values have no position on a log axis, so they are always drawn as gaps, even with `missing=\"zero\"`. The tooltip and the data table still show the real number.\n- Tick labels show each power of 10 in the range. The 2 and 5 multiples are added when there is room, so a tall chart gets more ticks than a short one.\n- `stacked` with a log axis is not allowed. The chart logs one warning and uses a linear axis.\n- Bars are allowed. On a log axis, a bar's length shows a ratio to the bottom of the axis, not an amount.\n- Not supported: log scales on `dj-sparkline` and the brush strip, and a log x-axis for scatter and bubble charts.",
   '<div style="width: 480px; height: 280px">\n  <dj-chart id="lg" type="line" markers category-key="day" label="Sensor reading" show-grid y-label="Value" y-scale="log"></dj-chart>\n</div>\n<script type="module">\n  import "@dojo-ng/chart";\n  const lg = document.getElementById("lg");\n  lg.series = [{ key: "reading", label: "Reading" }];\n  // day 3 read exactly 0 — not a missing value, but a real reading with no position on a log\n  // axis, so it draws as a gap here too (distinct from a missing cell in the accessible table).\n  lg.data = [\n    { day: "Mon", reading: 4 },\n    { day: "Tue", reading: 40 },\n    { day: "Wed", reading: 0 },\n    { day: "Thu", reading: 400 },\n    { day: "Fri", reading: 4000 },\n  ];\n</script>'),
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
  ("Fade a panel in and out", "Toggle `show`; page CSS animates the `state` attribute.",
   '<style>\n  dj-transition[state="entering"] { animation: fade-in 200ms both; }\n  dj-transition[state="leaving"]  { animation: fade-out 200ms both; }\n  @keyframes fade-in  { from { opacity: 0; transform: translateY(4px); } }\n  @keyframes fade-out { to   { opacity: 0; } }\n</style>\n<button id="toggle">Toggle</button>\n<dj-transition id="panel" show>\n  <section>Now you see me.</section>\n</dj-transition>\n<script type="module">\n  import "@dojo-ng/transition";\n  const panel = document.getElementById("panel");\n  document.getElementById("toggle").addEventListener("click", () => (panel.show = !panel.show));\n  panel.addEventListener("dj-after-leave", () => console.log("left"));\n</script>'),
 ],
 "transition-group": [
  ("Stagger a list in", "Wrap each item in a `dj-transition`. The group shows them one after another and emits one `dj-after-enter` when all have finished.",
   '<style>\n  dj-transition[state="entering"] { animation: fade-in 200ms both; }\n  @keyframes fade-in { from { opacity: 0; transform: translateY(6px); } }\n</style>\n<button id="reveal">Reveal</button>\n<ul>\n  <dj-transition-group id="grp" stagger="80">\n    <dj-transition><li>One</li></dj-transition>\n    <dj-transition><li>Two</li></dj-transition>\n    <dj-transition><li>Three</li></dj-transition>\n  </dj-transition-group>\n</ul>\n<script type="module">\n  import "@dojo-ng/transition"; import "@dojo-ng/transition-group";\n  const grp = document.getElementById("grp");\n  document.getElementById("reveal").addEventListener("click", () => (grp.show = !grp.show));\n</script>'),
 ],
}

def pkg_desc(pkg):
    try:
        return json.load(open(f"{G.pkg_root(pkg)}/{pkg}/package.json")).get("description", "")
    except Exception:
        return ""

def first_sentence(text):
    m = re.split(r"(?<=[.])\s", text, maxsplit=1)
    return m[0] if m else text

def _split_note(note):
    """A NOTES entry as (lead markdown, [section blocks]). NOTES may be one paragraph or
    structured like a class doc: paragraphs, `#### Heading` lines, and `- ` bullets
    (G.structured_md). It used to be printed as a `>` blockquote, which npm shows as one block of
    gray text, the same problem the class descriptions had."""
    if not note:
        return "", []
    blocks = G.add_request_line(G.structured_md(note)).split("\n\n")
    i = next((k for k, b in enumerate(blocks) if b.startswith("#### ")), len(blocks))
    return "\n\n".join(blocks[:i]), blocks[i:]


def _list_item(name, description="", extra=""):
    """`name`: Description. Extra. One README list line for a slot, part, event, method, or CSS
    custom property."""
    d = (description or "").strip()
    if d:
        d = d[0].upper() + d[1:]
        if d[-1] not in ".!?":
            d += "."
    tail = " ".join(x for x in (d, extra) if x)
    return f"{name}: {tail}" if tail else name


def _fence(code):
    """A fenced code block for an example: `html` when the code is markup, `js` when it is a
    plain module (the dnd, store, i18n, and similar examples)."""
    lang = "html" if code.lstrip().startswith("<") else "js"
    return f"```{lang}\n{code}\n```\n"


def component_readme(pkg, s):
    tag = G.tag_of(pkg)
    doc = G.classdoc(s)
    desc = G.description(doc, tag)
    desc = (desc[0].upper() + desc[1:]) if desc else desc
    o = [f"# @dojo-ng/{pkg}\n"]
    sup = G.superclass(s)
    # The description keeps the class doc's structure (G.structured_md): lead paragraphs, then
    # optional `#### Heading` sections. The lead goes at the top; the sections follow Usage as
    # their own `##` sections, so the README reads summary, install, usage, details, API.
    blocks = desc.split("\n\n") if desc else []
    first_heading = next((i for i, b in enumerate(blocks) if b.startswith("#### ")), len(blocks))
    lead, sections = blocks[:first_heading], blocks[first_heading:]
    lead_text = "\n\n".join(lead)
    tagline = f"`<{tag}>` — {first_sentence(lead_text)}" if lead_text else f"`<{tag}>`"
    o.append(G.md_safe(tagline) + "\n")
    o.append("Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.\n")
    if sup != "DojoElement":
        o.append(f"Extends `{sup}` and inherits its properties and behavior.\n")
    # The rest of the lead, without repeating the sentence the tagline already shows.
    rest = lead_text.strip()[len(first_sentence(lead_text).strip()):].strip() if lead_text else ""
    if rest:
        o.append(G.md_safe(rest[0].upper() + rest[1:]) + "\n")
    note = NOTES.get(pkg)
    note_lead, note_sections = _split_note(note)
    if note_lead:
        o.append(G.md_safe(note_lead) + "\n")
    o.append("## Install\n")
    o.append(f"```bash\nnpm install @dojo-ng/{pkg}\n```\n")
    o.append("## Usage\n")
    o.append("Import the package to register the custom element, then use the tag.\n")
    exs = EXAMPLES.get(pkg)
    if exs:
        _, d0, code0 = exs[0]
        if d0:
            o.append(d0 + "\n")
        o.append(_fence(code0))
    else:
        o.append(f"```html\n<script type=\"module\">import \"@dojo-ng/{pkg}\";</script>\n<{tag}></{tag}>\n```\n")
    if sections or note_sections:
        o.append(G.md_safe(G.shift_headings("\n\n".join(sections + note_sections), "## ")) + "\n")
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
    # One list item per entry: a long comma-joined line of slots, parts, or events was as hard
    # to scan as the old one-block description.
    for label, items in (("Slots", G.parse_slots(doc, s)),
                         ("CSS parts", G.parse_parts(doc, s)),
                         ("Events", G.parse_events(doc, s))):
        if items:
            o.append(f"## {label}\n")
            o.append("\n".join("- " + G.md_safe(_list_item(
                "default slot" if it["name"] == "" else f"`{it['name']}`", it.get("description"))) for it in items) + "\n")
    methods = G.parse_methods(s)
    if methods:
        o.append("## Methods\n")
        o.append("\n".join("- " + G.md_safe(_list_item(
            "`" + G.fmt_methods_md([dict(m, description="")]).strip("`") + "`", m.get("description"))) for m in methods) + "\n")
    cssprops = G.parse_cssprops(doc)
    if cssprops:
        o.append("## CSS custom properties\n")
        o.append("\n".join("- " + G.md_safe(_list_item(
            f"`{c['name']}`", c.get("description"),
            f"Default `{c['default']}`." if c.get("default") else "")) for c in cssprops) + "\n")
    if exs and len(exs) > 1:
        o.append("## Examples\n")
        for title, d, code in exs[1:]:
            o.append(f"### {title}\n")
            if d:
                o.append(d + "\n")
            o.append(_fence(code))
    o.append("## Theming\n")
    o.append("Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.\n")
    if any(sec.startswith("#### Accessibility") for sec in sections):
        o.append("## Localization\n")
        o.append("Follows the project's WCAG 2.2 AA and localization conventions.\n")
    else:
        o.append("## Accessibility and i18n\n")
        o.append("Follows the project's WCAG 2.2 AA and localization conventions.\n")
    o.append("## More\n")
    o.append("Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).\n")
    return "\n".join(o)

def infra_readme(pkg):
    desc = pkg_desc(pkg)
    o = [f"# @dojo-ng/{pkg}\n"]
    note_lead, note_sections = _split_note(NOTES.get(pkg))
    # The NOTES lead is written for readers; package.json's description is a short npm summary of
    # the same thing. Show the lead when there is one, and fall back to the description.
    # An unstructured (one-paragraph) note is extra detail, so it follows the description.
    structured = "#### " in (NOTES.get(pkg) or "")
    if structured and note_lead:
        o.append(G.md_safe(note_lead) + "\n")
    elif desc:
        o.append(desc + "\n")
    o.append("Part of [Dojo NG](../../README.md), a framework-agnostic web component library. BSD-3-Clause.\n")
    if note_lead and not structured:
        o.append(G.md_safe(note_lead) + "\n")
    o.append("## Install\n")
    o.append(f"```bash\nnpm install @dojo-ng/{pkg}\n```\n")
    # Support packages (data-grid plugins, rich-text plugins) carry worked examples too.
    exs = EXAMPLES.get(pkg)
    if exs:
        o.append("## Usage\n")
        _, d0, code0 = exs[0]
        if d0:
            o.append(d0 + "\n")
        o.append(_fence(code0))
    if note_sections:
        o.append(G.md_safe(G.shift_headings("\n\n".join(note_sections), "## ")) + "\n")
    if exs:
        if len(exs) > 1:
            o.append("## Examples\n")
            for title, d, code in exs[1:]:
                o.append(f"### {title}\n")
                if d:
                    o.append(d + "\n")
                o.append(_fence(code))
    return "\n".join(o)


# Data-grid plugin packages: notes + worked examples (support packages, rendered by infra_readme).
NOTES.update({
 "dnd": """
Drag and drop for Dojo NG components, built on pointer events.

#### How it works
- It works inside shadow roots and with touch, mouse, and pen. It has no dependencies.
- Drops are controlled: the zone calls `onMove`, and your code applies the change.
- Zones that share a `group` accept items from each other.

#### Accessibility
- Drag is an enhancement. A component that uses dnd must also offer a keyboard or menu way
  to move items, as WCAG 2.5.7 requires.
- For a component with no move controls of its own, `keyboardGrabMode` adds keyboard moves.
  See the example below.
""",
 "data-grid-edit": """
Inline cell editing for `<dj-data-grid>`.

#### How it works
- Editing is controlled: the plugin never writes to `data`. Listen for `dj-cell-commit`, update
  your data, and assign a new `data` array.
- Put this plugin first in the `plugins` array, so its editor wins the cell over other plugins.
""",
 "data-grid-export": """
CSV export for `<dj-data-grid>`.

#### What is exported
- Raw cell values, not the formatted text, because formatting is presentation.
- By default, the filtered rows on all pages. With `all: true`, every row, before filtering.
- Internal columns whose id starts with `__`, such as the detail expander, are skipped.
""",
 "data-grid-tree": """
Tree rows for `<dj-data-grid>`: rows with children can be expanded and collapsed.

#### Rules
- Use `treePlugin` or `groupsPlugin` on a grid, never both, because both control row expansion.
""",
 "data-grid-detail": """
Master-detail rows for `<dj-data-grid>`: an expanded row shows extra content below it.

#### Performance
- Detail rows switch the grid to measured rows of different heights. Grids without this plugin keep
  the faster fixed-height rows.
""",
 "data-grid-filter": """
Filtering for `<dj-data-grid>`: a quick filter box and optional per-column filters.

#### Quick filter
- `quick` (on by default) adds one text box above the header that filters across all columns.

#### Column filters
- Set `filter` on a `GridColumn` to `"text"` or `"select"` to add a filter for that column.
- The filters appear in a second header row, which is shown only when at least one visible column
  has a filter.

#### Behavior
- Text filters wait 150 ms after typing stops before they apply. Automated tests should wait past
  that delay instead of expecting the result at once.
- The filters work through the TanStack table API, so the grid's row count and scrolling follow the
  filtered set.
- It works with `data-grid-pagination` in any order: rows are filtered before they are paged, so
  the page count follows the filtered set.
""",
 "data-grid-formats": """
Per-column value formatting for `<dj-data-grid>`: numbers, currency, percentages, dates, and times.

#### Setting a format
- Set `format` on a `GridColumn` to a descriptor: `{ kind, options?, currency? }`, where `kind` is
  `"number"`, `"currency"`, `"percent"`, `"date"`, `"time"`, or `"datetime"`.
- Or set it to a function `(value, row) => string`.
- Columns without `format` are left to other plugins and the grid's default.

#### Locale
- Descriptors use `Intl` through `@dojo-ng/i18n`.
- When `lang` changes on the grid or an ancestor, every value is formatted again, with no change to
  the plugin.

#### Plugin order
- Put this plugin after the structural and cell-component plugins. It is the fallback formatter,
  so a plugin after it would only see the formatted text, not the raw value.
""",
 "data-grid-groups": """
Row grouping with aggregates for `<dj-data-grid>`.

#### Grouping
- `by` lists the columns to group by. A grouped row shows an expander, the group value, and the
  number of rows in the group, such as `Ada (3)`.
- That count is always there. You do not need a `count` aggregate to get it.

#### Aggregates
- `aggregates` sets an aggregate per column: `sum`, `mean`, `min`, `max`, `count`, or a function
  over the group's rows.
- A `count` aggregate on another column shows the same number again in that column. Use it for a
  separate count column, not just to see the size of each group.
- When `aggregates` is set, a grand-totals row appears below the rows.
- Numeric aggregates are formatted through `@dojo-ng/i18n`, so they follow the grid's locale.

#### Rules
- Use `groupsPlugin` or `treePlugin` on a grid, never both. Both control row expansion, so setup
  throws an error if both are present.
""",
 "data-grid-pagination": """
Page navigation for `<dj-data-grid>`: a `<dj-pagination>` and a page-size menu below the rows.

#### Options
- `pageSize` (default 25) is the starting page size.
- `pageSizes` (default `[10, 25, 50, 100]`) are the choices in the menu. The starting `pageSize`
  does not have to be one of them.

#### Behavior
- Paging works through the TanStack table API, so the grid's row count follows the current page.
- It works with `data-grid-filter` in any order: rows are filtered before they are paged, so the
  page count follows the filtered set.
""",
 "data-grid-cell-components": """
Custom cell content for `<dj-data-grid>`: a column can render any Lit content, such as a
`dj-button`, a `dj-icon`, a `dj-chip`, or a sparkline.

#### Custom cells
- Set `render` on a `GridColumn`. Columns without `render` are left to other plugins and the
  grid's default.

#### Ready-made cells
- `actionButton(label, action, opts?)` renders a small `dj-button`. A click emits
  `dj-cell-action` with `{ action, row }` from the grid, and does not also select the row.
- `checkmarkCell(opts?)` renders a checkmark with hidden Yes or No text, so screen reader users
  also get the value.

#### Not supported yet
- Keyboard access to controls inside a cell. Cell content can be used with a mouse or touch today;
  moving keyboard focus into a cell needs a change in the grid itself.
""",
})
EXAMPLES.update({
 "dnd": [
  ("Add a drag zone to a component", "In a Lit component, create a `DragZoneController` over the item container, and apply each move in `onMove`.",
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
  ("Keyboard grab mode", "Connect `keyboardGrabMode` to a keydown handler. Your `announce` callback receives the messages for a live region.\n\n- Space picks up the focused item, and the arrow keys move it.\n- Space drops the item, and Escape cancels the move.",
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
 "data-grid-select": [
  ("Master/detail: click opens, checkboxes select", "The intended combination. `activation=\"click\"` makes a plain click open a row; the checkbox column builds the set that bulk actions run on. Name each checkbox with `label`.",
   """<dj-data-grid id="mail" height="320px" activation="click" selection-mode="multiple"></dj-data-grid>
<button id="archive">Archive selected</button>
<script type="module">
  import "@dojo-ng/data-grid";
  import { selectColumnPlugin } from "@dojo-ng/data-grid-select";
  const grid = document.getElementById("mail");
  grid.columns = [{ id: "from", header: "From" }, { id: "subject", header: "Subject" }];
  grid.data = [
    { from: "Ada", subject: "Analytical engine" },
    { from: "Grace", subject: "Compiler notes" },
  ];
  grid.plugins = [selectColumnPlugin({ label: (m) => `Select ${m.subject}` })];

  let selected = [];
  grid.addEventListener("dj-selection-change", (e) => { selected = e.detail.rows; });
  grid.addEventListener("dj-activate", (e) => open(e.detail.row));
  document.getElementById("archive").addEventListener("click", () => archive(selected));
</script>"""),
  ("Put the column on the right", 'Set `position: "end"` to append it instead of prepending; `width` sets the track.',
   '<script type="module">\n  grid.plugins = [selectColumnPlugin({ position: "end", width: "3rem" })];\n</script>'),
 ],
 "data-grid-rowstate": [
  ("Emphasize unread rows", "`row()` returns state tokens; each becomes a `row--<token>` part you style from your own CSS. The base `row` part is always present too.",
   """<style>
  /* Styled from outside the grid's shadow DOM, via the parts the plugin adds. */
  #mail::part(row--unread) { font-weight: 600; }
  #mail::part(row--flagged) { background: var(--dj-color-warning-100); }
</style>
<dj-data-grid id="mail"></dj-data-grid>
<script type="module">
  import "@dojo-ng/data-grid";
  import { rowStatePlugin } from "@dojo-ng/data-grid-rowstate";
  const g = document.getElementById("mail");
  g.columns = [
    { id: "from", header: "From" },
    { id: "subject", header: "Subject" },
    { id: "date", header: "Date" },
  ];
  g.data = [
    { from: "Ada", subject: "Analytical engine", date: "2026-07-01", seen: false, flagged: true },
    { from: "Grace", subject: "Compiler notes", date: "2026-06-28", seen: true, flagged: false },
  ];
  g.plugins = [
    rowStatePlugin({
      row: (m) => {
        const states = [];
        if (!m.seen) states.push("unread");
        if (m.flagged) states.push("flagged");
        return states;
      },
    }),
  ];
</script>"""),
  ("Emphasize one column instead", "`cell()` returns an inline style for a single column's content, so you can bold the subject without touching the rest of the row. It composes with other plugins' cell decoration rather than replacing content.",
   """<script type="module">
  import { rowStatePlugin } from "@dojo-ng/data-grid-rowstate";
  grid.plugins = [
    rowStatePlugin({
      cell: (columnId, m) =>
        !m.seen && (columnId === "subject" || columnId === "from")
          ? "font-weight: 600"
          : undefined,
    }),
  ];
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
})
EXAMPLES.update({
 "audio": [
  ("Basic audio player", "Set `src` and a `label`. The play/pause button, seek slider, and time readout are dj- controls; keyboard works out of the box. Listen for `dj-play`/`dj-pause`/`dj-ended` and the throttled `dj-time` `{ current, duration }`.",
   '<dj-audio src="/media/episode-1.mp3" label="Episode 1"></dj-audio>\n<script type="module">\n  import "@dojo-ng/audio";\n  const a = document.querySelector("dj-audio");\n  a.addEventListener("dj-time", (e) => console.log(e.detail.current, "/", e.detail.duration));\n</script>'),
 ],
 "video": [
  ("Video player with sources", "Ordered `sources` (`{ src, type }`); video.js draws its own controls. Load the video.js stylesheet first.",
   '<!-- App prerequisite: load video.js\'s stylesheet once, in the page head. -->\n<link rel="stylesheet" href="https://vjs.zencdn.net/8.10.0/video-js.css" />\n\n<dj-video\n  label="Intro"\n  poster="/media/intro-poster.jpg"\n  .sources=${[{ src: "/media/intro.m3u8", type: "application/x-mpegURL" }]}\n></dj-video>\n<script type="module">\n  import "@dojo-ng/video";\n  const v = document.querySelector("dj-video");\n  v.addEventListener("dj-play", () => console.log("playing"));\n  // Advanced, no support implied:\n  // v.player().requestFullscreen();\n</script>'),
 ],
})
NOTES.update({
})
NOTES.update({
 "rich-text-headings": """
Headings (levels 1 to 3) and block quotes for `<dj-rich-text>`.

#### Using it
- The toolbar gets a paragraph-style menu that shows the current block's type (Paragraph,
  Heading 1 to 3, or Quote) and changes the selected blocks to the chosen type. Focus returns to
  the editor.
- With `rich-text-slash` loaded, the slash menu also offers Paragraph, Heading 1 to 3, and Quote.

#### Why you need it
Lexical needs its node types when the editor is created. Without this plugin, headings and quotes
cannot exist in the document at all:
- Pasted or `value`-set `<h1>` to `<h3>` and `<blockquote>` become plain paragraphs.
- `rich-text-markdown`'s `# ` and `> ` shortcuts have nothing to convert into.
- `rich-text-slash`'s Heading and Quote items do nothing.

#### Setup
- Exports `headingsPlugin`, ready to use. There is no `createHeadingsPlugin`, because there is
  nothing to configure.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold,
  italic, underline, undo, and redo.
""",
})
EXAMPLES.update({
 "rich-text-headings": [
  ("Convert blocks to headings and quotes", "Compose the headings plugin with the default set; the toolbar gains a paragraph-style select. Choosing Heading 1–3 or Quote converts the current block(s); choosing Paragraph converts back.",
   '<dj-rich-text id="editor" label="Article"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { headingsPlugin } from "@dojo-ng/rich-text-headings";\n  document.getElementById("editor").plugins = [...defaultPlugins, headingsPlugin];\n</script>'),
 ],
})
NOTES.update({
 "rich-text-links": """
Links for `<dj-rich-text>`: add, change, and remove a link on the selection.

#### Using it
- The toolbar button shows whether the selection is a link (`aria-pressed`). Clicking it asks for
  a URL.
- An empty URL removes the link, a new URL sets or changes it, and Cancel changes nothing.

#### Setup
- The default prompt is `window.prompt`. Pass your own with
  `createLinksPlugin({ promptForUrl })`; it may return a Promise, so it can open your own dialog.
- For links made automatically while typing, add `rich-text-autolink`.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold,
  italic, underline, undo, and redo.
""",
})
EXAMPLES.update({
 "rich-text-links": [
  ("Add links to the editor", "Compose the links plugin with the default set. `createLinksPlugin({ promptForUrl })` swaps the built-in `window.prompt` for your own (overlay) URL editor.",
   '<dj-rich-text id="editor" label="Article"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { linksPlugin } from "@dojo-ng/rich-text-links";\n  document.getElementById("editor").plugins = [...defaultPlugins, linksPlugin];\n</script>'),
 ],
})
NOTES.update({
 "rich-text-lists": """
Bulleted, numbered, and check lists for `<dj-rich-text>`.

#### Using it
- Three toolbar buttons turn the current block into a bulleted, numbered, or check list, or back.

#### Check lists
- Each check item's state is on its `<li>` as `data-dj-checked="true|false"`, with `role="checkbox"`
  and `aria-checked`, so you can style it with CSS.
- A click in the marker area at the start of the item (the left edge, or the right edge in a
  right-to-left page) toggles it. A click on the text only places the caret.
- Space at the start of an item also toggles it.
- The checked state survives the `value` round trip in the HTML that Lexical exports, so a site can
  style the exported `data-dj-checked` and `aria-checked` attributes.

#### Setup
- Exports `listsPlugin`. With `rich-text-slash` loaded, the slash menu also offers the three list
  types.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold,
  italic, underline, undo, and redo.

#### Not built
- Extra indent styling for nested check lists, and clickable checkboxes outside the editor.
""",
})
EXAMPLES.update({
 "rich-text-lists": [
  ("Bulleted, numbered, and check lists", "Compose the lists plugin with the default set; the toolbar gains bulleted, numbered, and checklist toggles. Click a checkbox (or press Space at the start of an item) to toggle it.",
   '<dj-rich-text id="editor" label="Article"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { listsPlugin } from "@dojo-ng/rich-text-lists";\n  document.getElementById("editor").plugins = [...defaultPlugins, listsPlugin];\n</script>'),
 ],
})
NOTES.update({
 "rich-text-table": """
Tables for `<dj-rich-text>`: insert a table, then add or remove rows and columns.

#### Using it
- Insert table opens an 8 by 8 grid: point to choose the size, click to insert.
- The table menu is available when the caret is in a table. It inserts a row above or below or a
  column left or right, deletes a row, a column, or the table, and turns the header row on or off.
- Select cells with the mouse; Tab and the arrow keys move between cells.

#### Pasting
- With this plugin loaded, a pasted `<table>` becomes a real table. Without it, pasted tables become
  paragraphs.

#### Setup
- Exports `tablePlugin` and `createTablePlugin()`. With `rich-text-slash` loaded, the slash menu
  also offers Table.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold,
  italic, underline, undo, and redo.

#### Not built
- Merging and splitting cells, column widths and resizing, editing captions (a pasted caption is
  kept, nothing more), and styling for tables inside tables.
""",
})
EXAMPLES.update({
 "rich-text-table": [
  ("Add tables to the editor", "Compose the table plugin with the default set. Insert from the 8×8 grid picker, then edit rows and columns from the table menu.",
   '<dj-rich-text id="editor" label="Article"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { tablePlugin } from "@dojo-ng/rich-text-table";\n  document.getElementById("editor").plugins = [...defaultPlugins, tablePlugin];\n</script>'),
 ],
})
NOTES.update({
 "rich-text-menu": """
The caret menu that the mentions and slash-command plugins are built on. It is not a plugin you load
directly.

#### What it does
- It shows a `dj-popup` and a `dj-list` at the caret, with arrow, Enter, Tab, and Escape
  navigation, a polite live region, and closing on a click outside, Escape, or blur.

#### Using it
Call `createEditorMenu(ctx, config)`. The `config` has three functions:
- `match(textBeforeCaret)` finds the trigger and the query, and returns `{ start, query }` or
  `null`.
- `onQueryChange(query)` fetches or filters, then calls the menu's `setOptions(options, loading?)`.
- `onPick(option)` runs after the trigger text has been removed.

#### Also exported
- The the `EditorMenuConfig` and `MenuMatch` types, and `computeMatch(textBeforeCaret,
  matchFn)` for testing a matcher without a browser.
""",
})
EXAMPLES.update({
 "rich-text-menu": [
  ("Build a caret menu (plugin author)", "Inside a plugin's `setup(ctx)`, create a menu from a trigger config and drive it with `setOptions`. See `@dojo-ng/rich-text-mentions` for a complete plugin built on this.",
   'import { createEditorMenu } from "@dojo-ng/rich-text-menu";\n\nexport const myPlugin = {\n  name: "at-menu",\n  setup(ctx) {\n    const menu = createEditorMenu(ctx, {\n      match: (text) => { const m = /(^|\\s)@(\\w*)$/.exec(text); return m ? { start: m.index + m[1].length, query: m[2] } : null; },\n      onQueryChange: async (q) => menu.setOptions((await fetchPeople(q)).map((p) => ({ value: p.id, label: p.name }))),\n      onPick: (opt) => ctx.editor.update(() => { /* insert something for opt */ }),\n    });\n    return () => menu.dispose();\n  },\n};'),
 ],
})
NOTES.update({
 "rich-text-mentions": """
@mentions for `<dj-rich-text>`: type `@` and pick a person from a menu.

#### Using it
- Typing the trigger (`@` by default) opens a menu at the caret. ArrowUp and ArrowDown move the
  highlight; Enter, Tab, or a click inserts the mention and a space; Escape closes the menu.
- A mention is one unit: it shows as `@label` and Backspace deletes it whole.

#### Setup
- `source` is required and comes from your app: `source(query) => Promise<Array<{ id, label }>>`.
  It is called after a short delay, older answers are ignored, and a spinner shows while it loads.
- Because `source` is required, there is no ready-made `mentionsPlugin`. Use
  `createMentionsPlugin({ source, trigger? })`.
- Also exports `MentionNode`, `$createMentionNode`, `$isMentionNode`, and
  `DEFAULT_MENTION_TRIGGER`.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold,
  italic, underline, undo, and redo.

#### HTML and pasting
- Mentions survive the `value` round trip as `<span data-dj-mention="id">@label</span>`.
- Paste cleaning keeps the `span` but removes its attributes, so a pasted mention becomes plain
  `@label` text.

#### Not built
- More than one trigger character, hover cards, editing a mention in place, and guidance for
  server-side rendering.
""",
})
EXAMPLES.update({
 "rich-text-mentions": [
  ("Add @-mentions with a static source", "Compose the mentions plugin with the default set and supply a `source`. Here it filters a static list; in production, call your directory API.",
   '<dj-rich-text id="editor" label="Comment"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { createMentionsPlugin } from "@dojo-ng/rich-text-mentions";\n  const PEOPLE = [{ id: "u1", label: "Jeff" }, { id: "u2", label: "Esther" }];\n  const mentions = createMentionsPlugin({\n    source: async (q) => PEOPLE.filter((p) => p.label.toLowerCase().includes(q.toLowerCase())),\n  });\n  document.getElementById("editor").plugins = [...defaultPlugins, mentions];\n</script>'),
 ],
})
NOTES.update({
 "rich-text-embed": """
Embedded media for `<dj-rich-text>`: YouTube and Vimeo videos, and video or audio files, from a
pasted URL.

#### Inserting
- The toolbar button opens a dialog for a media URL. An unsupported link shows an error and the
  dialog stays open.
- Matchers are tried in order. YouTube (watch, `youtu.be`, shorts, and embed URLs) and Vimeo become
  privacy-enhanced iframes (`youtube-nocookie.com`, `player.vimeo.com`).
- A video file (`.mp4`, `.webm`, `.m3u8`, `.mov`) uses `dj-video`, and an audio file (`.mp3`,
  `.m4a`, `.ogg`, `.wav`, `.flac`) uses `dj-audio`.
- `dj-video` needs the video.js stylesheet and video.js loaded at the document level.

#### Setup
- Exports `embedPlugin`, `createEmbedPlugin({ matchers? })`, `EmbedNode`, `$createEmbedNode`,
  `$isEmbedNode`, `INSERT_EMBED_COMMAND`, `defaultMatchers`, and the `EmbedMatcher` and
  `EmbedPayload` types.
- There is no matcher for any iframe. Whether to allow other iframes is your decision: add your own
  matcher with `matchers`.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold,
  italic, underline, undo, and redo.

#### HTML and pasting
- An embed exports as `<div data-dj-embed data-src [data-title]>` around a plain `<a href>`, so a
  site can render it from the data attributes or show the link.
- Embeds survive the `value` round trip.
- Paste cleaning removes iframes and the embed's attributes, so a pasted embed becomes a plain link.
  Embeds come in through the dialog, the command, or `value`.

#### Not built
- Titles and thumbnails (oEmbed), autoplay options, a matcher for any iframe, and resizing or
  alignment.
""",
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
 "rich-text-autolink": """
Automatic links for `<dj-rich-text>`: URLs and email addresses become links as you type.

#### How it works
- A text transform finds URLs and email addresses as you type and wraps them in links.
- Editing the text so it no longer matches removes the link; editing it to a different URL updates
  the address. Links you made by hand are never changed.
- `www.` addresses get `https://`, and plain email addresses get `mailto:`.

#### Setup
- Exports `autolinkPlugin`, `createAutoLinkPlugin({ matchers? })`, and `defaultMatchers`.
- A matcher is `{ regex, url(matched) }`. The regex must not be global, and the earliest match wins.
- It also registers the link node, so exported `<a>` elements import again through `value` even
  without `rich-text-links`. Loading both is fine.
- Pair it with `rich-text-links` for editing links by hand.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold,
  italic, underline, undo, and redo.

#### Not built
- URLs split across formatting, removing an automatic link from a toolbar, and opening a link by
  clicking it in the editor.
""",
})
EXAMPLES.update({
 "rich-text-autolink": [
  ("Auto-link URLs and emails", "Compose the autolink plugin with the default set; typing a URL or email followed by a space (or any boundary) links it. Add the links plugin too for manual link editing.",
   '<dj-rich-text id="editor" label="Article"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { autolinkPlugin } from "@dojo-ng/rich-text-autolink";\n  document.getElementById("editor").plugins = [...defaultPlugins, autolinkPlugin];\n</script>'),
 ],
})
NOTES.update({
 "rich-text-emoji": """
An emoji picker and `:shortcode:` replacement for `<dj-rich-text>`.

#### Picker
- The toolbar button opens a searchable emoji picker, eight columns wide. Search by name, shortcode,
  or keyword; move with the arrow keys; insert with a click or Enter.
- The picker stays open so you can insert several, and closes on Escape or a click outside. Focus
  returns to the editor.
- The system emoji picker (Ctrl+Cmd+Space on macOS, Win+. on Windows) also works in the editor.
  This adds a visible picker that works the same on every platform.

#### Shortcodes
- With `shortcodes` on (the default), typing a GitHub-style `:name:` replaces it with the emoji.
  Unknown shortcodes stay as typed.

#### Setup
- Exports `emojiPlugin`, `createEmojiPlugin({ shortcodes?, set? })`, `EMOJI` (about 170 emoji
  across smileys, people, hearts, animals, food, activities, objects, and symbols), the
  `filterEmoji(set, query)` helper, and the `EmojiEntry` type.
- Emoji are plain text, so the plugin adds no node types.
- For hashtags or other highlighted tokens, build a node the way `@dojo-ng/rich-text-mentions`
  builds its mention node. Hashtags are not included on purpose.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold,
  italic, underline, undo, and redo.

#### Not built
- Skin-tone variants, recently used emoji, category headings, a `:shortcode:` suggestion menu, and
  custom image sets.
""",
})
EXAMPLES.update({
 "rich-text-emoji": [
  ("Add an emoji picker and shortcodes", "Compose the emoji plugin with the default set. The toolbar gains an emoji button; typing `:tada:` becomes 🎉.",
   '<dj-rich-text id="editor" label="Comment"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { emojiPlugin } from "@dojo-ng/rich-text-emoji";\n  document.getElementById("editor").plugins = [...defaultPlugins, emojiPlugin];\n</script>'),
 ],
})
NOTES.update({
 "rich-text-slash": """
A `/` command menu for `<dj-rich-text>`: type `/` to insert headings, lists, tables, images, and
more.

#### Using it
- Typing `/` at the start of a block or after a space opens a menu at the caret. ArrowUp and
  ArrowDown move the highlight; Enter, Tab, or a click runs the item; Escape closes the menu.
- Choosing an item removes the `/query` text, then runs the item.
- A query that matches nothing hides the menu.

#### What is in the menu
- The items come from every loaded plugin's `inserts`, plus any `extra` you pass. Headings adds
  Paragraph, Heading 1 to 3, and Quote; lists adds the three list types; image adds Image; table
  adds Table.
- The menu never opens when no plugin adds an item.
- To add actions from your own plugin, give it an `inserts` array (or a function `(ctx) => items`)
  of `{ id, label, keywords?, run(ctx) }`.

#### Setup
- Exports `slashPlugin`, `createSlashPlugin({ extra? })`, `DEFAULT_SLASH_TRIGGER`, and the
  `aggregateInserts` and `filterInserts` helpers.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold,
  italic, underline, undo, and redo.
""",
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
 "rich-text-markdown": """
Markdown for `<dj-rich-text>`: a Markdown value format and typing shortcuts.

#### Markdown value
- Set `format="markdown"` on `dj-rich-text`: `value` then returns Markdown, and setting it parses
  Markdown.
- Coverage follows the plugins that add content types. Pair it with `rich-text-headings`,
  `rich-text-lists`, and `rich-text-links` for headings, lists, and links. Without the headings
  plugin, `# ` stays as typed.
- Pasted text that looks like Markdown is not converted. Markdown comes in through `value` or the
  shortcuts.

#### Shortcuts
- By default, typing `# ` makes a heading, `- ` a list, `**bold**` bold text, and so on, even when
  the value format stays HTML.

#### Setup
- `createMarkdownPlugin({ shortcuts, transformers })` turns the shortcuts off or sets your own
  transformers. `usableTransformers(editor, transformers)` shows which ones apply.
- Requires the `@lexical/markdown` package.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold,
  italic, underline, undo, and redo.
""",
})
EXAMPLES.update({
 "rich-text-markdown": [
  ("Markdown editing", "Compose the markdown plugin with the default set (plus headings/lists/links for full coverage) and set `format=\"markdown\"` so the value round-trips as Markdown. Typing `# ` still makes a heading.",
   '<dj-rich-text id="editor" label="Article" format="markdown"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { headingsPlugin } from "@dojo-ng/rich-text-headings";\n  import { listsPlugin } from "@dojo-ng/rich-text-lists";\n  import { linksPlugin } from "@dojo-ng/rich-text-links";\n  import { markdownPlugin } from "@dojo-ng/rich-text-markdown";\n  const el = document.getElementById("editor");\n  el.plugins = [...defaultPlugins, headingsPlugin, listsPlugin, linksPlugin, markdownPlugin];\n  el.value = "# Title\\n\\nSome **bold** text.";\n</script>'),
 ],
})
NOTES.update({
})
EXAMPLES.update({
 "color-picker": [
  ("Picker with swatches", "Set `format`, turn on `alpha` for opacity, and pass `swatches`. Listen for `dj-change` to read the formatted `value`.",
   '<dj-color-picker id="picker" label="Brand color" format="rgb" alpha></dj-color-picker>\n<script type="module">\n  import "@dojo-ng/color-picker";\n  const p = document.getElementById("picker");\n  p.swatches = ["#e11d48", "#2563eb", { value: "#16a34a", label: "Green" }];\n  p.addEventListener("dj-change", (e) => console.log(e.detail.value));\n</script>'),
 ],
})
NOTES.update({
})
EXAMPLES.update({
 "file-input": [
  ("Accept images, allow several", "Set `accept` and `multiple`; read the selection from `dj-change` or the `files` property.",
   '<dj-file-input id="files" label="Attachments" accept="image/*" multiple max-size="5000000"></dj-file-input>\n<script type="module">\n  import "@dojo-ng/file-input";\n  document.getElementById("files").addEventListener("dj-change", (e) => console.log(e.detail.files));\n</script>'),
  ("Forward files from elsewhere with addFiles", "The app can push files the control did not capture — e.g. a paste or drop on a surrounding compose pane. `addFiles` runs the same `accept` / `multiple` / `max-size` filtering as the picker and emits `dj-change`. (The control also handles a paste directly onto its focused drop zone.)",
   '<dj-file-input id="attach" label="Attachments" accept="image/*" multiple></dj-file-input>\n<script type="module">\n  import "@dojo-ng/file-input";\n  const input = document.getElementById("attach");\n  // A paste anywhere in the compose pane forwards its files to the control.\n  document.querySelector(".compose").addEventListener("paste", (e) => {\n    if (e.clipboardData?.files.length) input.addFiles(e.clipboardData.files);\n  });\n</script>'),
 ],
})
NOTES.update({
 "rich-text-color": """
Text color and highlight color for `<dj-rich-text>`.

#### Setup
- Exports `colorPlugin` (text color), `backgroundColorPlugin`, and
  `createColorPlugin({ styleProperty, label, swatches })`.
- Color is an inline style on the text, so the plugin adds no node types.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold,
  italic, underline, undo, and redo.

#### Using it
- The toolbar button shows the current color as a swatch. Clicking it opens a `dj-color-picker` and
  a Remove color button.
- The picker applies the color live while you drag, without moving focus.
- The popup closes on a click outside or on Escape, and focus returns to the editor.

#### Pasting
- The default paste cleaning removes inline styles, so pasted colored text loses its color.
- Color is kept through `value`, which is not cleaned. A trusted app can set its own
  `pasteSanitizer`.
""",
})
EXAMPLES.update({
 "rich-text-color": [
  ("Text and highlight color", "Compose the color plugins with the default set. `createColorPlugin` customizes the style property, label, or swatches.",
   '<dj-rich-text id="editor" label="Article"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { colorPlugin, backgroundColorPlugin } from "@dojo-ng/rich-text-color";\n  document.getElementById("editor").plugins = [...defaultPlugins, colorPlugin, backgroundColorPlugin];\n</script>'),
 ],
})
NOTES.update({
 "rich-text-image": """
Images for `<dj-rich-text>`, inserted from a file or a URL, with required alt text.

#### Inserting
- The toolbar button opens a dialog with a `dj-file-input` and a URL field. The source used most
  recently wins.
- Alt text is required: the Insert button stays disabled until it is filled in, because an image
  must have an accessible name.
- Click an image to select it; Backspace or Delete then removes it.

#### Setup
- Exports `imagePlugin`, `createImagePlugin({ upload, maxSize })`, `ImageNode`,
  `$createImageNode`, `$isImageNode`, and `INSERT_IMAGE_COMMAND`.
- The default `upload` turns the file into a data URL, which makes the HTML value large. In
  production, pass your own `upload(file) => Promise<string>` that stores the file and returns
  its URL.
- There is no size limit by default. `maxSize` (bytes) limits the file input.
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold,
  italic, underline, undo, and redo.

#### Pasting
- Paste cleaning removes `<img>` tags, so images come in through the dialog or `value`, not by
  pasting.

#### Not built
- Resizing and cropping, captions, inserting by drag or paste, and alignment.
""",
 "rich-text-criticmarkup": """
Track changes for `<dj-rich-text>` in CriticMarkup, a plain-text convention for suggested edits and
comments.

#### The five marks
- `{++inserted++}` and `{--deleted--}`.
- `{~~old~>new~~}`, a substitution. It is imported as a deletion followed by an insertion, and
  accepted or declined as that pair, never one half alone.
- `{>>comment<<}`, on its own or attached right after a highlight.
- `{==highlighted==}`, a note on the text. It is kept on both accept and decline.

#### Suggestion mode
- Turn it on with `setSuggestionMode(editor, true)`, or start with
  `createCriticMarkupPlugin({ suggesting: true })`. Typed and deleted text then becomes marks
  instead of changing the text directly.
- Resolve one mark with `markAtSelection`, `acceptMark`, and `declineMark`, or the whole document
  with `acceptAllMarks` and `declineAllMarks`.
- A comment on its own stays either way. A highlight's attached comment goes with the highlight.

#### Comments
- `insertComment(editor, text)` adds a comment at a collapsed caret, or highlights a selection and
  attaches the comment to it. `editComment` changes a comment.
- `removeComment` removes only the comment and keeps the highlight; `removeHighlight` removes both.
- A comment cannot contain `<<}` or `{>>`, because either would break the mark the next time the
  text is read. `isValidCommentText` checks this, and an invalid comment is refused with a message
  that names the problem.

#### Splitting and joining paragraphs
- A paragraph split or join suggested in suggestion mode is stored as a `¶` token inside a one-line
  mark, not as a real line break, so it survives Markdown import.
- The `structuralEdits` option (default `"mark"`) controls this. `"annotate"` makes the edit
  without tracking it and leaves a comment at the boundary, `"block"` refuses the edit, and
  `"apply"` makes it silently.
- The `¶` token is an extension, not standard CriticMarkup: other tools show it as a literal `¶`.
  Call `toPortableCriticMarkup(value)` before handing a document to another tool. It splits a
  multi-paragraph mark into one mark per paragraph, which can leave a blank line behind on decline.
  Or set `structuralEdits: "annotate"` so the token is never written.
- A `¶` that the author types is written doubled (`¶¶`) so it stays a character.

#### Nested marks
- A mark inside another mark is refused as its own node instead of being garbled. It is kept as
  literal text, and `dj-criticmarkup-refused` fires.

#### Formats
- The plugin adds its own `criticmarkup` format (`format="criticmarkup"`), so it works without the
  Markdown plugin.
- To read CriticMarkup inside `@dojo-ng/rich-text-markdown`'s format, add `criticMarkupTransformers`
  to its transformer set.

#### Without an editor
- The grammar functions (`parseMarks`, `accept`, `decline`, `acceptAll`, `declineAll`,
  `stripComments`, and the token functions) are plain string functions with no Lexical import. Use
  them in a build step, on a server, or in a command-line tool.
- `fixtures/conformance.json` is included, so a port to another language can run the same test
  cases.

#### Setup
- Setting `plugins` replaces the default set, so spread `...defaultPlugins` to keep bold,
  italic, underline, undo, and redo.
""",
})
NOTES.update({
 "chart-financial": """
Candlestick, volume, indicator, and crosshair plugins for `<dj-chart>`, for stock and other
price charts.

These are plugins, not a custom element: put them in `<dj-chart>`'s `plugins` property. A
candlestick chart has no series of its own (`series: []`); the plugins draw everything.

#### Candlesticks
- `candlestickPlugin({ open, high, low, close, style?, upColor?, downColor?, label? })` reads four
  row keys and draws candle bodies (open to close) with wicks (low to high).
- A candle where open equals close still gets a thin visible body.
- `style: "bar"` draws OHLC bars instead, with the same data, tooltip, and table rows.
- Up and down colors come from the `--dj-chart-up` and `--dj-chart-down` tokens. Under
  `forced-colors: active`, up candles are hollow and down candles solid, because forced colors
  replace the token colors.

#### Volume
- `volumePlugin({ key, height?, label? })` draws volume in its own pane below the price chart, not
  as a second axis, so it does not take space from the prices. Its columns line up exactly with the
  candles.
- It colors each bar by reading `open` and `close` keys from the row, not by asking the candlestick
  plugin. With a candlestick plugin that uses other key names, the bars fall back to a neutral color.

#### Indicators
- `indicatorPlugin({ key, kind, period, k?, color?, label? })` draws a moving average or Bollinger
  bands, where `kind` is `"sma"`, `"ema"`, or `"bollinger"`.
- The math comes from the package's own `sma`, `ema`, and `bollinger` functions, which work on plain
  arrays without a chart.
- Before the window is full, the line has a gap, never a drop to zero, the same as `dj-chart`'s
  `missing` property.

#### Crosshair
- `crosshairPlugin({ snap? })` draws a vertical guide at the hovered category and a horizontal guide
  at the pointer's value, both labeled on the axes.
- `snap: true` locks the vertical guide to the nearest category. The horizontal guide always
  follows the pointer.

#### Dates on the x axis
- The x axis stays one slot per row, with the date as a plain string in `category-key`. A real time
  axis would leave empty space for weekends and holidays when the market was closed.
- `tradingDayTicks(categories, pixels, locale)` thins the labels to month starts, or quarter starts
  when months do not fit, and always keeps the first and last date. Use it through `dj-chart`'s
  `formatX`: `chart.formatX = (c) => keep.has(c) ? label(c) : ""`.

#### Performance
- A chart with candles, volume, and an indicator renders in well under 200 ms at 2,000 categories,
  and stays fast up to about 10,000 categories on the hardware it was measured on.
- Above that, aggregate the data. The cost comes from the axis labels and hover areas that
  `dj-chart` draws for each category, not from the candles.
""",
})
EXAMPLES.update({
 "chart-financial": [
  ("Candlestick chart with a volume pane", "Candles and a volume pane, with no core series. `y-scale=\"log\"` suits prices that span a wide range.",
   '<div style="width: 560px; height: 360px">\n  <dj-chart id="candles" type="line" category-key="date" label="AAPL, Jan-Mar 2024" y-scale="log"></dj-chart>\n</div>\n<script type="module">\n  import "@dojo-ng/chart";\n  import { candlestickPlugin, volumePlugin } from "@dojo-ng/chart-financial";\n  const el = document.getElementById("candles");\n  el.series = [];\n  el.plugins = [\n    candlestickPlugin({ open: "open", high: "high", low: "low", close: "close" }),\n    volumePlugin({ key: "volume", height: 70 }),\n  ];\n  el.data = [\n    { date: "2024-01-02", open: 185.6, high: 186.9, low: 184.2, close: 186.1, volume: 82_000_000 },\n    { date: "2024-01-03", open: 186.1, high: 186.4, low: 183.4, close: 184.3, volume: 79_000_000 },\n    { date: "2024-01-04", open: 184.3, high: 185.9, low: 182.7, close: 183.0, volume: 91_000_000 },\n    { date: "2024-01-05", open: 183.0, high: 183.9, low: 181.8, close: 182.7, volume: 88_000_000 },\n    { date: "2024-01-08", open: 182.7, high: 186.2, low: 182.1, close: 185.9, volume: 84_000_000 },\n  ];\n</script>'),
  ("Adding a moving-average indicator", "A 3-day moving average on the price axis. The line starts on day 3, when the window is full.",
   '<div style="width: 560px; height: 360px">\n  <dj-chart id="withIndicator" type="line" category-key="date" label="AAPL with a 3-day SMA" y-scale="log"></dj-chart>\n</div>\n<script type="module">\n  import "@dojo-ng/chart";\n  import { candlestickPlugin, indicatorPlugin, sma } from "@dojo-ng/chart-financial";\n  const el = document.getElementById("withIndicator");\n  el.series = [];\n  el.data = [\n    { date: "2024-01-02", open: 185.6, high: 186.9, low: 184.2, close: 186.1 },\n    { date: "2024-01-03", open: 186.1, high: 186.4, low: 183.4, close: 184.3 },\n    { date: "2024-01-04", open: 184.3, high: 185.9, low: 182.7, close: 183.0 },\n    { date: "2024-01-05", open: 183.0, high: 183.9, low: 181.8, close: 182.7 },\n    { date: "2024-01-08", open: 182.7, high: 186.2, low: 182.1, close: 185.9 },\n  ];\n  el.plugins = [\n    candlestickPlugin({ open: "open", high: "high", low: "low", close: "close" }),\n    indicatorPlugin({ key: "close", kind: "sma", period: 3, label: "SMA(3)" }),\n  ];\n  // The same numbers with no chart at all:\n  // sma(el.data.map((d) => d.close), 3); // [null, null, 184.47..., 183.33..., 183.87...]\n</script>'),
  ("Trading-day tick labels on the ordinal axis", "Month-start labels from `tradingDayTicks`, applied through `formatX`.",
   '<div style="width: 560px; height: 220px">\n  <dj-chart id="ticks" type="line" category-key="date" label="Two years of daily closes" show-grid></dj-chart>\n</div>\n<script type="module">\n  import "@dojo-ng/chart";\n  import { tradingDayTicks } from "@dojo-ng/chart-financial";\n  const el = document.getElementById("ticks");\n  el.series = [{ key: "close", label: "Close" }];\n  el.data = Array.from({ length: 500 }, (_, i) => {\n    const d = new Date(Date.UTC(2024, 0, 2) + i * 86400000);\n    return { date: d.toISOString().slice(0, 10), close: 150 + Math.sin(i / 20) * 15 };\n  });\n  const keep = new Set(tradingDayTicks(el.data.map((d) => d.date), el.clientWidth, document.documentElement.lang || "en-US"));\n  el.formatX = (category) => (keep.has(category) ? category : "");\n</script>'),
 ],
})
EXAMPLES.update({
 "rich-text-image": [
  ("Insert images", "Compose the image plugin with the default set. Pass `createImagePlugin({ upload })` to host files instead of embedding data URLs.",
   '<dj-rich-text id="editor" label="Article"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { createImagePlugin } from "@dojo-ng/rich-text-image";\n  const imagePlugin = createImagePlugin({ upload: async (file) => (await myUploader(file)).url });\n  document.getElementById("editor").plugins = [...defaultPlugins, imagePlugin];\n</script>'),
 ],
 "rich-text-criticmarkup": [
  ("Track changes with suggestion mode", "Compose the plugin with the default set, starting in suggestion mode: typed/deleted text is wrapped as marks instead of applied directly.",
   '<dj-rich-text id="editor" label="Draft"></dj-rich-text>\n<script type="module">\n  import "@dojo-ng/rich-text";\n  import { defaultPlugins } from "@dojo-ng/rich-text";\n  import { createCriticMarkupPlugin } from "@dojo-ng/rich-text-criticmarkup";\n  const el = document.getElementById("editor");\n  el.plugins = [...defaultPlugins, createCriticMarkupPlugin({ suggesting: true })];\n  el.value = "The quick brown fox.";\n</script>'),
  ("Resolve CriticMarkup with no editor", "The grammar is a plain string API — parse and resolve marks from a server, a build step, or a CLI, with no Lexical/DOM dependency at all.",
   'import { parseMarks, acceptAll, declineAll } from "@dojo-ng/rich-text-criticmarkup";\n\nconst draft = "The {--old--}{++new++} plan is set.";\nacceptAll(draft);                        // "The new plan is set."\ndeclineAll(draft);                       // "The old plan is set."\nparseMarks(draft).map((m) => m.kind);    // ["deletion", "insertion"]'),
 ],
})

# Foundation packages (store, context, i18n, dojo-element): what each one is for, and how to use it.
NOTES.update({
 "store": """
Connects Lit components to an external store, so a component re-renders when the state it uses
changes.

#### What is in the package
- `StoreController`: a Lit reactive controller. Pass a store and a selector. The host re-renders
  only when the selected value changes (compared with `Object.is`).
- `createStore`: re-exported from Zustand's vanilla build, for an app that does not have a store yet.
- `ReadableStore`: the type the controller needs. Any object with `getState()` and
  `subscribe(listener)` works, so you can use Zustand, Valtio, Nano Stores (with a small adapter),
  or your own store.

#### Observable interop
- These helpers are for apps that already use RxJS or another library that follows the
  `Symbol.observable` protocol. Nothing in this package needs RxJS.
- `toObservable(store)`: an observable that emits the current state at once, then every change.
- `fromObservable(input, initial)`: a `ReadableStore` that follows an observable. `initial` is
  required, because an observable has no current value until it emits.
- `ObservableController`: re-renders the host on every value from an observable.
""",
 "context": """
Typed keys for sharing values down the DOM tree with the Context Protocol.

A provider and its consumers import the same key, so they connect even when they come from
different packages or bundles. The keys use `Symbol.for`, so each key is the same everywhere.

#### Keys
- `storeContext`: the app's shared store, as a `ReadableStore` from `@dojo-ng/store`. Consumers
  cast it to their own state type.
- `localeContext`: the current BCP 47 locale string, such as `fr-CA`.

#### Also exported
- `createContext`, `ContextProvider`, `ContextConsumer`, `consume`, and `provide`, re-exported
  from `@lit/context`, so you can import everything from one place.
""",
 "i18n": """
Locale, formatting, and translated messages for Dojo NG components.

There is no provider element. A component reads `lang` and `dir` from its nearest ancestor that
sets them, then from the document, then from the default locale.

#### Locale and direction
- `getLocale(el)` and `getDir(el)` return the locale and direction that apply to an element.
  They also look outside shadow roots.
- `LocaleController` keeps a Lit component's `locale` and `dir` current, and re-renders the
  component when either one changes.
- `setDefaultLocale()` sets the locale to use when no `lang` is found. The default is `en`.
- Only changes to `lang` and `dir` in the light DOM are observed. That is where they are usually set.

#### Formatting
- `formatDate`, `formatNumber`, `formatList`, and `plural` use the native `Intl` APIs and take
  an explicit locale.
- The `Intl` objects are cached by locale and options, because they are slow to create.
- `format(template, params)` fills `{name}` placeholders.

#### Messages
- `messages` is the shared `MessageStore`. It keeps message bundles by namespace and locale.
- A lookup tries the locale, then its base language, then the default locale, then `en`. For
  example, `fr-CA` tries `fr-ca`, then `fr`, then `en`.
- Every component registers its English strings under `en`, so it always has labels, even with
  no translations loaded.
- The built-in component strings use the `dj` namespace.
- Register translations before the components render, or before you change `lang`. Registering
  messages does not re-render components that are already on the page.

#### Loaders
- `staticLoader(data)` serves bundles that you include at build time.
- `fetchLoader(pattern)` fetches one JSON file for each namespace and locale. The default pattern
  is `/i18n/{ns}.{locale}.json`.
- For your own transport or cache, write an object with a `load(namespace, locale)` method that
  returns a promise of messages.
""",
 "dojo-element": """
The base class for every Dojo NG component, plus shared helpers for building your own.

#### DojoElement
- It extends `LitElement`. Import it as the default export.
- `emit(name, options)` dispatches a `CustomEvent` that bubbles and crosses shadow boundaries
  (`composed`) by default.
- `static define(tag)` registers the element. Registering the same tag again does nothing. If the
  versions differ, it logs a warning instead of throwing an error.
- `static dependencies` lists child elements to register when the element is created.

#### Form controls
- `FormControl(DojoElement)` is a mixin for form-associated controls.
- A control inside a disabled `<fieldset>` or form is disabled too.
- State is restored after back and forward navigation and after autofill.
- Validity is mirrored onto the host as `data-dj-required`, `data-dj-valid`, `data-dj-invalid`,
  `data-dj-user-valid`, and `data-dj-user-invalid`. The `user-` states turn on only after the
  user has interacted with the control.

#### Helpers
- Focus: `trapTabKey`, `collectFocusables`, `firstFocusable`, `isFocusable`,
  `deepActiveElement`, `isFocusWithin`, and `dismissOnFocusOut`.
- `lockBodyScroll()` stops the page from scrolling behind a modal and returns a function that
  unlocks it. Nested locks are counted.
- `TokenFlagController` reads a true or false flag from a `--dj-*` custom property. The value
  `1` means true.
- `baseStyles` and `reducedMotion` are shared styles for component shadow roots.
""",
})
EXAMPLES.update({
 "store": [
  ("Re-render on part of a store", "Create a store, then select the value a component uses.",
   """import { LitElement, html } from "lit";
import { createStore, StoreController } from "@dojo-ng/store";

export const counter = createStore((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));

class CountButton extends LitElement {
  // Re-renders only when `count` changes.
  #count = new StoreController(this, counter, (s) => s.count);

  render() {
    return html`<button @click=${() => counter.getState().increment()}>
      Clicked ${this.#count.value} times
    </button>`;
  }
}
customElements.define("count-button", CountButton);"""),
  ("Bridge to RxJS", "Turn an observable into a store, or a store into an observable.",
   """import { from, interval } from "rxjs";
import { fromObservable, toObservable } from "@dojo-ng/store";
import { counter } from "./counter.js";

// An observable as a store. Use it with StoreController or the context registry.
const ticks = fromObservable(interval(1000), 0);
ticks.getState(); // 0 until the first tick

// A store as an observable. Use it with RxJS operators.
from(toObservable(counter)).subscribe((state) => console.log(state.count));"""),
 ],
 "context": [
  ("Share a store with descendants", "Provide the store once near the top of the page. Any descendant can consume it with the same key.",
   """import { LitElement, html } from "lit";
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
customElements.define("user-name", UserName);"""),
 ],
 "i18n": [
  ("Translate the built-in strings", "Register French strings for the `dj` namespace, then set `lang`. Components on the page re-render in French.",
   """<dj-alert closable>Enregistré.</dj-alert>
<script type="module">
  import "@dojo-ng/alert";
  import { messages } from "@dojo-ng/i18n";
  messages.register("dj", "fr", { close: "Fermer" });
  document.documentElement.lang = "fr";
</script>"""),
  ("Load translations from JSON files", "Set a loader, load the bundle, then switch `lang`.",
   """import { messages, fetchLoader } from "@dojo-ng/i18n";

messages.setLoader(fetchLoader("/i18n/{ns}.{locale}.json"));
await messages.load("dj", "de"); // fetches /i18n/dj.de.json
document.documentElement.lang = "de";"""),
  ("Format in your own component", "`LocaleController` gives the component its locale and re-renders it when `lang` changes.",
   """import { LitElement, html } from "lit";
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
customElements.define("visit-summary", VisitSummary);"""),
 ],
 "dojo-element": [
  ("Build a component on DojoElement", "Extend the base class, emit events with `emit()`, and register the tag with `define()`.",
   """import DojoElement from "@dojo-ng/dojo-element";
import { html } from "lit";

export class MyGreeting extends DojoElement {
  static properties = { name: {} };

  render() {
    return html`<button @click=${() => this.emit("my-greet", { detail: { name: this.name } })}>
      Hello, ${this.name}
    </button>`;
  }
}
MyGreeting.define("my-greeting");"""),
  ("Style invalid fields", "Form controls mirror their validity onto the host, so page CSS can react to it. Here a hint turns red after the user leaves the field invalid.",
   """<style>
  .field:has(dj-text-input[data-dj-user-invalid]) .hint {
    color: var(--dj-color-danger-600);
  }
</style>
<div class="field">
  <dj-text-input label="Email" type="email" required></dj-text-input>
  <p class="hint">Enter an address like name@example.com.</p>
</div>"""),
 ],
})

# Merges enterprise/tests/readme_content.py's own NOTES/EXAMPLES dicts when the overlay is
# checked out, so an overlay package gets the same migration-note / worked-example treatment as
# a FOSS one with no edit to this public file — same "merge behind an existence check" shape as
# tests/element-packages.js (O3). A public-only clone has no such file and NOTES/EXAMPLES are
# unaffected. Safe from the leak-gate's point of view: these dicts are only ever looked up by
# package name, and every consumer that must stay FOSS-only (gencatalog.py) enumerates FOSS
# package names only, so an overlay entry here is simply never read by it.
_overlay_readmes = G.load_overlay_module("enterprise/tests/readme_content.py")
if _overlay_readmes is not None:
    NOTES.update(getattr(_overlay_readmes, "NOTES", {}))
    EXAMPLES.update(getattr(_overlay_readmes, "EXAMPLES", {}))

def main():
    count = 0
    infra = 0
    for root in PKGS:
        for pkg in sorted(os.listdir(root)):
            if not os.path.isdir(f"{root}/{pkg}/src"):
                continue
            _, s = G.main_file(pkg)
            md = component_readme(pkg, s) if s else infra_readme(pkg)
            open(f"{root}/{pkg}/README.md", "w").write(md)
            if s:
                count += 1
            else:
                infra += 1
    print(f"component READMEs: {count} | infra READMEs: {infra}")


if __name__ == "__main__":
    main()
