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
   `CHANGELOG.md`. The script then runs `python3 genversions.py`, which rewrites each element's
   `static version` literal to match its new package.json `version` (that literal is what
   `DojoElement.define()` reports in a tag-registration conflict, so it must track the release
   version). `genversions.py` is idempotent — it only rewrites where the value differs — so it is
   safe to run any time; commit its diff together with the Changesets bump.
3. Review and commit that diff with Mercurial.
4. `npm run release` builds the workspace and runs `changeset publish`, which publishes the newly
   bumped packages to npm. **Run this locally, logged in with `npm login`.** It will prompt for a
   live one-time password, and that prompt is the authorization step — see "Publishing is local"
   below for why it cannot be automated.

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

## Publishing is local, not CI

CI verifies; a human publishes. This was established the hard way on `@dojo-ng/framework`, and
components inherits the conclusion rather than rediscovering it.

Two independent blockers, neither of which any configuration fixes. The packages' npm security
setting is "require two-factor authentication and disallow bypass 2FA tokens", which rejects every
token — including bypass-2FA-capable ones — without a live one-time password, so a CI publish fails
with `EOTP` by design. And npm's OIDC Trusted Publishing, the obvious way around a static token,
does not recognize self-hosted GitLab instances; `foss.heptapod.net` is self-hosted, so the handshake
is never attempted and the job fails with `ENEEDAUTH`.

So there is no `release` job. In its place CI runs a `pack` job (`npm run build && npm pack
--dry-run`), which verifies that the tarball each package produces is what a consumer would actually
receive. That is the one part of a release CI can still check. To cut a release, follow the loop
above and run step 4 yourself.
