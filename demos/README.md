# Dojo NG demos

Runnable demo apps that show the components working together in something closer to a
real app than the component playground. They use the same no-bundler setup as the
playground: static HTML, import maps, and the `dist/` builds — no build step.

The brainstorm and rationale for the full demo lineup live in `../../demo-apps.md`;
build tracking is in `../../demo-apps-spec.md`. Two of the ranked candidates are built
here; the rest are deferred (listed at the bottom).

## Running them

From the `components/` root:

```
npm run build   # once, so the dist/ builds the pages import exist
npm run serve   # static server on http://localhost:8080
```

Then open `http://localhost:8080/demos/interop/` or `http://localhost:8080/demos/records/`.
The interop matrix's React and Vue frames pull their runtimes from esm.sh, so those two
need network access; everything else is local.

## What's here

`interop/` — the framework-interop matrix. The same member-signup card runs, unchanged,
in four hosts side by side: plain HTML/JS, the `@dojo-ng/framework` renderer, React 19,
and Vue 3. It's the sharpest demonstration of framework neutrality: each host passes an
array to a component as a property, listens for the components' bubbling custom events,
submits through a native form, and shares one theme and one locale mechanism. Teaches:
custom elements are framework-agnostic; the two interop points (rich data as a property,
`dj-*` events as plain CustomEvents); token theming and i18n across hosts.

`records/` — the enterprise records manager. A `dj-data-grid` over 500 deterministically
generated members with sort, quick and per-column filtering, pagination, and row
selection; per-row pencil/X icon actions; a header with Add and "Delete selected"; a
validated add/edit `dj-dialog`; per-row delete confirmation via `dj-popup-confirmation`;
`dj-snackbar` for mutations; and theme plus English/German locale switches. Teaches: the
grid in a full CRUD loop, form-associated validation, the grid plugin model, and theming
and i18n in a data-dense app.

## Deferred

From the ranked list in `../../demo-apps.md`, these are noted but not built: the Monaco
code-editor workbench, RealWorld / Conduit, the assessment/quiz flow, and growing the
playground into a documented gallery.
