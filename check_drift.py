"""check_drift.py — assert the tracked generated artifacts are up to date with source.

`custom-elements.json` (gencem.py), `types/*.d.ts` + `types/README.md` (gentypes.py), and
`packages/*/README.md` (genreadmes.py) are all generated from component source and checked in.
A commit that changes a component's source without regenerating them leaves the repo
self-inconsistent. This hashes the tracked artifacts, runs the generators, and fails if any
artifact's content changed.

`gendocs.py` is deliberately not included: it writes /tmp/components-reference.md, and the
tracked docs/components-reference.md is copied into place by hand, so comparing them would prove
nothing about drift.

Per the project's "verifying honestly" rule: assert each generator exited 0 and each artifact
still exists BEFORE comparing hashes. A diff-based check false-passes when a generator dies
before writing anything and the old file is still sitting there.

Run from components/:  python3 check_drift.py
"""

import glob
import hashlib
import subprocess
import sys


def targets():
    return sorted(
        ["custom-elements.json", "types/dojo.d.ts", "types/react.d.ts", "types/solid.d.ts",
         "types/vue.d.ts", "types/README.md"]
        + glob.glob("packages/*/README.md")
    )


def hashes(paths):
    out = {}
    for p in paths:
        with open(p, "rb") as f:
            out[p] = hashlib.sha256(f.read()).hexdigest()
    return out


def assert_exist(paths):
    missing = [p for p in paths if not __import__("os").path.exists(p)]
    if missing:
        print(f"check_drift: missing artifact(s) before/after generation: {missing}")
        sys.exit(1)


def run(cmd):
    result = subprocess.run(cmd)
    if result.returncode != 0:
        print(f"check_drift: generator failed ({' '.join(cmd)}), exit {result.returncode}")
        sys.exit(1)


def main():
    before_paths = targets()
    assert_exist(before_paths)
    before = hashes(before_paths)

    run(["python3", "gencem.py"])
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

    print(f"check_drift: clean, {len(before_paths)} artifacts up to date")


if __name__ == "__main__":
    main()
