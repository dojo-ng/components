"""
genversions.py — sync each element's `static version` with its package.json.

Run from components/ (normally via the `version-packages` npm script, right after
`changeset version`):

    python3 genversions.py

Every component hardcodes `static [override] version = "…"` so DojoElement.define()
can report a version conflict when two builds register the same tag. Under
independent Changesets versioning each package bumps on its own, so this rewrites
that literal in each package's primary class file to match the package.json
`version`. Support packages (no custom element, no version field) are skipped.

Idempotent: rewrites only when the value actually differs, so a run with nothing
to bump reports "already in sync" and produces no diffs.
"""

import glob
import json
import os
import re

from genlib import FOSS_ROOT, main_file

VERSION_RE = re.compile(r'(static\s+(?:override\s+)?version\s*=\s*")[^"]*(")')


def sync():
    """Rewrite each element's static version to its package.json version. FOSS-only,
    deliberately: the overlay versions independently under its own changeset config (see
    enterprise-export-phase2-spec.md O5), so it needs its own version-sync when that exists.
    Returns the list of (path, version) actually changed."""
    changed = []
    for pj in sorted(glob.glob(f"{FOSS_ROOT}/*/package.json")):
        pkg = os.path.basename(os.path.dirname(pj))
        version = json.load(open(pj)).get("version")
        if not version:
            continue
        path, src = main_file(pkg)
        if not path:
            continue
        new = VERSION_RE.sub(rf"\g<1>{version}\g<2>", src, count=1)
        if new != src:
            open(path, "w").write(new)
            changed.append((path, version))
    return changed


if __name__ == "__main__":
    changed = sync()
    for path, version in changed:
        print(f"updated {path} -> {version}")
    print(f"{len(changed)} file(s) updated" if changed else "all versions already in sync")
