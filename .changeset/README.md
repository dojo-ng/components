# Changesets

This folder holds [changesets](https://github.com/changesets/changesets): small Markdown files
that describe pending changes and the version bump each one implies. Versioning is independent,
so only the packages you touch (and their dependents) are bumped and published.

## Adding a changeset

When you make a change worth releasing, run:

```bash
npx changeset
```

Pick the affected packages, choose `patch` / `minor` / `major`, and write a one-line summary.
This writes a Markdown file here. Commit it with your change (this repo uses Mercurial):

```bash
hg add .changeset/<name>.md && hg commit -m "Add changeset"
```

## Releasing (maintainers)

1. `npm run version-packages` — applies all pending changesets: bumps versions, updates internal
   dependency ranges, writes each package's CHANGELOG, and deletes the consumed changeset files.
2. Review the diff, then commit it with Mercurial.
3. `npm run release` — builds, then runs `changeset publish` to publish the bumped packages to npm
   (needs an `NPM_TOKEN` with publish rights to the `dojo-ng` org).

## Mercurial note

Changesets is built around Git. We configure around that: `commit: false` (we commit with `hg`,
not Git) and a Git-free changelog. The one feature that does not work under Mercurial is
`changeset status --since=<ref>`, which diffs against a Git ref; it is not part of the normal
add/version/publish flow, so this is not a problem in practice.
