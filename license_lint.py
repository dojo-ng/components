"""
license_lint.py — Track O's license linter (enterprise-export-phase2-spec.md O6).

Every package under `packages/` carries `BSD-3-Clause`. Every package under
`enterprise/packages/` carries whatever `enterprise/LICENSE` says — checked against a package's
`license` field POINTING at that file (`"SEE LICENSE IN ../../LICENSE"`, the npm convention for a
license that lives in a file rather than an SPDX identifier), not against embedded text, because
`enterprise/LICENSE` doesn't have real terms yet (see O5's dated note) and won't be duplicated
into every package.json once it does.

This catches a package created in the wrong tree — the likeliest human error in this design: a
package scaffolded by copying an existing one keeps whatever `license` field its template had,
and a FOSS template copied into `enterprise/packages/` would silently ship BSD-3-Clause on a
commercial package.

Usage: python3 license_lint.py
Exits non-zero, printing every violation, if a package's license field doesn't match its tree.
"""

import glob
import json
import os
import sys

FOSS_ROOT = "packages"
OVERLAY_ROOT = "enterprise/packages"
FOSS_LICENSE = "BSD-3-Clause"
OVERLAY_LICENSE_FILE = "enterprise/LICENSE"
OVERLAY_LICENSE_FIELD = "SEE LICENSE IN ../../LICENSE"


def check():
    """[str] — one line per violation, or [] if every package's license matches its tree."""
    findings = []

    for path in sorted(glob.glob(f"{FOSS_ROOT}/*/package.json")):
        with open(path, encoding="utf-8") as f:
            pkg = json.load(f)
        lic = pkg.get("license")
        if lic != FOSS_LICENSE:
            findings.append(f"{path}: license is {lic!r}, expected {FOSS_LICENSE!r}")

    if os.path.isdir(OVERLAY_ROOT):
        if not os.path.exists(OVERLAY_LICENSE_FILE):
            findings.append(
                f"{OVERLAY_LICENSE_FILE} is missing — cannot check overlay package licenses "
                "against it"
            )
        else:
            for path in sorted(glob.glob(f"{OVERLAY_ROOT}/*/package.json")):
                with open(path, encoding="utf-8") as f:
                    pkg = json.load(f)
                lic = pkg.get("license")
                if lic == FOSS_LICENSE:
                    findings.append(
                        f"{path}: license is {FOSS_LICENSE!r} — looks like a FOSS package.json "
                        f"was copied into {OVERLAY_ROOT} and never updated"
                    )
                elif lic != OVERLAY_LICENSE_FIELD:
                    findings.append(
                        f"{path}: license is {lic!r}, expected {OVERLAY_LICENSE_FIELD!r} "
                        f"(pointing at {OVERLAY_LICENSE_FILE})"
                    )

    return findings


if __name__ == "__main__":
    findings = check()
    for line in findings:
        print(line)
    if findings:
        print(f"license lint: {len(findings)} violation(s)")
        sys.exit(1)
    print("license lint: clean")
