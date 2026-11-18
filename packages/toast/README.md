# @dojo-ng/toast

`<dj-toaster>` — The region that shows toasts raised with `toast()`.

Part of [Dojo NG](../../README.md), a framework-agnostic web component library built on Lit. BSD-3-Clause.

Most apps never write this element: the first `toast()` call adds one to `document.body`. Write it yourself to choose `placement`, `max-visible`, or `shortcut`. Use one per page.

Show toasts from anywhere in an app with one call: `toast("Saved", { type: "success" })`. It finds the page's `<dj-toaster>`, or adds one to `document.body` the first time, so it needs no setup.

## Install

```bash
npm install @dojo-ng/toast
```

## Usage

Import the package to register the custom element, then use the tag.

One call from anywhere; the first call adds the toaster to the page.

```html
<dj-button id="save">Save</dj-button>
<dj-button id="delete">Delete</dj-button>
<script type="module">
  import { toast } from "@dojo-ng/toast"; import "@dojo-ng/button";
  document.getElementById("save").addEventListener("click", () => toast("Saved", { type: "success" }));
  document.getElementById("delete").addEventListener("click", () =>
    toast("Item deleted", { action: { label: "Undo", onClick: () => toast("Restored") } }));
</script>
```

## Queue and timing

- Toasts are shown in arrival order, at most `max-visible` at a time; the rest wait and come in as shown ones close. The newest shown toast sits nearest the screen edge.
- A toast closes after 5 seconds; `error` and `loading` stay until closed. A toast with an action stays at least 8 seconds. Timers pause while the pointer is over the toaster, while focus is in it, and while the page is hidden.

## Announcements

- The toaster keeps one polite and one assertive live region for every toast on the page. `error` toasts are announced assertively, all others politely, in the order they appear. Each toast renders as a `quiet` `dj-snackbar`, so the snackbars do not announce themselves.

## Keyboard

- `shortcut` (default Alt+T) moves focus to the newest toast's first button, so a keyboard user can reach an Undo. The shortcut is part of the region's label. It is registered with `@dojo-ng/commands` as `dj-toaster.focus`, so it shows in the command palette's shortcut help, and does nothing while no toast is showing.
- Escape closes the focused toast and returns focus to where it was before.

## Not built

- Swipe to dismiss, rich content, and browser (Notification API) notifications.

Need one of these? Make a request on [Discord](https://discord.gg/nReZF9QrjS) or add an issue (work item) on [Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues).

## Options

- `type`: `info` (default), `success`, `warning`, `error`, or `loading`.
- `duration`: milliseconds. Default 5000; `error` and `loading` stay until closed. `Infinity` keeps any toast open.
- `action`: `{ label, onClick(handle) }`, such as Undo. The toast closes after `onClick`.
- `dismissible`: show a close button and allow Escape. Default true.
- `id`: pass an existing id to update that toast in place instead of adding one.

## The function API

- `toast(message, options)` returns `{ id, dismiss(), update(options) }`; `update` also takes `message`.
- `toast.promise(promise, { loading, success, error })` shows a loading toast and turns it into a success or error toast when the promise settles. `success` and `error` can be functions of the value or reason.
- `toast.dismiss(id)` closes one toast; with no id it closes all of them.

## Snackbar or toast?

Use `dj-snackbar` for one message you place and open yourself, such as a fixed "offline" bar. Use `toast()` when messages come from many places in the app, can overlap, or need Undo. Each toast renders as a `quiet` `dj-snackbar`, so the two look the same.

## Properties

`↻` marks an attribute reflected to the DOM; a dash means the property is set in JavaScript only.

| Property | Attribute | Type | Default |
|---|---|---|---|
| `placement` | placement ↻ | `ToasterPlacement` | `"bottom-center"` |
| `maxVisible` | max-visible | `number` | `3` |
| `shortcut` | shortcut | `string` | `"Alt+T"` |
| `label` | label | `string` | — |

## Events

- `dj-toast-close`: A toast started closing; `detail` is `{ id, reason }`, reason being `timeout`, `action`, `close`, `escape`, or `api`.

## Methods

- `show(message: string, options: ToastOptions): ToastHandle`: Add a toast, or update the one whose `id` matches.
- `updateToast(id: string, options: ToastUpdate)`: Change a toast in place. Its timer starts over. Does nothing if the toast is gone.
- `dismiss(id: string, reason: ToastCloseReason)`: Close one toast, or every toast when `id` is omitted.

## CSS custom properties

- `--dj-toaster-z-index`: Stacking order of the toaster. Default `970`.
- `--dj-toaster-offset`: Distance from the viewport edges. Default `1rem`.

## Examples

### Promise toast

Loading until the promise settles, then success or error in the same toast.

```html
<dj-button id="send">Send</dj-button>
<script type="module">
  import { toast } from "@dojo-ng/toast"; import "@dojo-ng/button";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  document.getElementById("send").addEventListener("click", () =>
    toast.promise(wait(1500), { loading: "Sending", success: "Sent", error: "Send failed" }));
</script>
```

### Placement

Write the toaster yourself to choose where toasts appear and how many show at once.

```html
<dj-toaster placement="top-end" max-visible="2"></dj-toaster>
```

## Theming

Styled with Dojo NG `--dj-*` design tokens and exposes `::part()` hooks for targeted overrides.

## Accessibility and i18n

Follows the project's WCAG 2.2 AA and localization conventions.

## More

Live, interactive examples are at [play.dojo-ng.com](https://play.dojo-ng.com). For the full API reference, theming, accessibility, and localization guides, see the [Dojo NG documentation](../../README.md).
