# Contributing to Dojo NG components

Thank you for helping. This file explains how to report a problem and how to send a change to
the `@dojo-ng` component packages. Everyone who takes part agrees to follow the
[code of conduct](CODE_OF_CONDUCT.md).

## Ask a question

Chat happens on [Discord](https://discord.gg/nReZF9QrjS). Ask there before starting anything
large, so nobody does the same work twice.

## Report a problem

Open an issue in this repository on
[Heptapod](https://foss.heptapod.net/dojo-ng/components/-/issues). Include:

- the package and its version, for example `@dojo-ng/select` 0.1.1
- the browser and its version
- the smallest page that shows the problem; a plain HTML page with an import map is often enough

The GitHub mirror at `github.com/dojo-ng` is read-only. Issues and merge requests opened there
are not tracked.

## Send a change

1. Pick an issue. Issues labeled
   [good first issue](https://foss.heptapod.net/dojo-ng/components/-/issues/?label_name%5B%5D=good%20first%20issue)
   are small and well scoped.
2. Clone with Mercurial and build:

   ```bash
   hg clone https://foss.heptapod.net/dojo-ng/components
   cd components
   npm install
   npm run build
   ```

3. Work on a topic. Heptapod uses Mercurial topics where Git uses branches:

   ```bash
   hg topics fix-dialog-focus
   ```

4. Run the checks before you push:

   ```bash
   npm run lint
   npm run test:unit
   npm run test:browser
   ```

   `scripts/precommit.sh` runs the fast checks (type-check, lint, unit tests). The README
   explains how to wire it in as a Mercurial hook.

5. If the change should be released, add a changeset with `npx changeset` and commit it with
   your change. See [.changeset/README.md](.changeset/README.md).
6. Push the topic. Heptapod prints a link to open the merge request:

   ```bash
   hg push --topic fix-dialog-focus
   ```

   If you cannot push to this project, fork it on Heptapod and open the merge request from your
   fork.

## How the library is built

- [Component conventions](docs/component-conventions.md): naming, properties and events, theming
  hooks, form association, and accessibility. A new component follows these.
- [QA requirements](docs/qa-requirements.md): what is tested and the pass or fail gates.
- [Accessibility](docs/accessibility.md): keyboard, focus, forced colors, and WCAG 2.2 AA.

To extend a component without changing it, write a plugin instead. The
[plugin guide](https://dojo-ng.com/docs/plugins/) shows how.

## License

Dojo NG is BSD-3-Clause. By contributing, you agree that your contribution is released under
the same license. See [LICENSE](LICENSE).
