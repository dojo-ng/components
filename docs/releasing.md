# Releasing Dojo NG

Dojo NG uses [Changesets](https://github.com/changesets/changesets) with independent versioning:
each `@dojo-ng/*` package has its own version, and a release bumps and publishes only the packages
that changed plus the packages that depend on them. Packages publish to public npm under the
`dojo-ng` organization. The license is BSD-3-Clause.

## The loop

1. Contributors describe each change with a changeset (`npx changeset`), committed alongside the
   work. See [.changeset/README.md](../.changeset/README.md).
2. To cut a release, a maintainer runs `npm run version-packages`. Changesets consumes the pending
   changeset files, bumps each affected package's version, rewrites the internal dependency ranges
   (`@dojo-ng/*` deps are bumped by a patch when a dependency releases), and writes each package's
   `CHANGELOG.md`.
3. Review and commit that diff with Mercurial.
4. `npm run release` builds the workspace and runs `changeset publish`, which publishes the newly
   bumped packages to npm. It needs an `NPM_TOKEN` with publish rights to the `dojo-ng` org,
   exposed as a masked CI variable (or in your local npm auth for a manual release).

## Configuration choices

- Independent versioning (`fixed: []`): only changed packages and their dependents are released.
- `access: "public"`: scoped packages are published publicly.
- `commit: false`: Changesets does not commit; we commit with Mercurial.
- `updateInternalDependencies: "patch"`: a package that depends on a released package gets a patch
  bump so it picks up the new range.
- The private workspace root (`@dojo-ng/components`) is never published.

## Mercurial and CI notes

Changesets assumes Git. We work around it: no auto-commit, and a changelog formatter that does not
need Git. The only unsupported feature is `changeset status --since=<git-ref>`; it is not used in
the normal flow.

In CI (a `.gitlab-ci.yml` on Heptapod), the release job runs `npm ci`, then `npm run release` with
`NPM_TOKEN` set. Wiring that pipeline is pending the repository going live on Heptapod.
