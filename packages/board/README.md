# @dojo-ng/board

`<dj-board>` — A Kanban board over plain records.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Cards are the records in `data`. Lanes are the values of one field, named by `group-by`. Within a lane, cards keep their order in `data`.

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

## Moving cards

- The board is controlled: it never changes `data`. Every move emits `dj-card-move`, and your app applies it and assigns the new array. The exported `applyCardMove` does that in one line.
- When the new data arrives, focus follows the moved card and the move is announced to assistive technology.
- Cards move with the move menu or the keyboard. Set `draggable` to also allow pointer and touch drag between lanes. Drag is an extra: the menu and the keyboard stay available, so dragging is never the only way to move a card.

## Lanes and cards

- Set `lanes` explicitly when you can. It fixes the lane order, gives each lane a label, and shows empty lanes. Without it, lanes come from the values found in `data`.
- `renderCard` supplies the card content. The board draws it inside its own accessible card shell, so a custom card cannot break accessibility. Without `renderCard`, each card is a `dj-card` showing the `card-title` field.
- Work-in-progress limits are advisory: the lane shows a count such as `3/5` and gets a style hook when it is over the limit, but moves are never blocked.

## Keyboard

The board is one tab stop.

- The arrow keys move between cards and lanes; Home and End move within a lane.
- Enter activates the card.
- Space or M opens the move menu.
- Ctrl+arrow (Cmd+arrow on a Mac) moves the card itself.

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

## Slots

- `none`: Cards come from `data`.

## CSS parts

- `board`
- `lane`
- `lane-over`
- `lane-header`
- `lane-title`
- `lane-count`
- `lane-body`
- `card`
- `move-button`
- `lane${over`
- `?`

## Events

- `dj-card-move`: Detail `{ card, key, from, to, fromIndex, toIndex }`; the board never
applies it itself.
- `dj-card-click`: Detail `{ card, key }`.

## Methods

- `effectiveLanes(): BoardLane[]`: The lanes to display: the `lanes` property, or distinct `group-by` values in data order.

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

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
