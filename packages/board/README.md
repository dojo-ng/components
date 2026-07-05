# @dojo-ng/board

`<dj-board>` — A Kanban board over plain records.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

A Kanban board over plain records. Lanes are the values of one field (`group-by`); cards are the records of `data`, ordered within a lane by their order of appearance. The board is CONTROLLED: it never mutates `data` — every move (menu, keyboard) emits `dj-card-move` and the app applies it (the exported `applyCardMove` helper makes that one line); focus then follows the moved card and the move is announced to assistive tech once the app's data update lands. Card content comes from `renderCard`, rendered inside the component-owned accessible shell (so custom cards cannot regress accessibility), or defaults to a `dj-card` showing the `card-title` field. Keyboard: one tab stop (roving); arrows move between cards and lanes, Home/End within a lane, Enter activates, Space or M opens the move menu, and Ctrl/Cmd+arrows move the card itself. WIP limits are advisory (`n/limit` count and an over-limit style hook, never blocking).

> The board is CONTROLLED: it never changes `data`. Listen for `dj-card-move`, apply it (the exported `applyCardMove` makes that one line), and assign the new array — focus then follows the moved card and the move is announced. Explicit `lanes` are recommended over the derived fallback (they fix lane order, give labels, and include empty lanes). Set `draggable` to enable pointer and touch drag between lanes (built on `@dojo-ng/dnd`); it is progressive enhancement — the move menu and keyboard shortcuts remain the accessibility contract, so drag is never the only way to move a card.

## Install

```bash
npm install @dojo-ng/board
```

## Usage

Import the package to register the custom element, then use the tag.

Moves (menu, Ctrl/Cmd+arrows) emit `dj-card-move`; the app applies them with `applyCardMove`.

```html
<dj-board id="b" label="Sprint board" group-by="status"></dj-board>
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
</script>
```

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `data` | — | `Card[]` | `[]` |
| `lanes` | — | `BoardLane[]` | `[]` |
| `groupBy` | group-by | `string` | `"status"` |
| `cardKey` | card-key | `string` | `"id"` |
| `cardTitle` | card-title | `string` | `"title"` |
| `label` | label | `string` | — |
| `renderCard` | — | `(card: Card) => TemplateResult` | — |
| `draggable` | draggable ↻ | `boolean` | `false` |

**Slots:** `none` (cards come from `data`)

**Parts:** `board`, `lane`, `lane-over`, `lane-header`, `lane-title`, `lane-count`, `lane-body`, `card`, `move-button`, `lane${over`, `?`

**Events:** `dj-card-move` (detail `{ card, key, from, to, fromIndex, toIndex }`; the board never
applies it itself), `dj-card-click` (detail `{ card, key }`)

**Methods:** `effectiveLanes(): BoardLane[]` (The lanes to display: the `lanes` property, or distinct `group-by` values in data order.)

**CSS properties:** `--dj-board-lane-width` (default `18rem`; Fixed width of each lane.), `--dj-board-gap` (default `1rem`; Gap between lanes.)

## Examples

### Custom card content

`renderCard` supplies the inside of the card; the accessible shell (focus, move menu) stays component-owned.

```html
<script type="module">
  import { html } from "lit";
  import "@dojo-ng/board";
  document.querySelector("dj-board").renderCard = (card) =>
    html`<dj-card kind="outlined">
      <strong>${card.title}</strong>
      <div>${card.assignee ?? "Unassigned"}</div>
    </dj-card>`;
</script>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are in the playground (`playground/index.html`). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
