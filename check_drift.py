"""check_drift.py — assert the tracked generated artifacts are up to date with source.

`custom-elements.json` (gencem.py), `docs/components-reference.md` (gendocs.py), `types/*.d.ts` +
`types/README.md` (gentypes.py), and `packages/*/README.md` (genreadmes.py) are all generated from
component source and checked in. A commit that changes a component's source without regenerating
them leaves the repo self-inconsistent. This hashes the tracked artifacts, runs the generators, and
fails if any artifact's content changed.

The skill repo's `references/components.md` (gencatalog.py) gets its own check rather than joining
`targets()`: it lives outside this repo, across a Mercurial boundary, so a CI clone that checks out
only `components/` may not have it. Regenerated with `DJ_SKILL_CATALOG` pointed at a throwaway temp
path — the real tracked file is never written by this script — and hash-compared against the
tracked file; skipped, with a printed line saying so, when that file isn't present. A skip must
never read as a pass.

Per the project's "verifying honestly" rule: assert each generator exited 0 and each artifact
still exists BEFORE comparing hashes. A diff-based check false-passes when a generator dies
before writing anything and the old file is still sitting there.

Run from components/:  python3 check_drift.py
"""

import glob
import hashlib
import os
import shutil
import subprocess
import sys
import tempfile

SKILL_CATALOG = os.environ.get(
    "DJ_SKILL_CATALOG", os.path.join("..", "skill", "dojo-ng", "references", "components.md")
)


def targets():
    return sorted(
        ["custom-elements.json", "docs/components-reference.md", "types/dojo.d.ts",
         "types/react.d.ts", "types/solid.d.ts", "types/vue.d.ts", "types/README.md"]
        + glob.glob("packages/*/README.md")
    )


def hashes(paths):
    out = {}
    for p in paths:
        with open(p, "rb") as f:
            out[p] = hashlib.sha256(f.read()).hexdigest()
    return out


def assert_exist(paths):
    missing = [p for p in paths if not os.path.exists(p)]
    if missing:
        print(f"check_drift: missing artifact(s) before/after generation: {missing}")
        sys.exit(1)


def run(cmd, env=None):
    result = subprocess.run(cmd, env=env)
    if result.returncode != 0:
        print(f"check_drift: generator failed ({' '.join(cmd)}), exit {result.returncode}")
        sys.exit(1)


def check_skill_catalog():
    """Hash-compare the tracked skill-repo catalog against a fresh regeneration, without ever
    writing the real tracked file. Returns True if checked and clean, False if skipped (the
    tracked file isn't present — e.g. a components-only CI clone). Exits 1 directly, in the same
    shape main()'s own drift report uses, if checked and drifted."""
    if not os.path.exists(SKILL_CATALOG):
        print(
            f"check_drift: skill catalog NOT checked — {SKILL_CATALOG} not found "
            "(this clone doesn't have the skill repo checked out beside it)"
        )
        return False

    with open(SKILL_CATALOG, "rb") as f:
        before = hashlib.sha256(f.read()).hexdigest()

    tmp_dir = tempfile.mkdtemp(prefix="dj-catalog-check-")
    try:
        tmp_path = os.path.join(tmp_dir, "components.md")
        run(["python3", "gencatalog.py"], env={**os.environ, "DJ_SKILL_CATALOG": tmp_path})
        if not os.path.exists(tmp_path):
            print(f"check_drift: missing artifact after generation: {tmp_path}")
            sys.exit(1)
        with open(tmp_path, "rb") as f:
            after = hashlib.sha256(f.read()).hexdigest()
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    if before != after:
        print("check_drift: the skill catalog is out of date, regenerate and commit (in the skill repo):")
        print(f"  - {SKILL_CATALOG}")
        sys.exit(1)

    return True


def main():
    before_paths = targets()
    assert_exist(before_paths)
    before = hashes(before_paths)

    run(["python3", "gencem.py"])
    run(["python3", "gendocs.py"])
    run(["python3", "gentypes.py"])
    run(["python3", "genreadmes.py"])

    after_paths = targets()
    assert_exist(after_paths)
    after = hashes(after_paths)

    if before_paths != after_paths:
        added = sorted(set(after_paths) - set(before_paths))
        removed = sorted(set(before_paths) - set(after_paths))
        print(f"check_drift: artifact set changed — added {added}, removed {removed}")
        sys.exit(1)

    drifted = [p for p in before_paths if before[p] != after[p]]
    if drifted:
        print("check_drift: generated artifacts are out of date, regenerate and commit:")
        for p in drifted:
            print(f"  - {p}")
        sys.exit(1)

    catalog_checked = check_skill_catalog()
    total = len(before_paths) + (1 if catalog_checked else 0)
    note = "catalog checked" if catalog_checked else "catalog NOT checked"
    print(f"check_drift: clean, {total} artifacts up to date ({note})")


if __name__ == "__main__":
    main()
