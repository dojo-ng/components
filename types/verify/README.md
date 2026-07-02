# Verifying the framework typings (real installs)

The sandbox that generated these typings can't install `@types/react`, `vue`, or
`solid-js`, so the generated `.d.ts` were checked only against stubbed modules.
This folder is the real-install proof — run it locally.

From `components/`:

```bash
npm i -D typescript @types/react vue solid-js
npx tsc -p types/verify/tsconfig.json
```

Expected result: **no output / exit 0** — the typings merged into each
framework's namespace and the prop types resolve.

The tests are self-checking. Each negative case uses `// @ts-expect-error` on a
deliberately invalid value (e.g. `kind: "not-a-kind"`). If the typings were too
loose or an augmentation didn't merge, that line would *not* error and tsc would
fail on the unused `@ts-expect-error` directive. So a clean run proves both that
valid props are accepted and that invalid ones are rejected.

What each file checks:

- `react.test.ts` — `React.JSX.IntrinsicElements` has the tags; `kind` is the
  `ButtonKind` union; data props (`dj-list` `options`) are present.
- `solid.test.ts` — `solid-js` `JSX.IntrinsicElements` has the tags and
  `JSX.CustomEvents` types `on:dj-close`.
- `vue.test.ts` — `@vue/runtime-core` `GlobalComponents` registers the tags.
  (Full template prop/emit checking needs `vue-tsc` on a `.vue` SFC.)
- `dojo.test.ts` — the renderer's `tsx.JSX.IntrinsicElements` has the tags, `kind`
  is the `ButtonKind` union, and the `DjVNodeBase` extras (`key`, `on*`) are
  present. Its base comes from `dojo-renderer-stub.d.ts`, a stand-in for the
  fork's not-yet-shipped JSX types — delete that stub once `@dojo-ng/framework`
  ships a real `vdom.d.ts`. (The dojo target needs no extra npm install.)

Note: `@dojo-ng/*` component packages resolve via the workspace, so run this from
`components/` with the packages built (`npm run build`).
