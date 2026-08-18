"""
gentsconfig.py — generates the root tsconfig.json project references and keeps
tsconfig.base.json's `compilerOptions.paths` overlay-aware.

Run from components/:

    python3 gentsconfig.py

tsconfig.json's `references` used to hand-list every package (110 entries, one
edit per new package). This derives the list from the workspace globs instead —
`packages/*`, plus `enterprise/packages/*` when that directory exists — so a
new package of either kind needs no edit here. Reference order has no build
meaning to tsc, but the existing file's order predates this generator and
isn't reconstructible from anything on disk (it's package-creation order, and
directory listing order doesn't preserve that on every filesystem). So a run
seeds itself from whatever tsconfig.json already has: known packages keep
their position, newly discovered ones are appended, FOSS before overlay and
sorted by name within each. A FOSS-only regeneration is therefore
byte-identical to the hand-written file it replaces, and adding a package only
ever appends.

tsconfig.base.json's `paths` map is the same class of hand-maintained data,
but selective rather than exhaustive: most packages resolve fine through the
workspace's own node_modules symlinks, and `paths` has only ever covered some
of the packages another package imports by bare specifier — never all of them,
and not consistently, because leaving it out never broke a build. There's no
rule left to recover from a fresh scan that reproduces its current shape
exactly, so the FOSS half is seeded from the current file the same way the
reference list is. What generation buys is the overlay half: entries for
`@dojo-ng-pro/*` packages imported by bare specifier from other overlay
packages are discovered fresh, so the overlay never needs a hand edit to this
tracked file to pick up a new cross-package import.
"""

import glob
import json
import os
import re

TSCONFIG_JSON = "tsconfig.json"
TSCONFIG_BASE_JSON = "tsconfig.base.json"

FOSS_ROOT = "packages"
OVERLAY_ROOT = "enterprise/packages"
OVERLAY_SCOPE = "@dojo-ng-pro"


def _roots():
    roots = [FOSS_ROOT]
    if os.path.isdir(OVERLAY_ROOT):
        roots.append(OVERLAY_ROOT)
    return roots


def _packages(root):
    return sorted(os.path.basename(p.rstrip("/")) for p in glob.glob(f"{root}/*/"))


def gen_references():
    """{"files": [], "references": [...]} — see module docstring for the ordering rule."""
    roots = _roots()
    discovered = {root: _packages(root) for root in roots}
    all_paths = {f"{root}/{name}" for root in roots for name in discovered[root]}

    existing = []
    if os.path.exists(TSCONFIG_JSON):
        for ref in json.load(open(TSCONFIG_JSON)).get("references", []):
            existing.append(ref["path"])

    refs = [p for p in existing if p in all_paths]
    kept = set(refs)
    for root in roots:
        for name in discovered[root]:
            p = f"{root}/{name}"
            if p not in kept:
                refs.append(p)
                kept.add(p)

    return {"files": [], "references": [{"path": p} for p in refs]}


_IMPORT_RE = re.compile(r'''["']@([\w.-]+/[\w.-]+)["']''')


def _bare_imports(root, scope):
    """{target-package-name: set(importing-package-names)} for src files under `root`,
    restricted to imports of the form `<scope>/<name>` (never crosses scopes)."""
    imported_by = {}
    for name in _packages(root):
        for f in glob.glob(f"{root}/{name}/src/*.ts"):
            src = open(f, encoding="utf-8").read()
            for m in _IMPORT_RE.finditer(src):
                spec = "@" + m.group(1)
                if not spec.startswith(f"{scope}/"):
                    continue
                target = spec[len(scope) + 1 :]
                if target == name:
                    continue
                imported_by.setdefault(target, set()).add(name)
    return imported_by


def gen_paths():
    """The full `paths` dict — FOSS entries seeded from the current file (see module
    docstring), overlay entries discovered fresh from overlay-internal bare imports."""
    existing_paths = {}
    if os.path.exists(TSCONFIG_BASE_JSON):
        existing_paths = (
            json.load(open(TSCONFIG_BASE_JSON)).get("compilerOptions", {}).get("paths", {})
        )

    paths = dict(existing_paths)

    if os.path.isdir(OVERLAY_ROOT):
        overlay_pkgs = set(_packages(OVERLAY_ROOT))
        imported = _bare_imports(OVERLAY_ROOT, OVERLAY_SCOPE)
        for target in sorted(imported):
            if target not in overlay_pkgs:
                continue
            key = f"{OVERLAY_SCOPE}/{target}"
            if key not in paths:
                paths[key] = [f"./{OVERLAY_ROOT}/{target}/dist/index.d.ts"]

    return paths


def write():
    tsconfig = gen_references()
    open(TSCONFIG_JSON, "w").write(json.dumps(tsconfig, indent=2))

    base = json.load(open(TSCONFIG_BASE_JSON))
    base["compilerOptions"]["paths"] = gen_paths()
    open(TSCONFIG_BASE_JSON, "w").write(json.dumps(base, indent=2))


if __name__ == "__main__":
    write()
    refs = gen_references()["references"]
    paths = gen_paths()
    print(f"{TSCONFIG_JSON}: {len(refs)} references")
    print(f"{TSCONFIG_BASE_JSON}: {len(paths)} paths entries")
